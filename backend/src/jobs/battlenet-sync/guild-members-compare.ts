import {
  BattleNetGuildMember,
  DbCharacter,
} from "../../../../shared/types/guild.js";

export type GuildMemberComparisonRow = {
  id: number;
  character_id: number | null;
  character_name: string | null;
  realm: string | null;
  rank: number;
  is_available: boolean | null;
};

export function compareGuildMembers(
  rosterMembersMap: Map<string, BattleNetGuildMember>,
  existingMembersMap: Map<
    string,
    { id: number; character_id: number | null; rank: number }
  >,
  existingCharacterMap: Map<string, number>,
  region: string,
  // guildId: number, // Not used in this function
): {
  membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[];
  membersToUpdate: {
    memberId: number;
    rank?: number;
    characterId?: number;
    bnetMemberData?: BattleNetGuildMember;
  }[];
  memberIdsToDeactivate: number[];
  charactersToCreate: Partial<DbCharacter>[];
} {
  const membersToAdd: {
    rosterMember: BattleNetGuildMember;
    characterId: number;
  }[] = [];
  const membersToUpdate: {
    memberId: number;
    rank?: number;
    characterId?: number;
    bnetMemberData?: BattleNetGuildMember;
  }[] = [];
  const memberIdsToDeactivate: number[] = [];
  const charactersToCreate: Partial<DbCharacter>[] = [];
  const processedExistingMemberKeys = new Set(existingMembersMap.keys());

  for (const [key, rosterMember] of rosterMembersMap.entries()) {
    const existingMember = existingMembersMap.get(key);
    const existingCharacterId = existingCharacterMap.get(key);

    if (existingMember) {
      processedExistingMemberKeys.delete(key);
      const memberUpdatePayload: {
        rank?: number;
        characterId?: number;
        bnetMemberData?: BattleNetGuildMember;
      } = {};
      let needsUpdate = false;

      if (existingMember.rank !== rosterMember.rank) {
        memberUpdatePayload.rank = rosterMember.rank;
        needsUpdate = true;
      }

      if (!existingMember.character_id && existingCharacterId) {
        memberUpdatePayload.characterId = existingCharacterId;
        needsUpdate = true;
      }
      if (needsUpdate) {
        memberUpdatePayload.bnetMemberData = rosterMember; // Include latest BNet data in the update
        membersToUpdate.push({
          memberId: existingMember.id,
          ...memberUpdatePayload,
        });
      }
    } else {
      if (existingCharacterId) {
        membersToAdd.push({ rosterMember, characterId: existingCharacterId });
      } else {
        charactersToCreate.push({
          name: rosterMember.character.name,
          realm: rosterMember.character.realm.slug,
          class: rosterMember.character.playable_class?.name || "Unknown",
          level: rosterMember.character.level,
          role: "DPS",
          region: region,
        });
      }
    }
  }

  for (const key of processedExistingMemberKeys) {
    const memberToDeactivate = existingMembersMap.get(key);
    if (memberToDeactivate) {
      memberIdsToDeactivate.push(memberToDeactivate.id);
    }
  }

  return {
    membersToAdd,
    membersToUpdate,
    memberIdsToDeactivate: memberIdsToDeactivate,
    charactersToCreate,
  };
}
