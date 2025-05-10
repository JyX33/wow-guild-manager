// Modular Battle.net sync entry point

import { syncGuild } from "./core-guild-sync.js";
import { syncGuildMembersTable } from "./guild-members-sync.js";
import { syncGuildRanks } from "./guild-ranks-sync.js";
import { GuildModel } from "../../models/guild.model.js";
import { UserModel } from "../../models/user.model.js";
import { GuildMemberModel } from "../../models/guild_member.model.js";
import { RankModel } from "../../models/rank.model.js";
import logger from "../../utils/logger.js";
import { BattleNetApiClient } from "../../services/battlenet-api.client.js";
import { CharacterModel } from "../../models/character.model.js";
import { syncCharacter } from "./character-sync.js";

import pLimit from "p-limit";
import { DateTime } from "luxon"; // Import DateTime for time comparisons

import {
  BattleNetGuildMember,
  DbCharacter,
  DbGuild,
} from "../../../../shared/types/guild.js"; // Import guild types
import { BattleNetRegion } from "../../../../shared/types/user.js";

export interface SyncDependencies {
  apiClient: BattleNetApiClient;
  guildModel: GuildModel;
  userModel: UserModel;
  guildMemberModel: GuildMemberModel;
  rankModel: RankModel;
  characterModel: CharacterModel;
}

/**
 * Orchestrates the sync process for a single guild:
 * 1. Calls syncGuild to fetch and update core guild info.
 * 2. If successful, syncs members and ranks.
 * 3. Handles and logs errors at each stage.
 */
export async function orchestrateGuildSync(
  dependencies: SyncDependencies,
  guild: DbGuild,
): Promise<void> {
  // Step 1: Sync core guild info
  const result = await syncGuild(
    dependencies.apiClient,
    dependencies.guildModel,
    dependencies.userModel,
    guild,
  );
  if (!result.success) {
    logger.error(
      { guildId: guild.id, error: result.error },
      "[BattleNetSync] Guild core sync failed",
    );
    return;
  }

  const { bnetGuildRoster } = result;

  try {
    // Step 2: Sync members
    await syncGuildMembersTable(
      dependencies.guildMemberModel,
      dependencies.characterModel,
      guild.id,
      bnetGuildRoster,
      guild.region as BattleNetRegion,
    );
    // Step 3: Sync ranks
    await syncGuildRanks(
      dependencies.rankModel,
      guild.id,
      bnetGuildRoster,
    );

    // Start Step 4: Sync individual characters
    logger.info(
      { guildId: guild.id },
      "[BattleNetSync] Starting individual character sync for guild",
    );

    // TODO: Syncing all characters sequentially within the main guild sync can be slow and API-intensive.
    // This should ideally be moved to a background job queue in the future.
    try {
      const eightHoursAgo = DateTime.now().minus({ hours: 8 });
      const charactersToSync: DbCharacter[] = [];

      // Iterate through the Battle.net roster members
      for (const member of bnetGuildRoster.members) {
        // Find or create the corresponding DbCharacter
        const dbCharacter = await findOrCreateCharacterForRosterMember(
          dependencies,
          member,
        );

        // Check if the character needs syncing based on last_synced_at
        if (!dbCharacter.last_synced_at) {
          logger.debug(
            { charId: dbCharacter.id, charName: dbCharacter.name },
            "[BattleNetSync] Character never synced, adding to sync list.",
          );
          charactersToSync.push(dbCharacter);
        } else {
          const lastSynced = DateTime.fromJSDate(
            new Date(dbCharacter.last_synced_at),
          ); // Ensure it's a Date object first
          if (lastSynced < eightHoursAgo) {
            logger.debug({
              charId: dbCharacter.id,
              charName: dbCharacter.name,
              lastSynced: dbCharacter.last_synced_at,
            }, "[BattleNetSync] Character outdated, adding to sync list.");
            charactersToSync.push(dbCharacter);
          } else {
            logger.debug({
              charId: dbCharacter.id,
              charName: dbCharacter.name,
              lastSynced: dbCharacter.last_synced_at,
            }, "[BattleNetSync] Character recently synced, skipping.");
          }
        }
      }

      logger.info(
        {
          guildId: guild.id,
          count: charactersToSync.length,
          totalRoster: bnetGuildRoster.members.length,
        },
        "[BattleNetSync] Filtered characters for individual sync",
      );

      const characterSyncLimit = pLimit(10); // Limit to 10 concurrent character syncs per guild

      const characterSyncPromises = charactersToSync.map((character) =>
        characterSyncLimit(() =>
          // Wrap the async function call
          syncCharacter(
            dependencies.apiClient,
            dependencies.characterModel,
            dependencies.guildMemberModel,
            dependencies.guildModel,
            character, // Pass the DbCharacter object
          )
        ).catch((charErr) => {
          logger.error(
            {
              characterId: character.id,
              characterName: character.name,
              error: charErr,
            },
            "[BattleNetSync] Error syncing individual character",
          );
          return { status: "rejected", reason: charErr, character };
        })
      );

      const results = await Promise.allSettled(characterSyncPromises);

      // Process results - syncCharacter already handles its internal logic (updates, logging)
      // We primarily log here for overall status and any unhandled errors from the catch above
      results.forEach((result) => {
        if (result.status === "rejected") {
          // Error was already logged in the catch block above
          // If we returned the character in the catch, we could log character details here too
        } else {
          // Fulfilled promises mean syncCharacter completed (either successfully or marked unavailable)
          // syncCharacter logs success/unavailable status internally
        }
      });

      logger.info(
        { guildId: guild.id },
        "[BattleNetSync] Completed individual character sync for guild",
      );
    } catch (charSyncErr) {
      logger.error(
        { guildId: guild.id, error: charSyncErr },
        "[BattleNetSync] Error during individual character sync orchestration",
      );
    }

    logger.info(
      { guildId: guild.id },
      "[BattleNetSync] Orchestrated guild sync completed successfully",
    );
  } catch (err) {
    logger.error(
      { guildId: guild.id, error: err },
      "[BattleNetSync] Error during member or rank sync",
    );
  }
}

