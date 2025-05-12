// backend/src/types/express-session.d.ts
import "express-session";
import { BattleNetRegion } from "../../../shared/types/enums/user";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    region?: BattleNetRegion;
    oauthState?: string; // State parameter for OAuth flow
    stateExpiry?: number; // Timestamp for state expiry
    state?: string; // Another state parameter used in authentication
  }
}
