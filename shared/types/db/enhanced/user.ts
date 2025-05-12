/**
 * Enhanced database model for User with typed JSON fields
 */

import { DbUser } from '../models/user';
import { BattleNetUserProfile } from '../../battlenet/profile';

/**
 * Enhanced User model with typed JSON fields
 */
export interface DbUserEnhanced extends DbUser {
  user_data?: BattleNetUserProfile | null;
}