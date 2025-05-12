/**
 * Enhanced database model for Guild Member with typed JSON fields
 */

import { DbGuildMember } from '../models/member';
import { BattleNetGuildMember } from '../../battlenet/guild';

/**
 * Enhanced Guild Member model with typed JSON fields
 */
export interface DbGuildMemberEnhanced extends DbGuildMember {
  member_data_json?: BattleNetGuildMember | null;
}