import {
  DbCharacter,
  DbGuild,
} from "../../../../shared/types/guild.js";
import { BattleNetRegion } from "../../../../shared/types/user.js";
import { BattleNetApiClientEnhanced } from "../../services/battlenet-api-client-enhanced.js";
import { GuildModel } from "../../models/guild.model.js";
import logger from "../../utils/logger.js";
import { calculateCharacterToyHash } from "./character-toy-hash.js";
import { EnhancedCharacterData, toSharedEnhancedCharacterData } from "../../types/enhanced-character.js";


export async function prepareCharacterUpdatePayload(
  apiClient: BattleNetApiClientEnhanced,
  guildModel: GuildModel,
  character: DbCharacter,
  enhancedData: EnhancedCharacterData,
): Promise<
  { updatePayload: Partial<DbCharacter>; localGuild: DbGuild | null }
> {
  const logContext = {
    charId: character.id,
    charName: character.name,
    realm: character.realm,
    region: character.region,
  };
  logger.debug(
    logContext,
    `[SyncService][PayloadPrep] Preparing update payload.`,
  );

  const bnetCharacterId = enhancedData.id;
  const bnetGuildData = enhancedData.guild;
  const bnetGuildId = bnetGuildData?.id;
  let localGuild: DbGuild | null = null;
  let determinedRegion = character.region as BattleNetRegion | null;

  if (bnetGuildId && bnetGuildData) {
    const guildLogContext = {
      ...logContext,
      bnetGuildId,
      bnetGuildName: bnetGuildData.name,
    };
    logger.debug(
      guildLogContext,
      `[SyncService][PayloadPrep] Character is in BNet guild ${bnetGuildData.name}. Checking local DB.`,
    );
    try {
      localGuild = await guildModel.findOne({ bnet_guild_id: bnetGuildId });
      if (localGuild) {
        determinedRegion = localGuild.region as BattleNetRegion;
        logger.debug(
          { ...guildLogContext, localGuildId: localGuild.id, determinedRegion },
          `[SyncService][PayloadPrep] Found local guild record. Using region ${determinedRegion}.`,
        );
      } else {
        logger.warn(
          guildLogContext,
          `[SyncService][PayloadPrep] Local guild record not found for BNet Guild ID ${bnetGuildId}. Queueing guild sync.`,
        );
        const fullRealmName = enhancedData.realm?.name || character.realm;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await queueMissingGuildSync(guildModel, {
          id: bnetGuildId,
          name: bnetGuildData.name,
          realm: { slug: enhancedData.realm.slug, name: fullRealmName },
        }, character.region as BattleNetRegion);
        determinedRegion = character.region as BattleNetRegion | null;
        logger.debug(
          guildLogContext,
          `[SyncService][PayloadPrep] Kept original region ${determinedRegion} for character update after queueing missing guild.`,
        );
      }
    } catch (guildError: unknown) {
      logger.error(
        { err: guildError, ...guildLogContext },
        `[SyncService][PayloadPrep] Error fetching local guild. Keeping original character region.`,
      );
      determinedRegion = character.region as BattleNetRegion | null;
      localGuild = null;
    }
  } else {
    localGuild = null;
    determinedRegion = character.region as BattleNetRegion | null;
    logger.debug(
      logContext,
      `[SyncService][PayloadPrep] Character is guildless according to BNet.`,
    );
  }

  const finalRegionForHash = determinedRegion ??
    character.region as BattleNetRegion;
  const calculatedToyHash = await calculateCharacterToyHash(apiClient, {
    ...character,
    region: finalRegionForHash,
  });

  // Convert our EnhancedCharacterData to the shared format before storing
  const sharedEnhancedData = toSharedEnhancedCharacterData(enhancedData);

  const updatePayload: Partial<DbCharacter> = {
    bnet_character_id: bnetCharacterId,
    region: determinedRegion ?? character.region as BattleNetRegion,
    level: enhancedData.level,
    class: enhancedData.character_class?.name || character.class,
    name: enhancedData.name,
    realm: enhancedData.realm.slug,
    profile_json: sharedEnhancedData,
    // We need to adapt these to the shared format in a future refactoring
    // For now, use type assertion to bypass the type errors
    equipment_json: enhancedData.equipment as any,
    mythic_profile_json: enhancedData.mythicKeystone as any,
    professions_json: enhancedData.professions?.primaries as any,
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    is_available: true,
  };

  if (calculatedToyHash !== null) {
    updatePayload.toy_hash = calculatedToyHash;
    logger.debug(
      { ...logContext, toyHash: calculatedToyHash },
      `[SyncService][PayloadPrep] Added toy hash to update payload.`,
    );
  } else {
    logger.trace(
      logContext,
      `[SyncService][PayloadPrep] No toy hash calculated or needed.`,
    );
  }

  logger.debug(
    logContext,
    `[SyncService][PayloadPrep] Finished preparing update payload.`,
  );
  return { updatePayload, localGuild };
}

