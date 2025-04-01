/**
 * Common Types
 */
export type CharacterRole = 'Tank' | 'Healer' | 'DPS' | 'Support';

/**
 * Battle.net API Types
 * These types correspond exactly to the responses from Battle.net API
 */
export interface LocalizedString {
    en_US: string;
    es_MX: string;
    pt_BR: string;
    de_DE: string;
    en_GB: string;
    es_ES: string;
    fr_FR: string;
    it_IT: string;
    ru_RU: string;
    ko_KR: string;
    zh_TW: string;
    zh_CN: string;
}

export interface KeyReference {
    href: string;
}

export interface TypeName {
    type: string;
    name: string;
}

export interface GuildCrestColor {
    id: number;
    rgba: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}

export interface GuildCrestMedia {
    key: KeyReference;
    id: number;
}

export interface GuildCrest {
    emblem: {
        id: number;
        media: GuildCrestMedia;
        color: GuildCrestColor;
    };
    border: {
        id: number;
        media: GuildCrestMedia;
        color: GuildCrestColor;
    };
    background: {
        color: GuildCrestColor;
    };
}

export interface RealmReference {
    key: KeyReference;
    name: string;
    id: number;
    slug: string;
}

export interface PlayableClass {
    key: KeyReference;
    name: string;
    id: number;
}

export interface PlayableRace {
    key: KeyReference;
    name: string;
    id: number;
}

export interface BattleNetGuildMemberCharacter {
    name: string;
    id: number;
    realm: RealmReference;
    level: number;
    playable_class: PlayableClass;
    playable_race: PlayableRace;
    faction: TypeName;
}

export interface BattleNetGuildMember {
    character: BattleNetGuildMemberCharacter;
    rank: number;
}

export interface BattleNetGuildRoster {
    _links: {
        self: {
            href: string;
        };
    };
    guild: {
        key: {
            href: string;
        };
        name: string;
        id: number;
        realm: RealmReference;
        faction: {
            type: string;
            name: string;
        };
    };
    members: BattleNetGuildMember[];
}

export interface BattleNetGuild {
    _links: {
        self: {
            href: string;
        };
    };
    id: number;
    name: string;
    faction: TypeName;
    achievement_points: number;
    member_count: number;
    realm: RealmReference;
    crest: GuildCrest;
    created_timestamp: number;
    roster: {
        href: string;
    };
    achievements: {
        href: string;
    };
    activity: {
        href: string;
    };
}

export interface BattleNetCharacter {
    _links: {
        self: {
            href: string;
        };
    };
    id: number;
    name: string;
    gender: TypeName;
    faction: TypeName;
    race: PlayableRace;
    character_class: PlayableClass;
    active_spec: PlayableClass;
    realm: RealmReference;
    guild?: {
        key: KeyReference;
        name: string;
        id: number;
        realm: RealmReference;
        faction: TypeName;
    };
    level: number;
    experience: number;
    achievement_points: number;
    achievements: {
        href: string;
    };
    titles: {
        href: string
    }
    pvp_summary: {
        href: string;
    };
    encounters: {
        href: string;
    };
    media: {
        href: string;
    };
    last_login_timestamp: number;
    average_item_level: number;
    equipped_item_level: number;
    specializations: {
        href: string;
    };
    statistics: {
        href: string;
    };
    mythic_keystone_profile: {
        href: string;
    };
}

export interface BattleNetCharacterEquipment {
    _links: {
        self: {
            href: string;
        };
    };
    character: {
        key: KeyReference;
        name: string;
        id: number;
        realm: RealmReference;
    };
    equipped_items: BattleNetItem[];
}

export interface BattleNetMythicKeystoneProfile {
    _links: {
        self: {
            href: string;
        }
    };
    current_period: {
        period: {
            key: KeyReference;
            id: number;
        };
        best_runs: BattleNetMythicKeystoneRun[];
    };
    seasons?: Array<{
        key: KeyReference;
        id: number;
    }>;
    current_mythic_rating?: {
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        }
        rating: number;
    };
}

