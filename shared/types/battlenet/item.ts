/**
 * Item-related Battle.net API types
 */

import { KeyReference, TypeName, PlayableClass } from './common';

/**
 * Item socket from Equipment API
 */
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

/**
 * Item stat from Equipment API
 */
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

/**
 * Item set piece from Equipment API
 */
export interface BattleNetSetItem {
  item: {
    key: KeyReference;
    name: string;
    id: number;
  }
  is_equipped?: boolean;
}

/**
 * Item set effect from Equipment API
 */
export interface BattleNetEffect {
  display_string: string;
  required_count: number;
  is_active?: boolean;
}

/**
 * Detailed item from Equipment API
 */
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