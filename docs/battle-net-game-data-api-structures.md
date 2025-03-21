# Battle.net Game Data API Response Structures

Generated on: 17/03/2025 20:29:11

## Table of Contents

- [Achievements Index](#achievements-index)
- [Achievement](#achievement)
- [Achievement Media](#achievement-media)
- [Commodities](#commodities)
- [Azerite Essences Index](#azerite-essences-index)
- [Azerite Essence](#azerite-essence)
- [Connected Realms Index](#connected-realms-index)
- [Connected Realm](#connected-realm)
- [Covenant Index](#covenant-index)
- [Covenant](#covenant)
- [Soulbind Index](#soulbind-index)
- [Conduit Index](#conduit-index)
- [Creature](#creature)
- [Creature Display Media](#creature-display-media)
- [Creature Families Index](#creature-families-index)
- [Creature Types Index](#creature-types-index)
- [Guild Crest Components Index](#guild-crest-components-index)
- [Guild Crest Border Media](#guild-crest-border-media)
- [Heirloom Index](#heirloom-index)
- [Heirloom](#heirloom)
- [Item](#item)
- [Item Media](#item-media)
- [Item Classes Index](#item-classes-index)
- [Item Sets Index](#item-sets-index)
- [Item Subclass](#item-subclass)
- [Journal Expansions Index](#journal-expansions-index)
- [Journal Encounters Index](#journal-encounters-index)
- [Journal Instances Index](#journal-instances-index)
- [Modified Crafting Index](#modified-crafting-index)
- [Mounts Index](#mounts-index)
- [Mount](#mount)
- [Mythic Keystone Affixes Index](#mythic-keystone-affixes-index)
- [Mythic Keystone Index](#mythic-keystone-index)
- [Mythic Keystone Seasons Index](#mythic-keystone-seasons-index)
- [Pets Index](#pets-index)
- [Pet Abilities Index](#pet-abilities-index)
- [Playable Classes Index](#playable-classes-index)
- [Playable Class](#playable-class)
- [Playable Races Index](#playable-races-index)
- [Playable Specializations Index](#playable-specializations-index)
- [Power Types Index](#power-types-index)
- [Professions Index](#professions-index)
- [Profession](#profession)
- [Recipe](#recipe)
- [PvP Seasons Index](#pvp-seasons-index)
- [PvP Tiers Index](#pvp-tiers-index)
- [Quests Index](#quests-index)
- [Quest](#quest)
- [Quest Categories Index](#quest-categories-index)
- [Realms Index](#realms-index)
- [Realm](#realm)
- [Regions Index](#regions-index)
- [Reputation Factions Index](#reputation-factions-index)
- [Reputation Tiers Index](#reputation-tiers-index)
- [Spell](#spell)
- [Spell Media](#spell-media)
- [Talent Tree Index](#talent-tree-index)
- [Talents Index](#talents-index)
- [PvP Talents Index](#pvp-talents-index)
- [Tech Talent Tree Index](#tech-talent-tree-index)
- [Tech Talent Index](#tech-talent-index)
- [Titles Index](#titles-index)
- [Title](#title)
- [Toy Index](#toy-index)
- [WoW Token Index](#wow-token-index)

## Endpoints

### Achievements Index

**Endpoint:** `/data/wow/achievement/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "achievements": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Achievement

**Endpoint:** `/data/wow/achievement/6`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "category":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "points": "number",
  "is_account_wide": "boolean",
  "criteria":   {
    "id": "number",
    "description":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "amount": "number"
  },
  "next_achievement":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  },
  "display_order": "number"
}
```

---

### Achievement Media

**Endpoint:** `/data/wow/media/achievement/6`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "assets": [
    // Array of object
        {
      "key": "string",
      "value": "string",
      "file_data_id": "number"
    }
  ],
  "id": "number"
}
```

---

### Commodities

**Endpoint:** `/data/wow/auctions/commodities`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "auctions": [
    // Array of object
        {
      "id": "number",
      "item":       {
        "id": "number"
      },
      "quantity": "number",
      "unit_price": "number",
      "time_left": "string"
    }
  ]
}
```

---

### Azerite Essences Index

**Endpoint:** `/data/wow/azerite-essence/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "azerite_essences": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Azerite Essence

**Endpoint:** `/data/wow/azerite-essence/2`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "allowed_specializations": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ],
  "powers": [
    // Array of object
        {
      "id": "number",
      "rank": "number",
      "main_power_spell":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      },
      "passive_power_spell":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      }
    }
  ],
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  }
}
```

---

### Connected Realms Index

**Endpoint:** `/data/wow/connected-realm/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "connected_realms": [
    // Array of object
        {
      "href": "string"
    }
  ]
}
```

---

### Connected Realm

**Endpoint:** `/data/wow/connected-realm/581`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "has_queue": "boolean",
  "status":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "population":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "realms": [
    // Array of object
        {
      "id": "number",
      "region":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      },
      "connected_realm":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "category":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "locale": "string",
      "timezone": "string",
      "type":       {
        "type": "string",
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        }
      },
      "is_tournament": "boolean",
      "slug": "string"
    }
  ],
  "mythic_leaderboards":   {
    "href": "string"
  },
  "auctions":   {
    "href": "string"
  }
}
```

---

### Covenant Index

**Endpoint:** `/data/wow/covenant/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "covenants": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Covenant

**Endpoint:** `/data/wow/covenant/1`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "signature_ability":   {
    "id": "number",
    "spell_tooltip":     {
      "spell":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      },
      "description":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "cast_time":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "cooldown":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    }
  },
  "class_abilities": [
    // Array of object
        {
      "id": "number",
      "playable_class":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      },
      "spell_tooltip":       {
        "spell":         {
          "key":           {
            "href": "string"
          },
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          },
          "id": "number"
        },
        "description":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "cast_time":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "range":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "cooldown":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        }
      }
    }
  ],
  "soulbinds": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ],
  "renown_rewards": [
    // Array of object
        {
      "level": "number",
      "reward":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      }
    }
  ],
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  }
}
```

---

### Soulbind Index

**Endpoint:** `/data/wow/covenant/soulbind/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "soulbinds": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Conduit Index

**Endpoint:** `/data/wow/covenant/conduit/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "conduits": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Creature

**Endpoint:** `/data/wow/creature/30`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "type":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "family":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "creature_displays": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ],
  "is_tameable": "boolean"
}
```

---

### Creature Display Media

**Endpoint:** `/data/wow/media/creature-display/30`

**Namespace:** `static-eu`

**Error:** API request failed with status code 404: {"code":404,"type":"BLZWEBAPI00000404","detail":"Not Found"}

---

### Creature Families Index

**Endpoint:** `/data/wow/creature-family/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "creature_families": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Creature Types Index

**Endpoint:** `/data/wow/creature-type/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "creature_types": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Guild Crest Components Index

**Endpoint:** `/data/wow/guild-crest/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "emblems": [
    // Array of object
        {
      "id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      }
    }
  ],
  "borders": [
    // Array of object
        {
      "id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      }
    }
  ],
  "colors":   {
    "emblems": [
      // Array of object
            {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    ],
    "borders": [
      // Array of object
            {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    ],
    "backgrounds": [
      // Array of object
            {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    ]
  }
}
```

---

### Guild Crest Border Media

**Endpoint:** `/data/wow/media/guild-crest/border/1`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "assets": [
    // Array of object
        {
      "key": "string",
      "value": "string"
    }
  ],
  "id": "number"
}
```

---

### Heirloom Index

**Endpoint:** `/data/wow/heirloom/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "heirlooms": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Heirloom

**Endpoint:** `/data/wow/heirloom/1`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "item":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "source":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "source_description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "upgrades": [
    // Array of object
        {
      "item":       {
        "item":         {
          "key":           {
            "href": "string"
          },
          "id": "number"
        },
        "context": "number",
        "bonus_list": [
          // Array of number
          "number"
        ],
        "quality":         {
          "type": "string",
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "media":         {
          "key":           {
            "href": "string"
          },
          "id": "number"
        },
        "item_class":         {
          "key":           {
            "href": "string"
          },
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          },
          "id": "number"
        },
        "item_subclass":         {
          "key":           {
            "href": "string"
          },
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          },
          "id": "number"
        },
        "inventory_type":         {
          "type": "string",
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        },
        "binding":         {
          "type": "string",
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        },
        "weapon":         {
          "damage":           {
            "min_value": "number",
            "max_value": "number",
            "display_string":             {
              "en_US": "string",
              "es_MX": "string",
              "pt_BR": "string",
              "de_DE": "string",
              "en_GB": "string",
              "es_ES": "string",
              "fr_FR": "string",
              "it_IT": "string",
              "ru_RU": "string",
              "ko_KR": "string",
              "zh_TW": "string",
              "zh_CN": "string"
            },
            "damage_class":             {
              "type": "string",
              "name":               {
                "en_US": "string",
                "es_MX": "string",
                "pt_BR": "string",
                "de_DE": "string",
                "en_GB": "string",
                "es_ES": "string",
                "fr_FR": "string",
                "it_IT": "string",
                "ru_RU": "string",
                "ko_KR": "string",
                "zh_TW": "string",
                "zh_CN": "string"
              }
            }
          },
          "attack_speed":           {
            "value": "number",
            "display_string":             {
              "en_US": "string",
              "es_MX": "string",
              "pt_BR": "string",
              "de_DE": "string",
              "en_GB": "string",
              "es_ES": "string",
              "fr_FR": "string",
              "it_IT": "string",
              "ru_RU": "string",
              "ko_KR": "string",
              "zh_TW": "string",
              "zh_CN": "string"
            }
          },
          "dps":           {
            "value": "number",
            "display_string":             {
              "en_US": "string",
              "es_MX": "string",
              "pt_BR": "string",
              "de_DE": "string",
              "en_GB": "string",
              "es_ES": "string",
              "fr_FR": "string",
              "it_IT": "string",
              "ru_RU": "string",
              "ko_KR": "string",
              "zh_TW": "string",
              "zh_CN": "string"
            }
          }
        },
        "stats": [
          // Array of object
                    {
            "type":             {
              "type": "string",
              "name":               {
                "en_US": "string",
                "es_MX": "string",
                "pt_BR": "string",
                "de_DE": "string",
                "en_GB": "string",
                "es_ES": "string",
                "fr_FR": "string",
                "it_IT": "string",
                "ru_RU": "string",
                "ko_KR": "string",
                "zh_TW": "string",
                "zh_CN": "string"
              }
            },
            "value": "number",
            "display":             {
              "display_string":               {
                "en_US": "string",
                "es_MX": "string",
                "pt_BR": "string",
                "de_DE": "string",
                "en_GB": "string",
                "es_ES": "string",
                "fr_FR": "string",
                "it_IT": "string",
                "ru_RU": "string",
                "ko_KR": "string",
                "zh_TW": "string",
                "zh_CN": "string"
              },
              "color":               {
                "r": "number",
                "g": "number",
                "b": "number",
                "a": "number"
              }
            }
          }
        ],
        "upgrades":         {
          "value": "number",
          "max_value": "number",
          "display_string":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        },
        "requirements":         {
          "level":           {
            "display_string":             {
              "en_US": "string",
              "es_MX": "string",
              "pt_BR": "string",
              "de_DE": "string",
              "en_GB": "string",
              "es_ES": "string",
              "fr_FR": "string",
              "it_IT": "string",
              "ru_RU": "string",
              "ko_KR": "string",
              "zh_TW": "string",
              "zh_CN": "string"
            }
          }
        },
        "level":         {
          "value": "number",
          "display_string":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        }
      },
      "level": "number"
    }
  ],
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  }
}
```

---

### Item

**Endpoint:** `/data/wow/item/19019`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "quality":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "level": "number",
  "required_level": "number",
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  },
  "item_class":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "item_subclass":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "inventory_type":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "purchase_price": "number",
  "sell_price": "number",
  "max_count": "number",
  "is_equippable": "boolean",
  "is_stackable": "boolean",
  "preview_item":   {
    "item":     {
      "key":       {
        "href": "string"
      },
      "id": "number"
    },
    "context": "number",
    "bonus_list": [
      // Array of number
      "number"
    ],
    "quality":     {
      "type": "string",
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "media":     {
      "key":       {
        "href": "string"
      },
      "id": "number"
    },
    "item_class":     {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    },
    "item_subclass":     {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    },
    "inventory_type":     {
      "type": "string",
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    },
    "binding":     {
      "type": "string",
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    },
    "unique_equipped":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "weapon":     {
      "damage":       {
        "min_value": "number",
        "max_value": "number",
        "display_string":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "damage_class":         {
          "type": "string",
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        }
      },
      "attack_speed":       {
        "value": "number",
        "display_string":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        }
      },
      "dps":       {
        "value": "number",
        "display_string":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        }
      }
    },
    "stats": [
      // Array of object
            {
        "type":         {
          "type": "string",
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          }
        },
        "value": "number",
        "is_negated": "boolean",
        "display":         {
          "display_string":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          },
          "color":           {
            "r": "number",
            "g": "number",
            "b": "number",
            "a": "number"
          }
        }
      }
    ],
    "spells": [
      // Array of object
            {
        "spell":         {
          "key":           {
            "href": "string"
          },
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          },
          "id": "number"
        },
        "description":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        }
      }
    ],
    "requirements":     {
      "level":       {
        "value": "number",
        "display_string":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        }
      }
    },
    "level":     {
      "value": "number",
      "display_string":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    },
    "durability":     {
      "value": "number",
      "display_string":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    }
  },
  "purchase_quantity": "number",
  "appearances": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Item Media

**Endpoint:** `/data/wow/media/item/19019`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "assets": [
    // Array of object
        {
      "key": "string",
      "value": "string",
      "file_data_id": "number"
    }
  ],
  "id": "number"
}
```

---

### Item Classes Index

**Endpoint:** `/data/wow/item-class/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "item_classes": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Item Sets Index

**Endpoint:** `/data/wow/item-set/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "item_sets": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Item Subclass

**Endpoint:** `/data/wow/item-class/2/item-subclass/1`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "class_id": "number",
  "subclass_id": "number",
  "display_name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "verbose_name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  }
}
```

---

### Journal Expansions Index

**Endpoint:** `/data/wow/journal-expansion/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "tiers": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Journal Encounters Index

**Endpoint:** `/data/wow/journal-encounter/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "encounters": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Journal Instances Index

**Endpoint:** `/data/wow/journal-instance/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "instances": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Modified Crafting Index

**Endpoint:** `/data/wow/modified-crafting/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "categories":   {
    "href": "string"
  },
  "slot_types":   {
    "href": "string"
  }
}
```

---

### Mounts Index

**Endpoint:** `/data/wow/mount/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "mounts": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Mount

**Endpoint:** `/data/wow/mount/6`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "creature_displays": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ],
  "description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "source":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "faction":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "requirements":   {
    "faction":     {
      "type": "string",
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    }
  }
}
```

---

### Mythic Keystone Affixes Index

**Endpoint:** `/data/wow/keystone-affix/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "affixes": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Mythic Keystone Index

**Endpoint:** `/data/wow/mythic-keystone/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "seasons":   {
    "href": "string"
  },
  "dungeons":   {
    "href": "string"
  }
}
```

---

### Mythic Keystone Seasons Index

**Endpoint:** `/data/wow/mythic-keystone/season/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "seasons": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ],
  "current_season":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  }
}
```

---

### Pets Index

**Endpoint:** `/data/wow/pet/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "pets": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Pet Abilities Index

**Endpoint:** `/data/wow/pet-ability/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "abilities": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Playable Classes Index

**Endpoint:** `/data/wow/playable-class/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "classes": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Playable Class

**Endpoint:** `/data/wow/playable-class/1`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "gender_name":   {
    "male":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "female":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "power_type":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "specializations": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ],
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  },
  "pvp_talent_slots":   {
    "href": "string"
  },
  "playable_races": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Playable Races Index

**Endpoint:** `/data/wow/playable-race/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "races": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Playable Specializations Index

**Endpoint:** `/data/wow/playable-specialization/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character_specializations": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ],
  "pet_specializations": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Power Types Index

**Endpoint:** `/data/wow/power-type/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "power_types": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Professions Index

**Endpoint:** `/data/wow/profession/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "professions": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Profession

**Endpoint:** `/data/wow/profession/164`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "type":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  },
  "skill_tiers": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Recipe

**Endpoint:** `/data/wow/recipe/1631`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  },
  "crafted_item":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "reagents": [
    // Array of object
        {
      "reagent":       {
        "key":         {
          "href": "string"
        },
        "name":         {
          "en_US": "string",
          "es_MX": "string",
          "pt_BR": "string",
          "de_DE": "string",
          "en_GB": "string",
          "es_ES": "string",
          "fr_FR": "string",
          "it_IT": "string",
          "ru_RU": "string",
          "ko_KR": "string",
          "zh_TW": "string",
          "zh_CN": "string"
        },
        "id": "number"
      },
      "quantity": "number"
    }
  ],
  "crafted_quantity":   {
    "value": "number"
  }
}
```

---

### PvP Seasons Index

**Endpoint:** `/data/wow/pvp-season/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "seasons": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ],
  "current_season":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  }
}
```

---

### PvP Tiers Index

**Endpoint:** `/data/wow/pvp-tier/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "tiers": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Quests Index

**Endpoint:** `/data/wow/quest/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "categories":   {
    "href": "string"
  },
  "areas":   {
    "href": "string"
  },
  "types":   {
    "href": "string"
  }
}
```

---

### Quest

**Endpoint:** `/data/wow/quest/2`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "title":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "area":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "requirements":   {
    "min_character_level": "number",
    "max_character_level": "number",
    "faction":     {
      "type": "string",
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    }
  },
  "rewards":   {
    "experience": "number",
    "reputations": [
      // Array of object
            {
        "reward":         {
          "key":           {
            "href": "string"
          },
          "name":           {
            "en_US": "string",
            "es_MX": "string",
            "pt_BR": "string",
            "de_DE": "string",
            "en_GB": "string",
            "es_ES": "string",
            "fr_FR": "string",
            "it_IT": "string",
            "ru_RU": "string",
            "ko_KR": "string",
            "zh_TW": "string",
            "zh_CN": "string"
          },
          "id": "number"
        },
        "value": "number"
      }
    ],
    "money":     {
      "value": "number",
      "units":       {
        "gold": "number",
        "silver": "number",
        "copper": "number"
      }
    }
  }
}
```

---

### Quest Categories Index

**Endpoint:** `/data/wow/quest/category/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "categories": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Realms Index

**Endpoint:** `/data/wow/realm/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "realms": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number",
      "slug": "string"
    }
  ]
}
```

---

### Realm

**Endpoint:** `/data/wow/realm/hyjal`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "region":   {
    "key":     {
      "href": "string"
    },
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "id": "number"
  },
  "connected_realm":   {
    "href": "string"
  },
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "category":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "locale": "string",
  "timezone": "string",
  "type":   {
    "type": "string",
    "name":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  },
  "is_tournament": "boolean",
  "slug": "string"
}
```

---

### Regions Index

**Endpoint:** `/data/wow/region/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "regions": [
    // Array of object
        {
      "href": "string"
    }
  ]
}
```

---

### Reputation Factions Index

**Endpoint:** `/data/wow/reputation-faction/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "factions": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ],
  "root_factions": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Reputation Tiers Index

**Endpoint:** `/data/wow/reputation-tiers/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "reputation_tiers": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Spell

**Endpoint:** `/data/wow/spell/196607`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "description":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "media":   {
    "key":     {
      "href": "string"
    },
    "id": "number"
  }
}
```

---

### Spell Media

**Endpoint:** `/data/wow/media/spell/196607`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "assets": [
    // Array of object
        {
      "key": "string",
      "value": "string",
      "file_data_id": "number"
    }
  ],
  "id": "number"
}
```

---

### Talent Tree Index

**Endpoint:** `/data/wow/talent-tree/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "spec_talent_trees": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    }
  ],
  "class_talent_trees": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      }
    }
  ],
  "hero_talent_trees": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Talents Index

**Endpoint:** `/data/wow/talent/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "talents": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### PvP Talents Index

**Endpoint:** `/data/wow/pvp-talent/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "pvp_talents": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Tech Talent Tree Index

**Endpoint:** `/data/wow/tech-talent-tree/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "talent_trees": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Tech Talent Index

**Endpoint:** `/data/wow/tech-talent/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "talents": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Titles Index

**Endpoint:** `/data/wow/title/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "titles": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### Title

**Endpoint:** `/data/wow/title/1`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name":   {
    "en_US": "string",
    "es_MX": "string",
    "pt_BR": "string",
    "de_DE": "string",
    "en_GB": "string",
    "es_ES": "string",
    "fr_FR": "string",
    "it_IT": "string",
    "ru_RU": "string",
    "ko_KR": "string",
    "zh_TW": "string",
    "zh_CN": "string"
  },
  "gender_name":   {
    "male":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    },
    "female":     {
      "en_US": "string",
      "es_MX": "string",
      "pt_BR": "string",
      "de_DE": "string",
      "en_GB": "string",
      "es_ES": "string",
      "fr_FR": "string",
      "it_IT": "string",
      "ru_RU": "string",
      "ko_KR": "string",
      "zh_TW": "string",
      "zh_CN": "string"
    }
  }
}
```

---

### Toy Index

**Endpoint:** `/data/wow/toy/index`

**Namespace:** `static-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "toys": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name":       {
        "en_US": "string",
        "es_MX": "string",
        "pt_BR": "string",
        "de_DE": "string",
        "en_GB": "string",
        "es_ES": "string",
        "fr_FR": "string",
        "it_IT": "string",
        "ru_RU": "string",
        "ko_KR": "string",
        "zh_TW": "string",
        "zh_CN": "string"
      },
      "id": "number"
    }
  ]
}
```

---

### WoW Token Index

**Endpoint:** `/data/wow/token/index`

**Namespace:** `dynamic-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "last_updated_timestamp": "number",
  "price": "number"
}
```

---

