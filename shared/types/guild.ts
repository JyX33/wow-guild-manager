// Character roles and classes
export type CharacterRole = 'Tank' | 'Healer' | 'DPS' | 'Support';

// Battle.net API Types
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

export interface BattleNetGuildMember {
    character: {
        name: string;
        id: number;
        realm: RealmReference;
        level: number;
        playable_class: PlayableClass;
        playable_race: PlayableRace;
        faction: TypeName;
    };
    rank: number;
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

export interface Guild {
    id: number;
    name: string;
    realm: string;
    region: string;
    last_updated?: string;
    guild_data: BattleNetGuild;
    is_guild_master?: boolean;
}

export interface GuildMember {
    id: number;
    guild_id: number;
    character_name: string;
    character_class: string;
    character_role: CharacterRole;
    rank: number;
    user_id?: number;
    battletag?: string;
}

export interface Character {
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
    realm: string;
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
    equipment: {
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
        equipped_items: Item[];
    };
}

export interface Item {
    item: {
        key: KeyReference;
        id: number;
        name?: string;
    };
    sockets?: Socket[];
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
    stats?: Stat[];
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
        items: SetItem[];
        effects?: Effect[];
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

interface Socket {
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

interface Stat {
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

interface SetItem {
    item: {
        key: KeyReference;
        name: string;
        id: number;
    }
    is_equipped?: boolean;
}

interface Effect {
    display_string: string;
    required_count: number;
    is_active?: boolean;
}

export interface MythicKeystoneRun {
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

export interface EnhancedGuildMember extends GuildMember {
    character: Character & {
        itemLevel: number;
        mythicKeystone: {
            _links: {
                self: {
                    href: string;
                }
            }
            current_period: {
                period: {
                    key: KeyReference;
                    id: number;
                };
                best_runs: MythicKeystoneRun[];
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
            }
        };
        activeSpec: PlayableClass;
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
    created_at?: string;
    updated_at?: string;
}
