# Consolidated Authentication Enhancement Plan

This plan details the implementation of two key security enhancements for the backend authentication system: Refresh Token Rotation and Explicit Token Revocation.

## 1. Goals

- **Refresh Token Rotation:** Enhance security by issuing a new refresh token and invalidating the old one each time a refresh token is successfully used. This limits the usability window of potentially compromised refresh tokens.
- **Explicit Token Revocation:** Provide a mechanism to immediately invalidate all active access and refresh tokens for a user upon specific events (e.g., logout, admin action), regardless of token expiry times.

## 2. Implementation Steps

### 2.1. Database Migration

- **Action:** Add a new column `tokens_valid_since` to the `users` table.
- **Details:**
  - Type: `TIMESTAMP WITH TIME ZONE`
  - Default Value: `NOW()`
- **Purpose:** This timestamp tracks the moment from which tokens issued for this user are considered valid. It's the core mechanism for explicit revocation.

### 2.2. Model Layer (`user.model.ts`)

- **Action:** Update TypeScript types (`User`, `UserWithTokens`) to include the `tokens_valid_since` field.
- **Action:** Ensure all user-fetching functions (e.g., `getUserWithTokens`, `findByBattleNetId`) retrieve the `tokens_valid_since` field.
- **Action:** Create/Modify a function for token updates during refresh, e.g., `updateTokensForRefresh(userId: number, newAccessToken: string, newRefreshToken: string, newExpiryDate: Date)`.
  - **Purpose:** Specifically handles updating `access_token`, `refresh_token`, and `token_expires_at` during the token refresh flow. This replaces the old refresh token with the new one.
- **Action:** Create a function `invalidateUserTokens(userId: number)`.
  - **Purpose:** Updates the `tokens_valid_since` field for the specified user to the current timestamp (`NOW()`), effectively revoking all previously issued tokens.

### 2.3. Controller Layer (`auth.controller.ts`)

- **Action:** Modify the `generateToken` function.
  - **Input:** Accept the user object (including `tokens_valid_since`).
  - **Output:** Include the user's `tokens_valid_since` timestamp (e.g., as ISO string claim `tvs`) in the payload of *both* the generated JWT access token and JWT refresh token.
- **Action:** Modify the `refreshToken` controller function.
  - **Logic:** After successful verification by the middleware:
        1. Call `generateToken(req.user)` to get a *new* access token and a *new* refresh token (both containing the current `tvs`).
        2. Call `userModel.updateTokensForRefresh(...)` to store the *new* refresh token in the database, replacing the old one.
        3. Set *both* the new access token and the new refresh token in the response cookies.
- **Action:** Modify the `logout` controller function.
  - **Logic:** *Before* clearing cookies/session, call `userModel.invalidateUserTokens(req.user.id)` to revoke tokens upon logout.

### 2.4. Middleware Layer (`auth.middleware.ts`)

- **Action:** Modify the `authenticate` middleware.
  - **Logic:** After verifying JWT signature/expiry and fetching the `user` record:
        1. Extract the `tvs` claim from the decoded access token.
        2. Compare the token's `tvs` timestamp with `user.tokens_valid_since` from the DB.
        3. If timestamps don't match, return 401 Unauthorized (Token Revoked).
- **Action:** Modify the `refreshToken` middleware.
  - **Logic:** After verifying JWT signature/expiry and fetching the `user` record:
        1. **Rotation Check:** Compare the *incoming* refresh token string with `user.refresh_token` from the DB. If they don't match (meaning the token was already used/rotated), return 401 Unauthorized.
        2. **Revocation Check:** Extract the `tvs` claim from the decoded refresh token. Compare the token's `tvs` timestamp with `user.tokens_valid_since` from the DB. If they don't match, return 401 Unauthorized (Token Revoked).

## 3. Expected Outcome

- Improved security through reduced refresh token lifetime and immediate revocation capability.
- Authentication flow remains largely the same from the user's perspective, but with enhanced server-side validation.

## 4. Next Steps

- Implement the database migration.
- Implement the code changes in the model, controller, and middleware layers as outlined above.
- Thoroughly test all authentication flows (login, refresh, logout, authenticated requests, revocation scenarios).
