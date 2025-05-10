// backend/src/types/battlenet-api-fixtures.ts
/**
 * Test fixtures for Battle.net API responses
 * 
 * These fixtures can be used for testing the validation and adaptation logic
 * without making actual API calls. They match the reference API structures.
 */

import * as RefTypes from './battlenet-api-reference.js';

/**
 * Standard localized string for testing
 */
export const localizedString: RefTypes.LocalizedString = {
  en_US: 'English (US)',
  es_MX: 'Spanish (Mexico)',
  pt_BR: 'Portuguese (Brazil)',
  de_DE: 'German (Germany)',
  en_GB: 'English (Great Britain)',
  es_ES: 'Spanish (Spain)',
  fr_FR: 'French (France)',
  it_IT: 'Italian (Italy)',
  ru_RU: 'Russian (Russia)',
  ko_KR: 'Korean (Korea)',
  zh_TW: 'Chinese (Taiwan)',
  zh_CN: 'Chinese (China)'
};

/**
 * Standard realm reference for testing
 */
export const realmReference: RefTypes.RealmReference = {
  key: { href: 'https://us.api.blizzard.com/data/wow/realm/1' },
  name: { ...localizedString, en_US: 'Test Realm' },
  id: 1,
  slug: 'test-realm'
};

/**
 * Sample Battle.net Guild fixture
 */
export const sampleGuild: RefTypes.BattleNetGuildRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild'
    }
  },
  id: 12345,
  name: 'Test Guild',
  faction: {
    type: 'ALLIANCE',
    name: { ...localizedString, en_US: 'Alliance' }
  },
  achievement_points: 1000,
  member_count: 25,
  realm: realmReference,
  crest: {
    emblem: {
      id: 1,
      media: {
        key: { href: 'https://us.api.blizzard.com/data/wow/media/guild-crest/emblem/1' },
        id: 1
      },
      color: {
        id: 1,
        rgba: { r: 255, g: 0, b: 0, a: 1 }
      }
    },
    border: {
      id: 1,
      media: {
        key: { href: 'https://us.api.blizzard.com/data/wow/media/guild-crest/border/1' },
        id: 1
      },
      color: {
        id: 1,
        rgba: { r: 0, g: 0, b: 255, a: 1 }
      }
    },
    background: {
      color: {
        id: 1,
        rgba: { r: 0, g: 255, b: 0, a: 1 }
      }
    }
  },
  roster: { href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild/roster' },
  achievements: { href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild/achievements' },
  activity: { href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild/activity' },
  created_timestamp: 1577836800000,
  name_search: 'test guild'
};

/**
 * Sample class reference
 */
export const classReference: RefTypes.ClassReference = {
  key: { href: 'https://us.api.blizzard.com/data/wow/playable-class/8' },
  name: { ...localizedString, en_US: 'Mage' },
  id: 8
};

/**
 * Sample race reference
 */
export const raceReference: RefTypes.RaceReference = {
  key: { href: 'https://us.api.blizzard.com/data/wow/playable-race/1' },
  name: { ...localizedString, en_US: 'Human' },
  id: 1
};

/**
 * Sample faction reference
 */
export const factionReference: RefTypes.FactionReference = {
  type: 'ALLIANCE',
  name: { ...localizedString, en_US: 'Alliance' }
};

/**
 * Sample guild member character
 */
export const guildMemberCharacter = {
  key: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character' },
  name: 'TestCharacter',
  id: 12345,
  realm: {
    key: { href: 'https://us.api.blizzard.com/data/wow/realm/1' },
    id: 1,
    slug: 'test-realm'
  },
  level: 60,
  playable_class: classReference,
  playable_race: raceReference,
  faction: factionReference
};

/**
 * Sample Battle.net Guild Roster fixture
 */
export const sampleGuildRoster: RefTypes.BattleNetGuildRosterRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild/roster'
    }
  },
  guild: {
    key: { href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild' },
    name: 'Test Guild',
    id: 12345,
    realm: realmReference,
    faction: factionReference
  },
  members: [
    {
      character: guildMemberCharacter,
      rank: 0
    },
    {
      character: {
        ...guildMemberCharacter,
        name: 'TestCharacter2',
        id: 12346
      },
      rank: 1
    }
  ]
};

/**
 * Sample spec reference
 */
export const specReference: RefTypes.SpecReference = {
  key: { href: 'https://us.api.blizzard.com/data/wow/playable-specialization/62' },
  name: { ...localizedString, en_US: 'Arcane' },
  id: 62
};

