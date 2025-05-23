// backend/src/types/battlenet-api-adapter.ts
/**
 * Adapter functions for transforming reference API types to application types
 * 
 * These functions provide the bridge between the exact API response structures
 * and the application's expected data structures. This keeps the reference types
 * isolated from the application code, allowing for easier updates when the API changes.
 */

import * as RefTypes from './battlenet-api-reference.js';
import { EnhancedCharacterData } from './enhanced-character.js';
import { BattleNetGuild, BattleNetGuildRoster, BattleNetGuildMember, BattleNetCharacter } from '../../../shared/types/guild.js';
import logger from '../utils/logger.js';

/**
 * Extracts English text from a localized string
 * Prioritizes en_US, then en_GB, then the first available
 */
export function extractEnglishString(localized?: RefTypes.LocalizedString | null | string): string {
  // Handle string directly
  if (typeof localized === 'string') return localized;

  // Handle null or undefined
  if (!localized) return '';

  // Handle localized string object
  if (typeof localized === 'object') {
    return localized.en_US || localized.en_GB || '';
  }

  // If none of the above, return empty string
  return '';
}

/**
 * Adapts a reference Guild type to the application Guild type
 */
export function adaptReferenceGuild(guild: RefTypes.BattleNetGuildRef): BattleNetGuild {
  return {
    _links: guild._links,
    id: guild.id,
    name: guild.name,
    faction: {
      type: guild.faction.type,
      name: extractEnglishString(guild.faction.name)
    },
    realm: {
      id: guild.realm.id,
      name: extractEnglishString(guild.realm.name),
      slug: guild.realm.slug,
      key: guild.realm.key
    },
    crest: guild.crest,
    roster: guild.roster,
    achievements: guild.achievements,
    activity: guild.activity,
    achievement_points: guild.achievement_points,
    member_count: guild.member_count,
    created_timestamp: guild.created_timestamp
  };
}

/**
 * Adapts a reference Guild Member type to the application Guild Member type
 */
export function adaptReferenceGuildMember(member: RefTypes.BattleNetGuildRosterRef['members'][0]): BattleNetGuildMember {
  return {
    character: {
      id: member.character.id,
      name: member.character.name,
      level: member.character.level,
      playable_class: {
        key: member.character.playable_class.key,
        id: member.character.playable_class.id,
        name: extractEnglishString(member.character.playable_class.name)
      },
      playable_race: {
        key: member.character.playable_race.key,
        id: member.character.playable_race.id,
        name: extractEnglishString(member.character.playable_race.name)
      },
      realm: {
        key: member.character.realm.key,
        id: member.character.realm.id,
        slug: member.character.realm.slug,
        name: extractEnglishString({ en_US: member.character.realm.slug } as RefTypes.LocalizedString)
      },
      faction: member.character.faction ? {
        type: member.character.faction.type,
        name: extractEnglishString(member.character.faction.name)
      } : { type: "ALLIANCE", name: "Alliance" }
    },
    rank: member.rank
  };
}

/**
 * Adapts a reference Guild Roster type to the application Guild Roster type
 */
export function adaptReferenceGuildRoster(roster: RefTypes.BattleNetGuildRosterRef): BattleNetGuildRoster {
  return {
    _links: roster._links,
    guild: {
      key: roster.guild.key,
      id: roster.guild.id,
      name: roster.guild.name,
      realm: {
        id: roster.guild.realm.id,
        slug: roster.guild.realm.slug,
        name: extractEnglishString(roster.guild.realm.name),
        key: roster.guild.realm.key
      },
      faction: {
        type: roster.guild.faction.type,
        name: extractEnglishString(roster.guild.faction.name)
      }
    },
    members: roster.members.map(adaptReferenceGuildMember)
  };
}

/**
 * Adapts a reference Character type to the application Character type
 */
