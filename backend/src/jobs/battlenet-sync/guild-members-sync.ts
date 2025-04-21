import { BattleNetGuildRoster, DbCharacter } from '../../../../shared/types/guild.js';
import { BattleNetRegion } from '../../../../shared/types/user.js';
import { withTransaction } from '../../utils/transaction.js';
import logger from '../../utils/logger.js';
import { GuildMemberModel } from '../../models/guild_member.model.js';
import { CharacterModel } from '../../models/character.model.js';
import { compareGuildMembers, GuildMemberComparisonRow } from './guild-members-compare.js';

export async function syncGuildMembersTable(
  guildMemberModel: GuildMemberModel,
  characterModel: CharacterModel,
  guildId: number,
  bnetRoster: BattleNetGuildRoster,
  region: BattleNetRegion
): Promise<void> {
  const rosterSize = bnetRoster.members.length;
  const logContext = { guildId, rosterSize };
  logger.info(logContext, `[SyncService] Starting guild_members table sync. Roster size: ${rosterSize}`);

  try {
    await withTransaction(async (client) => {
      logger.debug(logContext, '[SyncService] Beginning transaction for guild member sync.');

      const existingMembersResult = await client.query(
        `SELECT
          gm.id,
          gm.character_id,
          gm.character_name,
          gm.is_available,
          gm.rank,
          c.realm
        FROM
          guild_members gm
        LEFT JOIN
          characters c ON gm.character_id = c.id
        WHERE
          gm.guild_id = $1`,
        [guildId]
      );

      const existingMembersMap = new Map<string, { id: number; character_id: number | null; rank: number; is_available: boolean | null }>();
      existingMembersResult.rows.forEach((row: GuildMemberComparisonRow) => {
        if (row.character_name && row.realm) {
          const key = `${row.character_name.toLowerCase()}-${row.realm.toLowerCase()}`;
          existingMembersMap.set(key, { id: row.id, character_id: row.character_id, rank: row.rank, is_available: row.is_available });
        } else {
          logger.warn({ ...logContext, memberId: row.id, characterId: row.character_id }, `[SyncService] Skipping existing member (ID: ${row.id}) from map due to missing name or realm slug.`);
        }
      });
      logger.info({ ...logContext, count: existingMembersMap.size }, `[SyncService] Mapped ${existingMembersMap.size} existing members from DB.`);

      const rosterMembersMap = new Map<string, any>();
      bnetRoster.members.forEach(member => {
        if (member.character?.name && member.character?.realm?.slug) {
          const key = `${member.character.name.toLowerCase()}-${member.character.realm.slug.toLowerCase()}`;
          rosterMembersMap.set(key, member);
        } else {
          logger.warn({ ...logContext, memberData: member }, `[SyncService] Skipping BNet roster member due to missing name or realm slug.`);
        }
      });
      logger.debug({ ...logContext, count: rosterMembersMap.size }, `[SyncService] Mapped ${rosterMembersMap.size} members from BNet roster.`);

      const characterKeysForLookup = Array.from(rosterMembersMap.values())
        .filter(member => member.character?.name && member.character?.realm?.slug)
        .map(member => ({
          name: member.character.name,
          realm: member.character.realm.slug
        }));

      const existingCharacters = characterKeysForLookup.length > 0
        ? await characterModel.findByMultipleNameRealm(characterKeysForLookup)
        : [];

      const existingCharacterMap = new Map<string, number>();
      existingCharacters.forEach((char: DbCharacter) => {
        if (char.name && char.realm) {
          const key = `${char.name.toLowerCase()}-${char.realm.toLowerCase()}`;
          existingCharacterMap.set(key, char.id);
        }
      });
      logger.info({ ...logContext, count: existingCharacterMap.size }, `[SyncService] Mapped ${existingCharacterMap.size} existing characters matching BNet roster.`);

      const {
        membersToAdd,
        membersToUpdate,
        memberIdsToDeactivate,
        charactersToCreate
      } = compareGuildMembers(rosterMembersMap, existingMembersMap, existingCharacterMap, region, guildId);

      logger.info({
        ...logContext,
        addMembers: membersToAdd.length,
        createChars: charactersToCreate.length,
        updateMembers: membersToUpdate.length,
        deactivateMembers: memberIdsToDeactivate.length,
      }, `[SyncService] Member comparison results: Add=${membersToAdd.length}, Create+Add=${charactersToCreate.length}, Update=${membersToUpdate.length}, Deactivate=${memberIdsToDeactivate.length}`);

      const createdCharacterMap = new Map<string, number>();
      if (charactersToCreate.length > 0) {
        logger.debug({ ...logContext, count: charactersToCreate.length }, '[SyncService] Creating new character records.');
        const creationPromises = charactersToCreate.map(async (charData) => {
          try {
            const newChar = await characterModel.create(charData);
            const key = `${newChar.name.toLowerCase()}-${newChar.realm.toLowerCase()}`;
            createdCharacterMap.set(key, newChar.id);
            logger.info({ ...logContext, charName: newChar.name, realm: newChar.realm, charId: newChar.id }, `[SyncService] Created character \${newChar.name}-\${newChar.realm} (ID: \${newChar.id})`);
          } catch (createError: unknown) {
            logger.error({ err: createError, ...logContext, charName: charData.name, realm: charData.realm }, `[SyncService] Failed to create character record for \${charData.name}-\${charData.realm}.`);
          }
        });
        await Promise.all(creationPromises);
        logger.info({ ...logContext, count: createdCharacterMap.size }, `[SyncService] Finished creating \${createdCharacterMap.size} new characters.`);
      }

      const newMembersData = [];

      for (const { rosterMember, characterId } of membersToAdd) {
        newMembersData.push({
          guild_id: guildId,
          character_id: characterId,
          rank: rosterMember.rank,
          character_name: rosterMember.character.name,
          character_class: rosterMember.character.playable_class?.name || 'Unknown',
          member_data_json: rosterMember,
          is_available: true,
          is_main: false,
        });
      }

      for (const charData of charactersToCreate) {
        if (!charData.name || !charData.realm) {
          logger.warn({ ...logContext, charData }, `[SyncService] Skipping member creation for character data missing name/realm.`);
          continue;
        }
        const key = `${charData.name.toLowerCase()}-${charData.realm.toLowerCase()}`;
        const newCharacterId = createdCharacterMap.get(key);
        const rosterMember = rosterMembersMap.get(key);

        if (!newCharacterId) {
          logger.error({ ...logContext, key }, `[SyncService] Could not find newly created character ID for key '${key}' during member creation. Skipping.`);
          continue;
        }
        if (!rosterMember) {
          logger.error({ ...logContext, key }, `[SyncService] Could not find BNet roster member data for key '${key}' during member creation. Skipping.`);
          continue;
        }

        newMembersData.push({
          guild_id: guildId,
          character_id: newCharacterId,
          rank: rosterMember.rank,
          character_name: rosterMember.character.name,
          character_class: rosterMember.character.playable_class?.name || 'Unknown',
          member_data_json: rosterMember,
          is_available: true,
          is_main: false,
        });
      }

      if (newMembersData.length > 0) {
        logger.debug({ ...logContext, count: newMembersData.length }, '[SyncService] Bulk inserting new guild members.');
        try {
          await guildMemberModel.bulkCreate(newMembersData);
          logger.info({ ...logContext, count: newMembersData.length }, `[SyncService] Bulk inserted ${newMembersData.length} new members.`);
        } catch (bulkCreateError: unknown) {
          logger.error({ err: bulkCreateError, ...logContext }, `[SyncService] Error during bulk insert of new members.`);
          throw bulkCreateError;
        }
      }

      if (membersToUpdate.length > 0) {
        logger.debug({ ...logContext, count: membersToUpdate.length }, '[SyncService] Bulk updating existing guild members.');
        const updatesWithAvailability = membersToUpdate.map(update => ({
          memberId: update.memberId,
          rank: update.rank,
          character_id: update.characterId,
          member_data_json: update.bnetMemberData,
          is_available: true,
        }));
        try {
          await guildMemberModel.bulkUpdate(updatesWithAvailability);
          logger.info({ ...logContext, count: membersToUpdate.length }, `[SyncService] Bulk updated ${membersToUpdate.length} existing members.`);
        } catch (bulkUpdateError: unknown) {
          logger.error({ err: bulkUpdateError, ...logContext }, `[SyncService] Error during bulk update of existing members.`);
          throw bulkUpdateError;
        }
      }

      if (memberIdsToDeactivate.length > 0) {
        logger.debug({ ...logContext, count: memberIdsToDeactivate.length }, '[SyncService] Marking members no longer in BNet roster as unavailable.');
        const updatesToDeactivate = memberIdsToDeactivate.map((memberId: number) => ({
          memberId: memberId,
          is_available: false,
          left_at: new Date(), // Add the left_at timestamp
        }));
        try {
          await guildMemberModel.bulkUpdate(updatesToDeactivate);
          logger.info({ ...logContext, count: memberIdsToDeactivate.length }, `[SyncService] Marked ${memberIdsToDeactivate.length} members as unavailable.`);
        } catch (bulkUnavailableError: unknown) {
          logger.error({ err: bulkUnavailableError, ...logContext }, `[SyncService] Error during bulk marking members as unavailable.`);
          throw bulkUnavailableError;
        }
      }

      logger.info(logContext, `[SyncService] Successfully finished guild_members table sync. Committing transaction.`);
    });
  } catch (error: unknown) {
    logger.error({ err: error, ...logContext }, `[SyncService] Transaction failed during guild members table sync. Changes rolled back.`);
    throw new Error(`Error syncing guild members table for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}