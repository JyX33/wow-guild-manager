# Authentication Workflow Simplification Plan: Session/JWT Hybrid

## 1. Background

The current backend authentication workflow utilizes both `express-session` and JWTs stored in cookies.

- **`express-session`:** Primarily used during the Battle.net OAuth handshake (`/login` -> `/callback`) to store the CSRF `state` parameter and the selected `region`. This is a necessary security measure for the OAuth flow. After a successful callback, the internal `userId` is also stored in the session (`req.session.userId`).
- **JWTs:** After a successful callback, internal JWT access and refresh tokens are generated and set as `HttpOnly` cookies. Subsequent authenticated API requests rely on the JWT access token cookie, which is verified by the `authMiddleware.authenticate` middleware. This middleware fetches the user from the database based on the JWT payload and attaches the user object to `req.user`.

## 2. Identified Redundancy

The storage of `userId` within the `express-session` *after* the OAuth callback (`req.session.userId = user.id;` in `auth.controller.ts`) appears redundant. The primary mechanism for identifying the user on subsequent requests is the JWT access token, which populates `req.user`.

A codebase search (`search_files` tool) for `req.session.userId` within `backend/src` confirmed that this variable is only assigned in the `auth.controller.ts` callback function and is not read or used elsewhere after the initial login phase.

## 3. Proposed Simplification

To simplify state management and remove the redundancy, the plan is to rely solely on the JWT mechanism for user identification after the OAuth callback is complete.

**Implementation Step:**

- Remove the line `req.session.userId = user.id;` (currently line 175) from the `callback` function in `backend/src/controllers/auth.controller.ts`.

**Expected Outcome:**

- The `express-session` will continue to function correctly for the OAuth handshake (state/region storage).
- After the callback, user identification will be handled exclusively by the JWT access token stored in the cookie and verified by the middleware.
- This removes the dual storage of the user identifier post-login, slightly reducing complexity.

## 4. Next Steps

- Apply the code change (remove the specified line).
- Perform thorough testing of login, authenticated requests, and logout flows to ensure no regressions.