async function queueMissingGuildSync(
  guildModel: GuildModel,
  guildData:
    | { id: number; name: string; realm: { slug: string; name: string } }
    | undefined,
  region: BattleNetRegion,
): Promise<void> {
  const logPrefix = "[SyncService][QueueGuild]";
  if (!guildData?.id || !guildData.name || !guildData.realm?.name || !region) {
    logger.error(
      { guildData, region },
      `${logPrefix} Cannot queue missing guild sync: insufficient data provided.`,
    );
    return;
  }

  const { id: bnetGuildId, name: guildName, realm } = guildData;
  const realmName = realm.name;
  const logContext = { bnetGuildId, guildName, realmName, region };
  logger.info(
    logContext,
    `${logPrefix} Checking if guild needs to be created and queued.`,
  );

  try {
    const existingByBNetId = await guildModel.findOne({
      bnet_guild_id: bnetGuildId,
    });
    if (existingByBNetId) {
      logger.info(
        logContext,
        `${logPrefix} Guild already exists locally (found by BNet ID). Skipping queue.`,
      );
      return;
    }

    const existingByName = await guildModel.findOne({
      name: guildName,
      realm: realmName,
      region: region,
    });
    if (existingByName) {
      logger.info(
        { ...logContext, localGuildId: existingByName.id },
        `${logPrefix} Guild already exists locally (found by name/realm/region). Updating BNet ID if missing.`,
      );
      if (!existingByName.bnet_guild_id) {
        try {
          await guildModel.update(existingByName.id, {
            bnet_guild_id: bnetGuildId,
          });
          logger.info(
            { ...logContext, localGuildId: existingByName.id },
            `${logPrefix} Added BNet ID ${bnetGuildId} to existing guild.`,
          );
        } catch (updateError) {
          logger.error({
            err: updateError,
            ...logContext,
            localGuildId: existingByName.id,
          }, `${logPrefix} Failed to update BNet ID for existing guild.`);
        }
      }
      return;
    }

    logger.info(
      logContext,
      `${logPrefix} Creating new local record for missing guild.`,
    );
    const newGuildPayload: Partial<DbGuild> = {
      name: guildName,
      realm: realmName,
      region: region,
      bnet_guild_id: bnetGuildId,
      last_updated: null,
      last_roster_sync: null,
      exclude_from_sync: false,
    };
    const createdGuild = await guildModel.create(newGuildPayload);
    logger.info(
      { ...logContext, localGuildId: createdGuild.id },
      `${logPrefix} Created local guild record ${createdGuild.id}.`,
    );

    logger.warn(
      { ...logContext, localGuildId: createdGuild.id },
      `${logPrefix} Triggering IMMEDIATE sync for newly added guild (replace with proper queue).`,
    );
    // Intentionally NOT awaiting this in the main flow to avoid blocking character sync.
    // A queue is the correct solution for background processing.
    // This direct call is NOT suitable for production environments.
    logger.warn(
      { ...logContext, localGuildId: createdGuild.id },
      `${logPrefix} TODO: Implement job queue. Guild sync required for newly created guild ${createdGuild.id} but direct call removed. Add to queue.`,
    );
  } catch (error: unknown) {
    logger.error(
      { err: error, ...logContext },
      `${logPrefix} Error checking/creating/queueing sync for missing guild.`,
    );
  }
}