/**
 * Sample gender reference
 */
export const genderReference: RefTypes.GenderReference = {
  type: 'MALE',
  name: { ...localizedString, en_US: 'Male' }
};

/**
 * Sample Battle.net Character fixture
 */
export const sampleCharacter: RefTypes.BattleNetCharacterRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character'
    }
  },
  id: 12345,
  name: 'TestCharacter',
  gender: genderReference,
  faction: factionReference,
  race: raceReference,
  character_class: classReference,
  active_spec: specReference,
  realm: realmReference,
  guild: {
    key: { href: 'https://us.api.blizzard.com/data/wow/guild/test-realm/test-guild' },
    name: 'Test Guild',
    id: 12345,
    realm: realmReference,
    faction: factionReference
  },
  level: 60,
  experience: 0,
  achievement_points: 1000,
  achievements: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/achievements' },
  titles: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/titles' },
  pvp_summary: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/pvp-summary' },
  encounters: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/encounters' },
  media: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/character-media' },
  last_login_timestamp: 1609459200000,
  average_item_level: 200,
  equipped_item_level: 195,
  specializations: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/specializations' },
  statistics: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/statistics' },
  mythic_keystone_profile: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/mythic-keystone-profile' },
  equipment: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/equipment' },
  appearance: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/appearance' },
  collections: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections' },
  active_title: {
    key: { href: 'https://us.api.blizzard.com/data/wow/title/1' },
    name: { ...localizedString, en_US: 'Gladiator' },
    id: 1,
    display_string: { ...localizedString, en_US: 'Gladiator %s' }
  },
  reputations: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/reputations' },
  quests: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/quests' },
  achievements_statistics: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/achievements/statistics' },
  professions: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/professions' },
  covenant_progress: {
    chosen_covenant: {
      key: { href: 'https://us.api.blizzard.com/data/wow/covenant/1' },
      name: { ...localizedString, en_US: 'Kyrian' },
      id: 1
    },
    renown_level: 40,
    soulbinds: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/soulbinds' }
  },
  name_search: 'testcharacter'
};

/**
 * Sample Battle.net Character Equipment fixture
 */
export const sampleCharacterEquipment: RefTypes.BattleNetCharacterEquipmentRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/equipment'
    }
  },
  character: {
    key: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character' },
    name: 'TestCharacter',
    id: 12345,
    realm: realmReference
  },
  equipped_items: [
    {
      item: {
        key: { href: 'https://us.api.blizzard.com/data/wow/item/1' },
        id: 1
      },
      slot: {
        type: 'HEAD',
        name: { ...localizedString, en_US: 'Head' }
      },
      quantity: 1,
      context: 1,
      bonus_list: [1, 2, 3],
      quality: {
        type: 'EPIC',
        name: { ...localizedString, en_US: 'Epic' }
      },
      name: { ...localizedString, en_US: 'Helm of Valor' },
      modified_appearance_id: 1,
      media: {
        key: { href: 'https://us.api.blizzard.com/data/wow/media/item/1' },
        id: 1
      },
      item_class: {
        key: { href: 'https://us.api.blizzard.com/data/wow/item-class/4' },
        name: { ...localizedString, en_US: 'Armor' },
        id: 4
      },
      item_subclass: {
        key: { href: 'https://us.api.blizzard.com/data/wow/item-class/4/item-subclass/1' },
        name: { ...localizedString, en_US: 'Cloth' },
        id: 1
      },
      inventory_type: {
        type: 'HEAD',
        name: { ...localizedString, en_US: 'Head' }
      },
      binding: {
        type: 'ON_EQUIP',
        name: { ...localizedString, en_US: 'Binds when equipped' }
      },
      armor: {
        value: 100,
        display: {
          display_string: { ...localizedString, en_US: '100 Armor' },
          color: { r: 255, g: 255, b: 255, a: 1 }
        }
      },
      stats: [
        {
          type: {
            type: 'INTELLECT',
            name: { ...localizedString, en_US: 'Intellect' }
          },
          value: 50,
          display: {
            display_string: { ...localizedString, en_US: '+50 Intellect' },
            color: { r: 255, g: 255, b: 255, a: 1 }
          }
        }
      ],
      level: {
        value: 50,
        display_string: { ...localizedString, en_US: 'Item Level 50' }
      }
    }
  ],
  equipped_item_sets: [
    {
      item_set: {
        key: { href: 'https://us.api.blizzard.com/data/wow/item-set/1' },
        name: { ...localizedString, en_US: 'Valor Set' },
        id: 1
      },
      items: [
        {
          item: {
            key: { href: 'https://us.api.blizzard.com/data/wow/item/1' },
            name: { ...localizedString, en_US: 'Helm of Valor' },
            id: 1
          },
          is_equipped: true
        }
      ],
      effects: [
        {
          display_string: { ...localizedString, en_US: '(2) Set: +100 Intellect' },
          required_count: 2,
          is_active: false
        }
      ],
      display_string: { ...localizedString, en_US: 'Valor Set (1/5)' }
    }
  ]
};