export interface BattleNetProfessions {
    _links: {
        self: {
            href: string;
        }
    };
    character: {
        key: KeyReference;
        name: string;
        id: number;
        realm: RealmReference;
    };
    primaries: Array<{
        profession: {
            key: KeyReference;
            name: string;
            id: number;
        };
        skill_points: number;
        max_skill_points: number;
        specializations: Array<{
            specialization_id: number;
            name: string;
            points_spent: number;
        }>;
        tiers: Array<{
            tier_id: number;
            known_recipes: Array<{
                key: KeyReference;
                name: string;
                id: number;
            }>;
        }>;
    }>;
    secondaries?: Array<{
        profession: {
            key: KeyReference;
            name: string;
            id: number;
        };
        skill_points: number;
        max_skill_points: number;
    }>;
}

export interface BattleNetItem {
    item: {
        key: KeyReference;
        id: number;
        name?: string;
    };
    sockets?: BattleNetSocket[];
    slot: {
        type: string;
        name: string;
    };
    quantity: number;
    context: number;
    bonus_list: number[];
    quality?: TypeName;
    name?: string;
    modified_appearance_id: number;
    media: {
        key: KeyReference;
        id: number;
    };
    item_class: {
        key: KeyReference;
        name: string;
        id: number;
    };
    item_subclass: {
        key: KeyReference;
        name: string;
        id: number;
    };
    inventory_type: {
        type: string;
        name: string;
    };
    binding: {
        type: string;
        name: string;
    };
    armor?: {
        value: number;
        display: {
            display_string: string;
            color: {
                r: number;
                g: number;
                b: number;
                a: number;
            };
        };
    };
    stats?: BattleNetStat[];
    sell_price?: {
        value: number;
        display_strings: {
            header: string;
            gold: string;
            silver: string;
            copper: string;
        };
    };
    requirements?: {
        level?: {
            value: number;
            display_string: string;
        };
        playable_classes?: {
            links: PlayableClass[];
            display_string: string;
        }
    };
    set?: {
        item_set: {
            key: KeyReference;
            name: string;
            id: number;
        };
        items: BattleNetSetItem[];
        effects?: BattleNetEffect[];
        display_string: string;
    };
    level?: {
        value: number;
        display_string: string;
    };
    transmog?: {
        item: {
            key: KeyReference;
            name: string;
            id: number;
        };
        display_string: string;
        item_modified_appearance_id: number;
        second_item?: {
            key: KeyReference;
            name: string;
            id: number;
        }
        second_item_modified_appearance_id?: number;
    };
    durability?: {
        value: number;
        display_string: string;
    };
    name_description?: {
        display_string: string;
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        }
    }
    is_subclass_hidden?: boolean;
}

export interface BattleNetSocket {
    socket_type: {
        type: string;
        name: string;
    };
    item?: {
        key: KeyReference;
        name: string;
        id: number;
    };
    display_string?: string;
    media?: {
        key: KeyReference;
        id: number;
    };
    display_color?: {
        r: number;
        g: number;
        b: number;
        a: number;
    }
}

export interface BattleNetStat {
    type: {
        type: string;
        name: string;
    };
    value: number;
    is_equip_bonus?: boolean;
    is_negated?: boolean;
    display?: {
        display_string: string;
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        };
    };
}

export interface BattleNetSetItem {
    item: {
        key: KeyReference;
        name: string;
        id: number;
    }
    is_equipped?: boolean;
}

export interface BattleNetEffect {
    display_string: string;
    required_count: number;
    is_active?: boolean;
}

export interface BattleNetMythicKeystoneRun {
    completed_timestamp: string;
    duration: number;
    keystone_level: number;
    dungeon: {
        key: KeyReference;
        name: string;
        id: number;
    };
    members: Array<{
        character: {
            name: string;
            id: number;
            realm: RealmReference;
        };
        specialization: {
            key: KeyReference;
            name: string;
            id: number;
        };
        race: PlayableRace;
        equipped_item_level: number;
    }>;
    is_completed_within_time?: boolean;
    mythic_rating?: {
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        }
        rating: number;
    }
    map_rating?: {
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        }
        rating: number;
    }
}

