import { DbCharacter, DbGuildMember } from "../../../shared/types/guild.js";
import * as characterModel from "../models/character.model.js";
import * as guildMemberModel from "../models/guild_member.model.js";
import db from "../db/db.js"; // For potential direct DB query
import { AppError } from "../utils/error-handler.js";
import logger from "../utils/logger.js";

/**
 * Represents a guild member joined with their character data and classification details.
 */
export interface ClassifiedMember extends DbGuildMember {
  character: DbCharacter; // Include the full character details
  classification: "Main" | "Alt";
  groupKey: string | number | null; // user_id for known, toy_hash for unknown-hashable, null for unknown-unhashable
  mainCharacterId: number | null; // ID of the 'Main' character in the same group, null if this member is 'Main'
}

export class CharacterClassificationService {
  private characterModel: typeof characterModel;
  private guildMemberModel: typeof guildMemberModel;

  constructor(
    characterModelInj: typeof characterModel,
    guildMemberModelInj: typeof guildMemberModel,
  ) {
    this.characterModel = characterModelInj;
    this.guildMemberModel = guildMemberModelInj;
  }

  /**
   * Fetches guild members, classifies them as Main/Alt based on user status and rules,
   * and returns the classified list.
   * @param guildId The ID of the guild to classify members for.
   * @returns A promise resolving to an array of ClassifiedMember objects.
   */
  async getClassifiedGuildMembers(
    guildId: number,
  ): Promise<ClassifiedMember[]> {
    logger.info(
      { guildId },
      `[ClassificationService] Starting classification for guild ID: ${guildId}`,
    );
    try {
      // 1. Fetch Data (GuildMembers joined with Characters)
      const query = `
        SELECT
          gm.*,
          json_build_object(
            'id', c.id,
            'user_id', c.user_id,
            'name', c.name,
            'realm', c.realm,
            'class', c.class,
            'level', c.level,
            'role', c.role,
            'created_at', c.created_at,
            'updated_at', c.updated_at,
            'bnet_character_id', c.bnet_character_id,
            'region', c.region,
            'toy_hash', c.toy_hash,
            'last_synced_at', c.last_synced_at,
            'profile_json', c.profile_json,
            'equipment_json', c.equipment_json,
            'mythic_profile_json', c.mythic_profile_json,
            'professions_json', c.professions_json
          ) as character
        FROM guild_members gm
        JOIN characters c ON gm.character_id = c.id
        WHERE gm.guild_id = $1;
      `;
      const result = await db.query(query, [guildId]);
      const members: (DbGuildMember & { character: DbCharacter })[] =
        result.rows;

      if (members.length === 0) {
        logger.info(
          { guildId },
          `[ClassificationService] No members found for guild ID: ${guildId}`,
        );
        return [];
      }

      // 2. Separate Known/Unknown
      const knownMembersMap = new Map<
        number,
        (DbGuildMember & { character: DbCharacter })[]
      >();
      const unknownMembers: (DbGuildMember & { character: DbCharacter })[] = [];

      for (const member of members) {
        if (member.character.user_id) {
          const userGroup = knownMembersMap.get(member.character.user_id) || [];
          userGroup.push(member);
          knownMembersMap.set(member.character.user_id, userGroup);
        } else {
          unknownMembers.push(member);
        }
      }

      const classifiedResults: ClassifiedMember[] = [];

      // 3. Process Known Users
      for (const userGroup of knownMembersMap.values()) {
        classifiedResults.push(...this._classifyKnownUserGroup(userGroup));
      }

      // 4. Process Unknown Users
      const hashableUnknownsMap = new Map<
        string,
        (DbGuildMember & { character: DbCharacter })[]
      >();
      const unhashableUnknowns: (DbGuildMember & { character: DbCharacter })[] =
        [];

      for (const member of unknownMembers) {
        if (member.character.toy_hash) {
          const hashGroup =
            hashableUnknownsMap.get(member.character.toy_hash) || [];
          hashGroup.push(member);
          hashableUnknownsMap.set(member.character.toy_hash, hashGroup);
        } else {
          unhashableUnknowns.push(member);
        }
      }

      for (const hashGroup of hashableUnknownsMap.values()) {
        classifiedResults.push(
          ...this._classifyUnknownHashableGroup(hashGroup),
        );
      }

      for (const member of unhashableUnknowns) {
        classifiedResults.push(this._classifyUnhashableMember(member));
      }

      // 5. Combine & Return (already done by pushing to classifiedResults)
      logger.info(
        { guildId, count: classifiedResults.length },
        `[ClassificationService] Finished classification for guild ID: ${guildId}. Classified ${classifiedResults.length} members.`,
      );
      return classifiedResults;

      // Placeholder return
      return [];
    } catch (error) {
      logger.error(
        { err: error, guildId },
        `[ClassificationService] Error classifying members for guild ${guildId}`,
      );
      throw new AppError(
        `Error classifying guild members: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  // --- Helper methods for classification logic ---

  private _classifyKnownUserGroup(
    members: (DbGuildMember & { character: DbCharacter })[],
  ): ClassifiedMember[] {
    if (!members || members.length === 0) {
      return [];
    }

    const userId = members[0].character.user_id; // All members in the group share the same user_id
    if (!userId) {
      logger.warn(
        `[ClassificationService] _classifyKnownUserGroup called with members lacking user_id.`,
      );
      return []; // Should not happen if called correctly
    }

    const classifiedMembers: ClassifiedMember[] = [];
    let explicitMainFound = false;

    // First pass: Check for an explicitly set main character
    let mainCharId: number | null = null;
    for (const member of members) {
      if (member.is_main === true) {
        mainCharId = member.character_id; // Found the explicit main
        classifiedMembers.push({
          ...member,
          classification: "Main",
          groupKey: userId,
          mainCharacterId: null,
        });
        explicitMainFound = true;
        break; // Found the main, no need to check further in this loop
      }
    }

    // If an explicit main was found, classify others as Alt
    if (explicitMainFound) {
      for (const member of members) {
        if (member.is_main !== true) { // Include null/false
          // If mainCharId is null here, something went wrong, but proceed defensively
          classifiedMembers.push({
            ...member,
            classification: "Alt",
            groupKey: userId,
            mainCharacterId: mainCharId,
          });
        }
      }
      return classifiedMembers;
    }

    // If no explicit main, apply fallback logic
    members.sort(this._sortByFallbackLogic); // Sort using the fallback helper

    // Determine the main character's ID after sorting
    const fallbackMainCharId = members.length > 0
      ? members[0].character_id
      : null;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const isMain = i === 0;
      classifiedMembers.push({
        ...member,
        classification: isMain ? "Main" : "Alt",
        groupKey: userId,
        mainCharacterId: isMain ? null : fallbackMainCharId, // Link alts to the fallback main
      });
    }

    return classifiedMembers;
  }

  private _classifyUnknownHashableGroup(
    members: (DbGuildMember & { character: DbCharacter })[],
  ): ClassifiedMember[] {
    if (!members || members.length === 0) {
      return [];
    }
    // All members in this group should have the same, non-null toy_hash
    const groupKey = members[0].character.toy_hash;
    if (!groupKey) {
      logger.warn(
        `[ClassificationService] _classifyUnknownHashableGroup called with members lacking toy_hash.`,
      );
      // Fallback: treat them as unhashable individually? Or return empty? Returning empty for now.
      return [];
    }

    members.sort(this._sortByFallbackLogic); // Always use fallback for unknown groups

    const classifiedMembers: ClassifiedMember[] = [];
    // Determine the main character's ID after sorting
    const mainCharId = members.length > 0 ? members[0].character_id : null;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const isMain = i === 0;
      classifiedMembers.push({
        ...member,
        classification: isMain ? "Main" : "Alt",
        groupKey: groupKey, // Use the toy_hash as the group key
        mainCharacterId: isMain ? null : mainCharId, // Link alts to the main
      });
    }
    return classifiedMembers;
  }

  private _classifyUnhashableMember(
    member: DbGuildMember & { character: DbCharacter },
  ): ClassifiedMember {
    // Characters with no user_id and no toy_hash are treated individually as 'Main'.
    return {
      ...member,
      classification: "Main",
      groupKey: null, // No specific group key for these individuals
      mainCharacterId: null, // They are their own main
    };
  }

  /**
   * Fallback sorting logic for determining Main within a group.
   * Sorts by character name ASC, then rank ASC.
   */
  private _sortByFallbackLogic(
    a: { character: DbCharacter; rank: number },
    b: { character: DbCharacter; rank: number },
  ): number {
    // Ensure ranks are treated as numbers and sort by rank first (lower rank is better)
    const rankA = typeof a.rank === "number" ? a.rank : Infinity;
    const rankB = typeof b.rank === "number" ? b.rank : Infinity;

    const rankCompare = rankA - rankB;
    if (rankCompare !== 0) {
      return rankCompare;
    }

    // If ranks are equal, fall back to sorting by name
    return a.character.name.localeCompare(b.character.name);
  }
}

// Optional: Export an instance if using dependency injection container or similar pattern
// const characterClassificationService = new CharacterClassificationService(characterModel, guildMemberModel);
// export default characterClassificationService;
