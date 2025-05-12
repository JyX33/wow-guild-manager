import { UserWithTokens } from '../../../shared/types/models/user';

declare global {
  namespace Express {
    interface Request {
      user?: UserWithTokens;
      guildId?: number;
    }
  }
}

// No need to export anything as this is an ambient declaration file