export function adaptReferenceCharacter(character: RefTypes.BattleNetCharacterRef): BattleNetCharacter {
  const result: BattleNetCharacter = {
    _links: character._links,
    id: character.id,
    name: character.name,
    gender: {
      type: character.gender.type,
      name: extractEnglishString(character.gender.name)
    },
    faction: {
      type: character.faction.type,
      name: extractEnglishString(character.faction.name)
    },
    race: {
      key: character.race.key,
      name: extractEnglishString(character.race.name),
      id: character.race.id
    },
    character_class: {
      key: character.character_class.key,
      name: extractEnglishString(character.character_class.name),
      id: character.character_class.id
    },
    active_spec: {
      key: character.active_spec.key,
      name: extractEnglishString(character.active_spec.name),
      id: character.active_spec.id
    },
    realm: {
      key: character.realm.key,
      name: extractEnglishString(character.realm.name),
      id: character.realm.id,
      slug: character.realm.slug
    },
    level: character.level,
    experience: character.experience,
    achievement_points: character.achievement_points,
    achievements: character.achievements,
    titles: character.titles,
    pvp_summary: character.pvp_summary,
    encounters: character.encounters,
    media: character.media,
    last_login_timestamp: character.last_login_timestamp,
    average_item_level: character.average_item_level,
    equipped_item_level: character.equipped_item_level,
    specializations: character.specializations,
    statistics: character.statistics,
    mythic_keystone_profile: character.mythic_keystone_profile
  };
  
  // Add optional guild if present
  if (character.guild) {
    result.guild = {
      key: character.guild.key,
      name: character.guild.name,
      id: character.guild.id,
      realm: {
        key: character.guild.realm.key,
        name: extractEnglishString(character.guild.realm.name),
        id: character.guild.realm.id,
        slug: character.guild.realm.slug
      },
      faction: {
        type: character.guild.faction.type,
        name: extractEnglishString(character.guild.faction.name)
      }
    };
  }
  
  return result;
}

/**
 * Adapts reference API types to the EnhancedCharacterData type
 */
