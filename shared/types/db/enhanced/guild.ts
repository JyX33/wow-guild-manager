/**
 * Enhanced database model for Guild with typed JSON fields
 */

import { DbGuild } from '../models/guild';
import { BattleNetGuild, BattleNetGuildRoster } from '../../battlenet/guild';

/**
 * Enhanced Guild model with typed JSON fields
 */
export interface DbGuildEnhanced extends DbGuild {
  guild_data_json?: BattleNetGuild | null;
  roster_json?: BattleNetGuildRoster | null;
}