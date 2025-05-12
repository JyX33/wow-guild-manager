import { DbCharacter, DbGuildMember } from "../../../../shared/types/guild.js";
import { BattleNetRegion } from "../../../../shared/types/user.js";
import { CharacterModel } from "../../models/character.model.js";
import { GuildMemberModel } from "../../models/guild_member.model.js";
import { BattleNetApiClientEnhanced } from "../../services/battlenet-api-client-enhanced.js";
import logger from "../../utils/logger.js";
import { createSlug } from "../../utils/slugify.js";
import { prepareCharacterUpdatePayload } from "./character-payload.js";

export async function syncCharacter(
  apiClient: BattleNetApiClientEnhanced,
  characterModel: CharacterModel,
  guildMemberModel: GuildMemberModel,
  guildModel: any,
  character: DbCharacter,
): Promise<void> {
  const jobId =
    `char-sync-${character.region}-${character.realm}-${character.name}`;
  const logContext = {
    charId: character.id,
    charName: character.name,
    realm: character.realm,
    region: character.region,
    jobId,
  };
  logger.info(
    logContext,
    `[SyncService] Starting sync for character: ${character.name} (${character.realm}-${character.region})`,
  );

  if (!character.is_available) {
    logger.info(
      logContext,
      `[SyncService] Skipping sync for unavailable character ${character.name}.`,
    );
    return;
  }

  try {
    const realmSlug = createSlug(character.realm);
    const characterNameLower = character.name.toLowerCase();
    const region = character.region as BattleNetRegion;

    const enhancedDataResult = await apiClient.getEnhancedCharacterData(
      realmSlug,
      characterNameLower,
      region,
    );

    if (enhancedDataResult === null) {
      logger.warn(
        logContext,
        `[SyncService] Character ${character.name} not found on Battle.net (404 or null result). Marking character as unavailable.`,
      );
      try {
        await characterModel.update(character.id, {
          is_available: false,
          last_synced_at: new Date().toISOString(),
        });
        logger.info(
          logContext,
          `[SyncService] Marked character ${character.name} (ID: ${character.id}) as unavailable due to 404/null result.`,
        );

        try {
          const membersToMark = await guildMemberModel.findAll({
            character_id: character.id,
          });
          const memberIdsToMark = membersToMark.map((m) => m.id);
          if (memberIdsToMark.length > 0) {
            const updates = memberIdsToMark.map((id) => ({
              memberId: id,
              is_available: false,
            }));
            await guildMemberModel.bulkUpdate(updates);
            logger.info(
              logContext,
              `[SyncService] Marked ${memberIdsToMark.length} guild memberships for character ${character.name} (ID: ${character.id}) as unavailable.`,
            );
          } else {
            logger.info(
              logContext,
              `[SyncService] No active guild memberships found for character ${character.name} (ID: ${character.id}) to mark as unavailable.`,
            );
          }
        } catch (memberUpdateError: unknown) {
          logger.error(
            { err: memberUpdateError, ...logContext },
            `[SyncService] Character ${character.name} marked unavailable, but FAILED to mark associated guild memberships. Data may be inconsistent.`,
          );
        }
      } catch (updateError: unknown) {
        logger.error(
          { err: updateError, ...logContext },
          `[SyncService] Failed to mark character ${character.name} or memberships as unavailable after 404/null result.`,
        );
      }
      return;
    }

    // The conversion to shared format is now handled in prepareCharacterUpdatePayload
    const { updatePayload, localGuild } = await prepareCharacterUpdatePayload(
      apiClient,
      guildModel,
      character,
      enhancedDataResult,
    );

    const finalUpdatePayload = {
      ...updatePayload,
      is_available: true,
      last_synced_at: new Date().toISOString(),
    };
    await characterModel.update(character.id, finalUpdatePayload);
    logger.info(
      logContext,
      `[SyncService] Successfully synced character ${character.name} (ID: ${character.id}).`,
    );

    if (localGuild) {
      const localGuildId = localGuild.id;
      const currentMembership = await guildMemberModel.findOne({
        character_id: character.id,
        guild_id: localGuildId,
      });

      if (currentMembership) {
        const memberUpdatePayload: Partial<DbGuildMember> & {
          is_available: boolean;
        } = {
          character_name: finalUpdatePayload.name || character.name,
          character_class: finalUpdatePayload.class || character.class,
          is_available: true,
        };
        await guildMemberModel.update(
          currentMembership.id,
          memberUpdatePayload,
        );
        logger.debug(
          {
            ...logContext,
            memberId: currentMembership.id,
            guildId: localGuildId,
          },
          `[SyncService] Updated associated guild member record ${currentMembership.id}.`,
        );
      } else {
        logger.warn(
          { ...logContext, guildId: localGuildId },
          `[SyncService] Could not find guild member record to update for character ${character.name} in guild ${localGuildId}. Guild sync might be pending or character left.`,
        );
      }
    } else {
      logger.debug(
        logContext,
        `[SyncService] Character ${character.name} is guildless according to BNet, skipping member record update.`,
      );
    }
  } catch (error: unknown) {
    logger.error(
      { err: error, ...logContext },
      `[SyncService] Unexpected error syncing character ${character.name} (ID: ${character.id}):`,
    );
    try {
      await characterModel.update(character.id, {
        last_synced_at: new Date().toISOString(),
      });
    } catch (updateError: unknown) {
      logger.error(
        { err: updateError, ...logContext },
        `[SyncService] Failed to update last_synced_at after error for character ${character.name}.`,
      );
    }
  }
}
