# Battle.net API Response Structures

## Endpoints

### Account Profile Summary

**Endpoint:** `/profile/user/wow`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    },
    "user":     {
      "href": "string"
    },
    "profile":     {
      "href": "string"
    }
  },
  "id": "number",
  "wow_accounts": [
    // Array of object
        {
      "id": "number",
      "characters": [
        // Array of object
                {
          "character":           {
            "href": "string"
          },
          "protected_character":           {
            "href": "string"
          },
          "name": "string",
          "id": "number",
          "realm":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
          },
          "playable_class":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
          "playable_race":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
          "gender":           {
            "type": "string",
            "name":             {
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
          "faction":           {
            "type": "string",
            "name":             {
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
          "level": "number"
        }
      ]
    }
  ],
  "collections":   {
    "href": "string"
  }
}
```

---

### Character Profile Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name": "string",
  "gender":   {
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
  "race":   {
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
  "character_class":   {
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
  "active_spec":   {
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
  "realm":   {
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
    "id": "number",
    "slug": "string"
  },
  "guild":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
    },
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
  "level": "number",
  "experience": "number",
  "achievement_points": "number",
  "achievements":   {
    "href": "string"
  },
  "titles":   {
    "href": "string"
  },
  "pvp_summary":   {
    "href": "string"
  },
  "encounters":   {
    "href": "string"
  },
  "media":   {
    "href": "string"
  },
  "hunter_pets":   {
    "href": "string"
  },
  "last_login_timestamp": "number",
  "average_item_level": "number",
  "equipped_item_level": "number",
  "specializations":   {
    "href": "string"
  },
  "statistics":   {
    "href": "string"
  },
  "mythic_keystone_profile":   {
    "href": "string"
  },
  "equipment":   {
    "href": "string"
  },
  "appearance":   {
    "href": "string"
  },
  "collections":   {
    "href": "string"
  },
  "active_title":   {
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
    "id": "number",
    "display_string":     {
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
  "reputations":   {
    "href": "string"
  },
  "quests":   {
    "href": "string"
  },
  "achievements_statistics":   {
    "href": "string"
  },
  "professions":   {
    "href": "string"
  },
  "covenant_progress":   {
    "chosen_covenant":     {
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
    "renown_level": "number",
    "soulbinds":     {
      "href": "string"
    }
  },
  "name_search": "string"
}
```

---

### Character Achievements Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/achievements`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "total_quantity": "number",
  "total_points": "number",
  "achievements": [
    // Array of object
        {
      "id": "number",
      "achievement":       {
        "key":         {
          "href": "string"
        },
        "name": "string",
        "id": "number"
      },
      "criteria":       {
        "id": "number",
        "is_completed": "boolean"
      },
      "completed_timestamp": "number"
    }
  ],
  "category_progress": [
    // Array of object
        {
      "category":       {
        "key":         {
          "href": "string"
        },
        "name": "string",
        "id": "number"
      },
      "quantity": "number",
      "points": "number"
    }
  ],
  "recent_events": [
    // Array of object
        {
      "achievement":       {
        "key":         {
          "href": "string"
        },
        "name": "string",
        "id": "number"
      },
      "timestamp": "number"
    }
  ],
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "statistics":   {
    "href": "string"
  }
}
```

---

### Character Achievement Statistics

**Endpoint:** `/profile/wow/character/hyjal/rødeo/achievements/statistics`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "categories": [
    // Array of object
        {
      "id": "number",
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
      "sub_categories": [
        // Array of object
                {
          "id": "number",
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
          "statistics": [
            // Array of object
                        {
              "id": "number",
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
              },
              "last_updated_timestamp": "number",
              "quantity": "number"
            }
          ]
        }
      ],
      "statistics": [
        // Array of object
                {
          "id": "number",
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
          "last_updated_timestamp": "number",
          "quantity": "number"
        }
      ]
    }
  ]
}
```

---

### Character Appearance Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/appearance`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "playable_race":   {
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
  "playable_class":   {
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
  "active_spec":   {
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
  "gender":   {
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
  "guild_crest":   {
    "emblem":     {
      "id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      },
      "color":       {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    },
    "border":     {
      "id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      },
      "color":       {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    },
    "background":     {
      "color":       {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    }
  },
  "items": [
    // Array of object
        {
      "id": "number",
      "slot":       {
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
      "enchant": "number",
      "item_appearance_modifier_id": "number",
      "internal_slot_id": "number",
      "subclass": "number"
    }
  ],
  "customizations": [
    // Array of object
        {
      "option":       {
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
      "choice":       {
        "id": "number",
        "display_order": "number"
      }
    }
  ]
}
```

---

### Character Collections Index

**Endpoint:** `/profile/wow/character/hyjal/rødeo/collections`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "pets":   {
    "href": "string"
  },
  "mounts":   {
    "href": "string"
  },
  "heirlooms":   {
    "href": "string"
  },
  "toys":   {
    "href": "string"
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "transmogs":   {
    "href": "string"
  }
}
```

---

### Character Equipment Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/equipment`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "equipped_items": [
    // Array of object
        {
      "item":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      },
      "slot":       {
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
      "quantity": "number",
      "context": "number",
      "bonus_list": [
        // Array of number
        "number"
      ],
      "quality":       {
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
      "modified_appearance_id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      },
      "item_class":       {
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
      "item_subclass":       {
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
      "inventory_type":       {
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
      "binding":       {
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
      "armor":       {
        "value": "number",
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
      },
      "stats": [
        // Array of object
                {
          "type":           {
            "type": "string",
            "name":             {
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
          "display":           {
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
            "color":             {
              "r": "number",
              "g": "number",
              "b": "number",
              "a": "number"
            }
          }
        }
      ],
      "sell_price":       {
        "value": "number",
        "display_strings":         {
          "header":           {
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
          "gold":           {
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
          "silver":           {
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
          "copper":           {
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
      "requirements":       {
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
        },
        "playable_classes":         {
          "links": [
            // Array of object
                        {
              "key":               {
                "href": "string"
              },
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
              },
              "id": "number"
            }
          ],
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
      "set":       {
        "item_set":         {
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
        "items": [
          // Array of object
                    {
            "item":             {
              "key":               {
                "href": "string"
              },
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
              },
              "id": "number"
            },
            "is_equipped": "boolean"
          }
        ],
        "effects": [
          // Array of object
                    {
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
            "required_count": "number",
            "is_active": "boolean"
          }
        ],
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
      },
      "transmog":       {
        "item":         {
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
        "item_modified_appearance_id": "number"
      },
      "durability":       {
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
    }
  ],
  "equipped_item_sets": [
    // Array of object
        {
      "item_set":       {
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
      "items": [
        // Array of object
                {
          "item":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
          "is_equipped": "boolean"
        }
      ],
      "effects": [
        // Array of object
                {
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
          "required_count": "number",
          "is_active": "boolean"
        }
      ],
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
  ]
}
```

---

### Character Hunter Pets Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/hunter-pets`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "hunter_pets": [
    // Array of object
        {
      "name": "string",
      "level": "number",
      "creature":       {
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
      "slot": "number",
      "creature_display":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      }
    }
  ]
}
```

---

### Character Media Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/media`

**Namespace:** `profile-eu`

**Error:** API request failed with status code 404: 

---

### Character Mythic Keystone Profile Index

**Endpoint:** `/profile/wow/character/hyjal/rødeo/mythic-keystone-profile`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "current_period":   {
    "period":     {
      "key":       {
        "href": "string"
      },
      "id": "number"
    },
    "best_runs": [
      // Array of object
            {
        "completed_timestamp": "number",
        "duration": "number",
        "keystone_level": "number",
        "keystone_affixes": [
          // Array of object
                    {
            "key":             {
              "href": "string"
            },
            "name":             {
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
        "members": [
          // Array of object
                    {
            "character":             {
              "name": "string",
              "id": "number",
              "realm":               {
                "key":                 {
                  "href": "string"
                },
                "id": "number",
                "slug": "string"
              }
            },
            "specialization":             {
              "key":               {
                "href": "string"
              },
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
              },
              "id": "number"
            },
            "race":             {
              "key":               {
                "href": "string"
              },
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
              },
              "id": "number"
            },
            "equipped_item_level": "number"
          }
        ],
        "dungeon":         {
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
        "is_completed_within_time": "boolean",
        "mythic_rating":         {
          "color":           {
            "r": "number",
            "g": "number",
            "b": "number",
            "a": "number"
          },
          "rating": "number"
        },
        "map_rating":         {
          "color":           {
            "r": "number",
            "g": "number",
            "b": "number",
            "a": "number"
          },
          "rating": "number"
        }
      }
    ]
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
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "current_mythic_rating":   {
    "color":     {
      "r": "number",
      "g": "number",
      "b": "number",
      "a": "number"
    },
    "rating": "number"
  }
}
```

---

### Character Professions Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/professions`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "primaries": [
    // Array of object
        {
      "profession":       {
        "key":         {
          "href": "string"
        },
        "name": "string",
        "id": "number"
      },
      "tiers": [
        // Array of object
                {
          "skill_points": "number",
          "max_skill_points": "number",
          "tier":           {
            "name": "string",
            "id": "number"
          },
          "known_recipes": [
            // Array of object
                        {
              "key":               {
                "href": "string"
              },
              "name": "string",
              "id": "number"
            }
          ]
        }
      ]
    }
  ],
  "secondaries": [
    // Array of object
        {
      "profession":       {
        "key":         {
          "href": "string"
        },
        "name": "string",
        "id": "number"
      },
      "skill_points": "number",
      "max_skill_points": "number"
    }
  ]
}
```

---

### Character PvP Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/pvp-summary`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "honor_level": "number",
  "pvp_map_statistics": [
    // Array of object
        {
      "world_map":       {
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
      "match_statistics":       {
        "played": "number",
        "won": "number",
        "lost": "number"
      }
    }
  ],
  "honorable_kills": "number",
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  }
}
```

---

### Character Quests

**Endpoint:** `/profile/wow/character/hyjal/rødeo/quests`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "in_progress": [
    // Array of object
        {
      "key":       {
        "href": "string"
      },
      "name": "string",
      "id": "number"
    }
  ],
  "completed":   {
    "href": "string"
  }
}
```

---

### Character Reputations Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/reputations`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "reputations": [
    // Array of object
        {
      "faction":       {
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
      "standing":       {
        "raw": "number",
        "value": "number",
        "max": "number",
        "tier": "number",
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
      }
    }
  ]
}
```

---

### Character Specializations Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/specializations`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "specializations": [
    // Array of object
        {
      "specialization":       {
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
      "pvp_talent_slots": [
        // Array of object
                {
          "selected":           {
            "talent":             {
              "key":               {
                "href": "string"
              },
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
              },
              "id": "number"
            },
            "spell_tooltip":             {
              "spell":               {
                "key":                 {
                  "href": "string"
                },
                "name":                 {
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
              "description":               {
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
              "cast_time":               {
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
              "power_cost":               {
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
              "range":               {
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
              "cooldown":               {
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
          "slot_number": "number"
        }
      ],
      "loadouts": [
        // Array of object
                {
          "is_active": "boolean",
          "talent_loadout_code": "string",
          "selected_class_talents": [
            // Array of object
                        {
              "id": "number",
              "rank": "number"
            }
          ],
          "selected_spec_talents": [
            // Array of object
                        {
              "id": "number",
              "rank": "number",
              "tooltip":               {
                "talent":                 {
                  "key":                   {
                    "href": "string"
                  },
                  "name":                   {
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
                "spell_tooltip":                 {
                  "spell":                   {
                    "key":                     {
                      "href": "string"
                    },
                    "name":                     {
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
                  "description":                   {
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
                  "cast_time":                   {
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
                  "power_cost":                   {
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
                  "range":                   {
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
                  "cooldown":                   {
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
          ],
          "selected_hero_talents": [
            // Array of object
                        {
              "id": "number",
              "rank": "number",
              "tooltip":               {
                "talent":                 {
                  "key":                   {
                    "href": "string"
                  },
                  "name":                   {
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
                "spell_tooltip":                 {
                  "spell":                   {
                    "key":                     {
                      "href": "string"
                    },
                    "name":                     {
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
                  "description":                   {
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
                  "cast_time":                   {
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
              "default_points": "number"
            }
          ],
          "selected_class_talent_tree":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
          "selected_spec_talent_tree":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
          "selected_hero_talent_tree":           {
            "key":             {
              "href": "string"
            },
            "name":             {
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
      ]
    }
  ],
  "active_specialization":   {
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
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "active_hero_talent_tree":   {
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
  }
}
```

---

### Character Statistics Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/statistics`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "health": "number",
  "power": "number",
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
  "speed":   {
    "rating_bonus": "number",
    "rating_normalized": "number"
  },
  "strength":   {
    "base": "number",
    "effective": "number"
  },
  "agility":   {
    "base": "number",
    "effective": "number"
  },
  "intellect":   {
    "base": "number",
    "effective": "number"
  },
  "stamina":   {
    "base": "number",
    "effective": "number"
  },
  "melee_crit":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "melee_haste":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "mastery":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "bonus_armor": "number",
  "lifesteal":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "versatility": "number",
  "versatility_damage_done_bonus": "number",
  "versatility_healing_done_bonus": "number",
  "versatility_damage_taken_bonus": "number",
  "avoidance":   {
    "rating_bonus": "number",
    "rating_normalized": "number"
  },
  "attack_power": "number",
  "main_hand_damage_min": "number",
  "main_hand_damage_max": "number",
  "main_hand_speed": "number",
  "main_hand_dps": "number",
  "off_hand_damage_min": "number",
  "off_hand_damage_max": "number",
  "off_hand_speed": "number",
  "off_hand_dps": "number",
  "spell_power": "number",
  "spell_penetration": "number",
  "spell_crit":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "mana_regen": "number",
  "mana_regen_combat": "number",
  "armor":   {
    "base": "number",
    "effective": "number"
  },
  "dodge":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "parry":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "block":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "ranged_crit":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "ranged_haste":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "spell_haste":   {
    "rating_bonus": "number",
    "value": "number",
    "rating_normalized": "number"
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  }
}
```

---

### Character Titles Summary

**Endpoint:** `/profile/wow/character/hyjal/rødeo/titles`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "character":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
  },
  "active_title":   {
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
    "id": "number",
    "display_string":     {
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

### Guild

**Endpoint:** `/data/wow/guild/hyjal/this-is-not-a-guild`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "id": "number",
  "name": "string",
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
  "achievement_points": "number",
  "member_count": "number",
  "realm":   {
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
    "id": "number",
    "slug": "string"
  },
  "crest":   {
    "emblem":     {
      "id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      },
      "color":       {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    },
    "border":     {
      "id": "number",
      "media":       {
        "key":         {
          "href": "string"
        },
        "id": "number"
      },
      "color":       {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    },
    "background":     {
      "color":       {
        "id": "number",
        "rgba":         {
          "r": "number",
          "g": "number",
          "b": "number",
          "a": "number"
        }
      }
    }
  },
  "roster":   {
    "href": "string"
  },
  "achievements":   {
    "href": "string"
  },
  "created_timestamp": "number",
  "activity":   {
    "href": "string"
  },
  "name_search": "string"
}
```

---

### Guild Roster

**Endpoint:** `/data/wow/guild/hyjal/this-is-not-a-guild/roster`

**Namespace:** `profile-eu`

**Response Structure:**

```json
{
  "_links":   {
    "self":     {
      "href": "string"
    }
  },
  "guild":   {
    "key":     {
      "href": "string"
    },
    "name": "string",
    "id": "number",
    "realm":     {
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
    },
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
  "members": [
    // Array of object
        {
      "character":       {
        "key":         {
          "href": "string"
        },
        "name": "string",
        "id": "number",
        "realm":         {
          "key":           {
            "href": "string"
          },
          "id": "number",
          "slug": "string"
        },
        "level": "number",
        "playable_class":         {
          "key":           {
            "href": "string"
          },
          "id": "number"
        },
        "playable_race":         {
          "key":           {
            "href": "string"
          },
          "id": "number"
        },
        "faction":         {
          "type": "string"
        }
      },
      "rank": "number"
    }
  ]
}
```

---