// Helper function to parse region from URL (duplicated from character.model.ts for now)
const parseRegionFromHref = (
  href: string | undefined,
): BattleNetRegion | null => {
  if (!href) return null;
  try {
    const url = new URL(href);
    const hostnameParts = url.hostname.split("."); // e.g., ['us', 'api', 'blizzard', 'com']
    const regionCode = hostnameParts[0];
    if (["us", "eu", "kr", "tw", "cn"].includes(regionCode)) {
      return regionCode as BattleNetRegion;
    }
  } catch (e) {
    // Invalid URL
    logger.error(`[parseRegionFromHref] Error parsing URL: ${href}`, e);
  }
  return null;
};

/**
 * Finds an existing character by name and realm, or creates a new minimal record if not found.
 * @param dependencies - Sync dependencies
 * @param member - Battle.net guild member data
 * @returns The existing or newly created DbCharacter
 */
async function findOrCreateCharacterForRosterMember(
  dependencies: SyncDependencies,
  member: BattleNetGuildMember,
): Promise<DbCharacter> {
  const { characterModel } = dependencies;
  const { name, realm } = member.character;
  const realmSlug = realm.slug;

  // Try to find the character by name and realm slug
  const dbCharacter = await characterModel.findByNameRealm(name, realmSlug);

  if (dbCharacter) {
    logger.debug(
      { charName: name, realm: realmSlug },
      "[BattleNetSync] Found existing character in DB.",
    );
    return dbCharacter;
  }

  // Character not found, create a new minimal record
  logger.info(
    { charName: name, realm: realmSlug },
    "[BattleNetSync] Character not found in DB, creating minimal record.",
  );

  // Determine region from the member data
  let region: BattleNetRegion = "eu"; // Default
  // Correctly access the href from realm.key
  const hrefToCheck = member.character.realm.key?.href;
  const parsedRegion = parseRegionFromHref(hrefToCheck);
  if (parsedRegion) {
    region = parsedRegion;
  }

  const newCharacterData: Partial<DbCharacter> = {
    // user_id will be null initially, can be linked later
    name: name,
    realm: realmSlug,
    region: region, // Add region
    class: member.character.playable_class?.name || "Unknown", // Minimal data
    level: member.character.level || 1, // Minimal data
    // role: determined later during full sync
    // profile_json: fetched during full sync
    is_available: true, // Assume available until proven otherwise by full sync
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_synced_at: null, // Explicitly set to null on creation
  };

  // Use createCharacter which handles insertion and returns the DbCharacter
  const createdCharacter = await characterModel.createCharacter(
    newCharacterData,
  );

  // Add a check in case createCharacter unexpectedly returns null/undefined
  if (!createdCharacter) {
    throw new Error(
      `Failed to create minimal character record for ${name}-${realmSlug}`,
    );
  }

  logger.info(
    { charId: createdCharacter.id, charName: name, realm: realmSlug },
    "[BattleNetSync] Created new minimal character record.",
  );
  return createdCharacter;
}