export function adaptReferenceEnhancedCharacter(
  character: RefTypes.BattleNetCharacterRef,
  equipment: RefTypes.BattleNetCharacterEquipmentRef,
  mythicKeystone: RefTypes.BattleNetMythicKeystoneProfileRef | null,
  professions: RefTypes.BattleNetProfessionsRef
): EnhancedCharacterData {
  try {
    const enhancedData: EnhancedCharacterData = {
      // Required properties from BattleNetCharacter
      _links: character._links,
      id: character.id,
      name: character.name,
      gender: {
        type: character.gender.type,
        name: typeof character.gender.name === 'string'
          ? character.gender.name
          : extractEnglishString(character.gender.name)
      },
      faction: {
        type: character.faction.type,
        name: typeof character.faction.name === 'string'
          ? character.faction.name
          : extractEnglishString(character.faction.name)
      },
      race: {
        key: character.race.key,
        name: typeof character.race.name === 'string'
          ? character.race.name
          : extractEnglishString(character.race.name),
        id: character.race.id
      },
      character_class: {
        key: character.character_class.key,
        name: typeof character.character_class.name === 'string'
          ? character.character_class.name
          : extractEnglishString(character.character_class.name),
        id: character.character_class.id
      },
      active_spec: {
        key: character.active_spec.key,
        name: typeof character.active_spec.name === 'string'
          ? character.active_spec.name
          : extractEnglishString(character.active_spec.name),
        id: character.active_spec.id
      },
      realm: {
        key: character.realm.key,
        name: typeof character.realm.name === 'string'
          ? character.realm.name
          : extractEnglishString(character.realm.name),
        id: character.realm.id,
        slug: character.realm.slug
      },
      level: character.level,
      last_login_timestamp: character.last_login_timestamp,
      
      // Guild data if available
      guild: character.guild ? {
        key: character.guild.key,
        name: character.guild.name,
        id: character.guild.id,
        realm: {
          key: character.guild.realm.key,
          name: typeof character.guild.realm.name === 'string'
            ? character.guild.realm.name
            : extractEnglishString(character.guild.realm.name),
          id: character.guild.realm.id,
          slug: character.guild.realm.slug
        },
        faction: {
          type: character.guild.faction.type,
          name: typeof character.guild.faction.name === 'string'
            ? character.guild.faction.name
            : extractEnglishString(character.guild.faction.name)
        }
      } : undefined,
      
      // Process equipment data
      equipment: {
        _links: equipment._links,
        character: {
          id: equipment.character.id,
          name: equipment.character.name,
          realm: {
            id: equipment.character.realm.id,
            slug: equipment.character.realm.slug,
            name: extractEnglishString(equipment.character.realm.name)
          }
        },
        equipped_items: equipment.equipped_items.map(item => ({
          slot: {
            type: item.slot.type,
            name: extractEnglishString(item.slot.name)
          },
          item: {
            id: item.item.id,
            name: extractEnglishString(item.name)
          },
          quality: {
            type: item.quality.type,
            name: extractEnglishString(item.quality.name)
          },
          level: {
            value: item.level?.value || 0
          }
        }))
      },
      
      // Item level from character data
      itemLevel: character.equipped_item_level,
      
      // Process mythic keystone profile
      mythicKeystone: mythicKeystone ? {
        _links: mythicKeystone._links,
        character: {
          id: mythicKeystone.character.id,
          name: mythicKeystone.character.name,
          realm: {
            id: mythicKeystone.character.realm.id,
            slug: mythicKeystone.character.realm.slug,
            name: typeof mythicKeystone.character.realm.name === 'string'
              ? mythicKeystone.character.realm.name
              : extractEnglishString(mythicKeystone.character.realm.name)
          }
        },
        current_period: {
          period: {
            id: mythicKeystone.current_period?.period.id || 0
          },
          best_runs: Array.isArray(mythicKeystone.current_period?.best_runs) 
            ? mythicKeystone.current_period.best_runs.map(run => ({
                completed_timestamp: run.completed_timestamp,
                duration: run.duration,
                keystone_level: run.keystone_level,
                members: Array.isArray(run.members) ? run.members.map(member => ({
                  character: {
                    name: member.character.name,
                    id: member.character.id,
                    realm: {
                      id: member.character.realm.id,
                      slug: member.character.realm.slug,
                      name: ""
                    }
                  },
                  specialization: {
                    id: member.specialization.id,
                    name: extractEnglishString(member.specialization.name)
                  },
                  race: {
                    id: member.race.id,
                    name: typeof member.race.name === 'string' 
                      ? member.race.name 
                      : extractEnglishString(member.race.name)
                  },
                  equipped_item_level: member.equipped_item_level
                })) : [],
                dungeon: {
                  id: run.dungeon.id,
                  name: typeof run.dungeon.name === 'string' 
                    ? run.dungeon.name 
                    : extractEnglishString(run.dungeon.name)
                },
                is_completed_within_time: run.is_completed_within_time
              }))
            : []
        }
      } : null,
      
      // Process professions data
      professions: {
        _links: professions._links,
        character: {
          id: professions.character.id,
          name: professions.character.name,
          realm: {
            id: professions.character.realm.id,
            slug: professions.character.realm.slug,
            name: typeof professions.character.realm.name === 'string'
              ? professions.character.realm.name
              : extractEnglishString(professions.character.realm.name)
          }
        },
        primaries: Array.isArray(professions.primaries) ? professions.primaries.map(primary => ({
          profession: {
            id: primary.profession.id,
            name: primary.profession.name,
            slug: primary.profession.name.toLowerCase().replace(/\s+/g, '-')
          },
          tiers: Array.isArray(primary.tiers)
            ? primary.tiers.map(tier => ({
              tier: {
                id: tier.tier.id,
                name: tier.tier.name
              },
              skill_points: tier.skill_points,
              max_skill_points: tier.max_skill_points,
              known_recipes: Array.isArray(tier.known_recipes)
                ? tier.known_recipes.map(recipe => ({
                  id: recipe.id,
                  name: recipe.name
                }))
                : undefined
            }))
            : []
        })) : [],
        secondaries: Array.isArray(professions.secondaries) ? professions.secondaries.map(secondary => ({
          profession: {
            id: secondary.profession.id,
            name: secondary.profession.name,
            slug: secondary.profession.name.toLowerCase().replace(/\s+/g, '-')
          },
          tiers: [{
            tier: {
              id: 0,
              name: "Base"
            },
            skill_points: secondary.skill_points,
            max_skill_points: secondary.max_skill_points
          }]
        })) : []
      },
      
      // Additional properties needed by consumers
      experience: character.experience,
      achievement_points: character.achievement_points,
      equipped_item_level: character.equipped_item_level,
      average_item_level: character.average_item_level,
      
      // Required fields with default values
      achievements: {
        total_points: character.achievement_points,
        achievements: []
      },
      titles: {
        active_title: character.active_title ? {
          key: character.active_title.key,
          name: extractEnglishString(character.active_title.name),
          id: character.active_title.id,
          display_string: extractEnglishString(character.active_title.display_string)
        } : null,
        titles: []
      },
      pvp_summary: {
        honor_level: 0,
        pvp_map_statistics: []
      },
      encounters: {
        dungeons: [],
        raids: []
      },
      media: {
        avatar_url: "",
        inset_url: "",
        main_url: ""
      },
      last_login_timestamp_ms: character.last_login_timestamp,
      specializations: [{
        talent_loadouts: [],
        glyphs: [],
        pvp_talent_slots: []
      }]
    };
    
    return enhancedData;
  } catch (error) {
    logger.error({ 
      characterId: character.id, 
      characterName: character.name,
      realmId: character.realm.id,
      realmSlug: character.realm.slug,
      error
    }, 'Failed to adapt reference enhanced character data');
    
    throw error;
  }
}