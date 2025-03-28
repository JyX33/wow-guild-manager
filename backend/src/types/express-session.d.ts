import 'express-session';

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    region?: string;
    stateExpiry?: number;
    // Add other custom session properties here if needed
  }
}