/**
 * Sample Battle.net Mythic Keystone Profile fixture
 */
export const sampleMythicKeystoneProfile: RefTypes.BattleNetMythicKeystoneProfileRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/mythic-keystone-profile'
    }
  },
  current_period: {
    period: {
      key: { href: 'https://us.api.blizzard.com/data/wow/mythic-keystone/period/1' },
      id: 1
    },
    best_runs: [
      {
        completed_timestamp: 1609459200000,
        duration: 1800000,
        keystone_level: 15,
        keystone_affixes: [
          {
            key: { href: 'https://us.api.blizzard.com/data/wow/keystone-affix/1' },
            name: { ...localizedString, en_US: 'Tyrannical' },
            id: 1
          }
        ],
        members: [
          {
            character: {
              name: 'TestCharacter',
              id: 12345,
              realm: {
                key: { href: 'https://us.api.blizzard.com/data/wow/realm/1' },
                id: 1,
                slug: 'test-realm'
              }
            },
            specialization: {
              key: { href: 'https://us.api.blizzard.com/data/wow/playable-specialization/62' },
              name: { ...localizedString, en_US: 'Arcane' },
              id: 62
            },
            race: {
              key: { href: 'https://us.api.blizzard.com/data/wow/playable-race/1' },
              name: { ...localizedString, en_US: 'Human' },
              id: 1
            },
            equipped_item_level: 195
          }
        ],
        dungeon: {
          key: { href: 'https://us.api.blizzard.com/data/wow/mythic-keystone-dungeon/1' },
          name: { ...localizedString, en_US: 'De Other Side' },
          id: 1
        },
        is_completed_within_time: true,
        mythic_rating: {
          color: { r: 255, g: 128, b: 0, a: 1 },
          rating: 1500
        },
        map_rating: {
          color: { r: 255, g: 128, b: 0, a: 1 },
          rating: 1500
        }
      }
    ]
  },
  seasons: [
    {
      key: { href: 'https://us.api.blizzard.com/data/wow/mythic-keystone/season/1' },
      id: 1
    }
  ],
  character: {
    key: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character' },
    name: 'TestCharacter',
    id: 12345,
    realm: realmReference
  },
  current_mythic_rating: {
    color: { r: 255, g: 128, b: 0, a: 1 },
    rating: 1500
  }
};

/**
 * Sample Battle.net Professions fixture
 */
export const sampleProfessions: RefTypes.BattleNetProfessionsRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/professions'
    }
  },
  character: {
    key: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character' },
    name: 'TestCharacter',
    id: 12345,
    realm: realmReference
  },
  primaries: [
    {
      profession: {
        key: { href: 'https://us.api.blizzard.com/data/wow/profession/164' },
        name: 'Blacksmithing',
        id: 164
      },
      tiers: [
        {
          skill_points: 100,
          max_skill_points: 100,
          tier: {
            name: 'Shadowlands Blacksmithing',
            id: 1
          },
          known_recipes: [
            {
              key: { href: 'https://us.api.blizzard.com/data/wow/recipe/1' },
              name: 'Steel Breastplate',
              id: 1
            }
          ]
        }
      ]
    }
  ],
  secondaries: [
    {
      profession: {
        key: { href: 'https://us.api.blizzard.com/data/wow/profession/185' },
        name: 'Cooking',
        id: 185
      },
      skill_points: 100,
      max_skill_points: 100
    }
  ]
};

/**
 * Sample Battle.net Collections Index fixture
 */
export const sampleCollectionsIndex: RefTypes.BattleNetCollectionsIndexRef = {
  _links: {
    self: {
      href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections'
    }
  },
  pets: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections/pets' },
  mounts: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections/mounts' },
  heirlooms: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections/heirlooms' },
  toys: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections/toys' },
  character: {
    key: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character' },
    name: 'TestCharacter',
    id: 12345,
    realm: realmReference
  },
  transmogs: { href: 'https://us.api.blizzard.com/profile/wow/character/test-realm/test-character/collections/transmogs' }
};