/**
 * Orchestrates a full Battle.net sync for all guilds.
 * Loads all guilds from the database and calls orchestrateGuildSync for each.
 */
export async function runSync(dependencies: SyncDependencies): Promise<void> {
  const { guildModel } = dependencies;

  try {
    const guilds: DbGuild[] = await guildModel.findOutdatedGuilds();
    logger.info(
      { count: guilds.length },
      "[BattleNetSync] Starting orchestrated sync for outdated guilds",
    );

    const limit = pLimit(5); // Limit to 5 concurrent guild syncs

    const syncPromises = guilds.map((guild) =>
      limit(async () => { // Wrap the async operation in the limiter
        logger.info(
          { guildId: guild.id },
          "[BattleNetSync] Starting orchestrated sync for guild (concurrent)",
        );
        try {
          await orchestrateGuildSync(
            dependencies,
            guild,
          );
          // Step 5: Update guild last_synced_at after successful sync
          await dependencies.guildModel.update(guild.id, {
            last_roster_sync: new Date().toISOString(),
          });
          logger.info(
            { guildId: guild.id },
            "[BattleNetSync] Updated guild last_synced_at timestamp.",
          );
        } catch (guildErr) {
          // orchestrateGuildSync already logs internal errors, so this catch might only
          // catch very unexpected errors during the setup of the call itself.
          // Keep logging here for safety, but note potential redundancy.
          logger.error(
            { err: guildErr, guildId: guild.id },
            "[BattleNetSync] Orchestrated guild sync failed unexpectedly",
          );
          // Even on unexpected error, update the timestamp to avoid immediate re-sync loop
          try {
            await dependencies.guildModel.update(guild.id, {
              last_roster_sync: new Date().toISOString(),
            });
            logger.warn(
              { guildId: guild.id },
              "[BattleNetSync] Updated guild last_synced_at timestamp after unexpected error.",
            );
          } catch (updateErr) {
            logger.error(
              { err: updateErr, guildId: guild.id },
              "[BattleNetSync] Failed to update guild last_synced_at after unexpected error.",
            );
          }
        }
      })
    );

    const results = await Promise.allSettled(syncPromises);

    // Optional: Log summary of results (e.g., how many succeeded/failed)
    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      logger.warn(
        { failedCount, total: guilds.length },
        `[BattleNetSync] Completed sync run with ${failedCount} guild syncs failing.`,
      );
    } else {
      logger.info(
        { total: guilds.length },
        `[BattleNetSync] Completed sync run successfully for all ${guilds.length} active guilds.`,
      );
    }
  } catch (err) {
    logger.error(
      { err },
      "[BattleNetSync] Failed to run full orchestrated sync",
    );
    throw err;
  }
}
