# Battle.net Game Data API Response Structures

## Endpoints

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