/**
 * Database Model Types
 * These types correspond to how data is stored in the database
 */

export interface DbGuild {
    id: number;
    name: string;
    realm: string;
    region: string;
    leader_id?: number | null; // Allow null for leader_id
    last_updated?: string | null; // Allow null
    last_roster_sync?: string | null; // Allow null - Added by migration 20240325161500
    bnet_guild_id?: number; // Added by new migration
    member_count?: number; // Added for direct access
    guild_data_json?: BattleNetGuild; // Renamed and potentially nullable
    roster_json?: BattleNetGuildRoster; // Added by new migration
}

export interface DbGuildMember {
    id: number;
    guild_id: number;
    character_id: number;
    rank: number;
    is_main?: boolean | null; // ADDED - Is this the designated main for the user in this guild?
    character_name?: string; // Added by migration
    character_class?: string; // Added by migration
    member_data_json?: BattleNetGuildMember; // Added by migration
    created_at?: string;
    updated_at?: string;
}

export interface DbCharacter {
    id: number;
    user_id?: number | null; // Changed to nullable
    name: string;
    realm: string;
    class: string;
    level: number;
    role?: CharacterRole; // Changed to optional
    // is_main: boolean; // REMOVED - Moved to DbGuildMember
    created_at?: string;
    updated_at?: string;
    // guild_id?: number | null; // REMOVED - Relationship via DbGuildMember
    // guild_rank?: number; // REMOVED - Stored in DbGuildMember
    bnet_character_id?: number; // Added by migration
    region?: string; // Added by migration
    toy_hash?: string | null; // ADDED - For unknown user grouping
    last_synced_at?: string; // Added by migration
    profile_json?: BattleNetCharacter; // Added by migration
    equipment_json?: BattleNetCharacterEquipment; // Added by migration
    mythic_profile_json?: BattleNetMythicKeystoneProfile; // Added by migration
    // Store only the primaries array for simplicity
    professions_json?: BattleNetProfessions['primaries']; // Changed type
}

export interface DbGuildRank {
    id?: number;
    guild_id: number;
    rank_id: number;
    rank_name: string;
    is_custom: boolean;
    member_count: number;
    created_at?: string;
    updated_at?: string;
}

// Combined type for data fetched by getEnhancedCharacterData
export interface EnhancedCharacterData extends BattleNetCharacter {
  equipment?: BattleNetCharacterEquipment;
  mythicKeystone?: BattleNetMythicKeystoneProfile | null; // Allow null if profile doesn't exist
  professions?: BattleNetProfessions; // Include full professions data
}


/**
 * Application Types
 * These types are used in the application logic and frontend
 */

export interface Guild {
    id: number;
    name: string;
    realm: string;
    region: string;
    last_updated?: string | null; // Allow null
    guild_data_json?: BattleNetGuild; // Renamed property
    leader_id?: number | null; // Allow null
    is_guild_master?: boolean;
 }

export interface GuildMember {
    id?: number; // Made optional as it's not always available (e.g., from roster_json)
    guild_id: number; // Changed to guildId for consistency? Check usage. Assuming guildId based on context.
    character_id?: number; // ADDED - Link back to character table
    character_name: string;
    character_class: string;
    character_role?: CharacterRole; // Changed to optional
    rank: number;
    isMain?: boolean | null; // ADDED - Is this the designated main for the user in this guild?
    user_id?: number;
    battletag?: string;
}

export interface Character {
    id: number;
    name: string;
    realm: string;
    class: string;
    level: number;
    role: CharacterRole;
    is_main: boolean;
    user_id: number;
    guild_id?: number | null; // Allow null
    guild_rank?: number;
    character_data?: BattleNetCharacter; // Keep for now if needed elsewhere, or remove if fully replaced by JSONB fields
    equipment?: BattleNetCharacterEquipment;
    // Add fields from BattleNetCharacter that might be useful at the application level
    achievement_points?: number;
    equipped_item_level?: number;
    average_item_level?: number;
    last_login_timestamp?: number;
}

