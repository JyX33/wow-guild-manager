// backend/src/types/express-session.d.ts
import "express-session";
import { BattleNetRegion } from "../../../shared/types/user"; // Import the type if needed

declare module "express-session" {
  interface SessionData {
    userId?: number; // Or string, depending on your user ID type. Assuming number. Mark as optional if it might not always exist.
    region?: BattleNetRegion; // Add the region property, mark as optional
    oauthState?: string; // State parameter for OAuth flow
    stateExpiry?: number; // Timestamp for state expiry
  }
}