export interface Item {
    item: {
        key: KeyReference;
        id: number;
        name?: string;
    };
    sockets?: BattleNetSocket[];
    slot: {
        type: string;
        name: string;
    };
    quantity: number;
    context: number;
    bonus_list: number[];
    quality?: TypeName;
    name?: string;
    modified_appearance_id: number;
    media: {
        key: KeyReference;
        id: number;
    };
    item_class: {
        key: KeyReference;
        name: string;
        id: number;
    };
    item_subclass: {
        key: KeyReference;
        name: string;
        id: number;
    };
    inventory_type: {
        type: string;
        name: string;
    };
    binding: {
        type: string;
        name: string;
    };
    armor?: {
        value: number;
        display: {
            display_string: string;
            color: {
                r: number;
                g: number;
                b: number;
                a: number;
            };
        };
    };
    stats?: BattleNetStat[];
    sell_price?: {
        value: number;
        display_strings: {
            header: string;
            gold: string;
            silver: string;
            copper: string;
        };
    };
    requirements?: {
        level?: {
            value: number;
            display_string: string;
        };
        playable_classes?: {
            links: PlayableClass[];
            display_string: string;
        }
    };
    set?: {
        item_set: {
            key: KeyReference;
            name: string;
            id: number;
        };
        items: BattleNetSetItem[];
        effects?: BattleNetEffect[];
        display_string: string;
    };
    level?: {
        value: number;
        display_string: string;
    };
    transmog?: {
        item: {
            key: KeyReference;
            name: string;
            id: number;
        };
        display_string: string;
        item_modified_appearance_id: number;
        second_item?: {
            key: KeyReference;
            name: string;
            id: number;
        }
        second_item_modified_appearance_id?: number;
    };
    durability?: {
        value: number;
        display_string: string;
    };
    name_description?: {
        display_string: string;
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        }
    }
    is_subclass_hidden?: boolean;
}

export interface EnhancedGuildMember extends GuildMember {
    character: Character & {
        itemLevel: number;
        mythicKeystone: BattleNetMythicKeystoneProfile | null; // Make nullable
        activeSpec: PlayableClass | null; // Make nullable
        professions: Array<{
            profession: {
                key: KeyReference;
                name: string;
                id: number;
            };
            skill_points: number;
            max_skill_points: number;
            specializations: Array<{
                specialization_id: number;
                name: string;
                points_spent: number;
            }>;
            tiers: Array<{
                tier_id: number;
                known_recipes: Array<{
                    key: KeyReference;
                    name: string;
                    id: number;
                }>;
            }>;
        }>;
    };
}

export interface GuildRank {
    id?: number;
    guild_id?: number;
    rank_id: number;
    rank_name: string;
    is_custom?: boolean;
    member_count?: number;
    created_at?: string;
    updated_at?: string;
}


/**
 * Represents a guild member with classification details for frontend use.
 */
export interface ClassifiedMember {
  // Fields from DbGuildMember needed by frontend
  id: number;
  guild_id: number;
  character_id: number;
  rank: number;
  is_main?: boolean | null; // Explicit main flag
  character_name?: string;
  character_class?: string;
  member_data_json?: BattleNetGuildMember; // Maybe useful for some display? Optional.

  // Fields from DbCharacter needed by frontend
  character: {
    id: number;
    user_id?: number | null;
    name: string;
    realm: string;
    class: string;
    level: number;
    role?: CharacterRole;
    region?: string;
    // Include relevant profile/equipment details if needed for display
    profile_json?: BattleNetCharacter; // Optional, might be large
    equipment_json?: BattleNetCharacterEquipment; // Optional
    mythic_profile_json?: BattleNetMythicKeystoneProfile | null; // Added
    professions_json?: BattleNetProfessions['primaries']; // Added
  };

  // Classification details
  classification: 'Main' | 'Alt';
  groupKey: string | number | null; // user_id or toy_hash or null
  mainCharacterId: number | null; // Link to main character if this is an alt
}
