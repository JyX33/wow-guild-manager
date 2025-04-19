import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { BattleNetRegion, BattleNetUserProfile, User, UserRole, UserWithTokens } from '../../../shared/types/user.js'; // Import BattleNetRegion
import config from '../config/index.js'; // Assuming index.js is the entry point
import userModel from '../models/user.model.js';
import { BattleNetApiClient } from '../services/battlenet-api.client.js'; // Import ApiClient
import { OnboardingService } from '../services/onboarding.service.js'; // Import OnboardingService
import { AppError, asyncHandler } from '../utils/error-handler.js';
import logger from '../utils/logger.js'; // Import the logger

// Instantiate services (consider dependency injection for better management)
const apiClient = new BattleNetApiClient();
const onboardingService = new OnboardingService(apiClient);


const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to check if a string is a valid BattleNetRegion
const isValidRegion = (region: string): region is BattleNetRegion => {
  return ['us', 'eu', 'kr', 'tw'].includes(region); // Adjust if region values differ
};


const generateToken = (user: UserWithTokens) => { // Ensure UserWithTokens for tokens_valid_since
  // Ensure tokens_valid_since exists, default to now if somehow missing (shouldn't happen after migration)
  const tokenValidSince = user.tokens_valid_since || new Date().toISOString();

  // Generate JWT for frontend auth
  // @ts-ignore // TODO: Investigate TS2769 error
  const token = jwt.sign(
    {
      id: user.id,
      battle_net_id: user.battle_net_id,
      role: user.role,
      tvs: tokenValidSince // Add token valid since timestamp
    },
    process.env.JWT_SECRET!, // Use environment variable
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN } // Use environment variable
  );

  // Generate refresh token with longer expiry
  // @ts-ignore // TODO: Investigate TS2769 error
  const refreshToken = jwt.sign(
    {
      id: user.id,
      tvs: tokenValidSince // Add token valid since timestamp
    },
    process.env.JWT_SECRET!, // Use environment variable
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN } // Use environment variable
  );

  return { token, refreshToken };
};

export default {
  login: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, query: req.query }, 'Handling login request');
    const regionQuery = req.query.region;
    let regionString: string;
    let validRegion: BattleNetRegion = 'eu'; // Default to 'eu'

    // Determine region string from query
    if (Array.isArray(regionQuery)) {
      regionString = typeof regionQuery[0] === 'string' ? regionQuery[0] : 'eu';
    } else if (typeof regionQuery === 'string') {
      regionString = regionQuery;
    } else {
      regionString = 'eu'; // Default if undefined or ParsedQs
    }

    // Validate and assign the region
    if (isValidRegion(regionString)) {
      validRegion = regionString;
    } else {
      logger.warn({ providedRegion: regionString }, 'Invalid region provided in login request, defaulting to eu.');
      // validRegion remains 'eu'
    }


const state = generateState();
    const stateExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes from now

    // Store state and validated region in session (as fallback)
    req.session.oauthState = state;
    req.session.region = validRegion; // Assign the validated BattleNetRegion
    req.session.stateExpiry = stateExpiry; // Store expiry in session as fallback

    // Explicitly save the session before sending the response
    req.session.save((err) => {
      if (err) {
        logger.error({ err }, 'Error saving session before sending auth URL');
        // Handle error appropriately, maybe throw or send an error response
        return res.status(500).json({ success: false, message: 'Failed to initiate login process.' });
      }
      // Session saved, now send the auth URL
      const callbackUrl = new URL(config.battlenet.redirectUri);
      callbackUrl.searchParams.set('state_in_redirect', state);
      callbackUrl.searchParams.set('expiry_in_redirect', stateExpiry.toString()); // Embed expiry in redirect_uri
      const encodedRedirectUri = callbackUrl.toString();
      const authUrl = apiClient.getAuthorizationUrl(validRegion, state, encodedRedirectUri);
      logger.info({ authUrl, sessionId: req.sessionID }, 'Session saved, sending auth URL to frontend');
      res.json({ success: true, data: { authUrl } });
    });
  }),

  callback: asyncHandler(async (req: Request, res: Response) => {
    // Enhanced logging for debugging state issues
    logger.info(
      {
        method: req.method,
        path: req.path,
        query: req.query,
        sessionId: req.sessionID, // Log the session ID
        sessionExists: !!req.session, // Log if session object exists
        sessionData: req.session ? { ...req.session } : null // Log session data (clone to avoid logging methods)
      },
      'Handling callback request - Inspecting session'
    );

    const { code, state } = req.query;
    const stateInRedirect = req.query.state_in_redirect as string | undefined;
    const expiryInRedirect = req.query.expiry_in_redirect as string | undefined;
    const { region } = req.session; // Keep region from session

    logger.info({ code, state, stateInRedirect, expiryInRedirect, region }, 'Callback request parameters');

    // Verify state to prevent CSRF
    if (!state || state !== stateInRedirect) {
      logger.warn({ queryState: state, stateInRedirect: stateInRedirect, sessionId: req.sessionID }, 'Invalid state parameter during callback');
      throw new AppError('Invalid state parameter', 400);
    }

    // Validate expiry from redirect_uri
    if (!expiryInRedirect) {
      logger.warn({ expiryInRedirect, sessionId: req.sessionID }, 'Expiry parameter missing from redirect_uri');
      throw new AppError('Authorization request has expired', 400); // Treat missing expiry as expired
    }

    const expiryTimestamp = parseInt(expiryInRedirect, 10);

    if (isNaN(expiryTimestamp) || Date.now() > expiryTimestamp) {
      logger.warn({ expiryInRedirect, expiryTimestamp, currentTime: Date.now(), sessionId: req.sessionID }, 'Authorization request has expired');
      throw new AppError('Authorization request has expired', 400);
    }

    // Ensure region is valid before proceeding
    const callbackRegion = region || 'eu'; // Default to 'eu' if somehow missing from session

    // Exchange code for access token
    const tokenData = await apiClient.getAccessToken(callbackRegion as BattleNetRegion, code as string);

    const userInfo = await apiClient.getUserInfo(callbackRegion as BattleNetRegion, tokenData.access_token);

    // Find or create user in database
    // Use findByBattleNetId which returns UserWithTokens type
    let user = await userModel.findByBattleNetId(userInfo.id);

    const tokenExpiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

    if (!user) {
      // Create new user
      logger.info({ battletag: userInfo.battletag, bnetId: userInfo.id }, 'Creating new user');
      // Pass undefined for refresh token if it's not provided by tokenData
      user = await userModel.createUser({
        battle_net_id: userInfo.id,
        battletag: userInfo.battletag,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // Pass string | undefined
        token_expires_at: tokenExpiryDate.toISOString(),
        user_data: userInfo as BattleNetUserProfile,
        role: UserRole.USER,
        region: callbackRegion,
      });
    } else {
      // Update existing user with new tokens
      logger.info({ userId: user.id, battletag: user.battletag }, 'Updating tokens for existing user');

      // Determine the refresh token to use: new one if available, otherwise keep the existing one.
      // user is UserWithTokens here, so user.refresh_token exists
      const refreshTokenToUpdate = typeof tokenData.refresh_token === 'string'
        ? tokenData.refresh_token
        : user.refresh_token; // Fallback to existing token from the fetched user

      // Refresh token is not reliably provided by Battle.net, update only access token
      user = await userModel.updateTokens(
        user.id,
        tokenData.access_token,
        null, // Pass null as refresh token is not available/used
        tokenExpiryDate
      ) as User; // Cast back to User as updateTokens might return more fields
    }

    // Generate tokens
    const { token, refreshToken } = generateToken(user);

    // Redirect to frontend with tokens in fragment
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback#accessToken=${token}&refreshToken=${refreshToken}`);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id; // Get user ID from authenticated user
    logger.info({ method: req.method, path: req.path, userId }, 'Handling logout request');

    if (userId) {
      try {
        // Invalidate tokens before destroying session/clearing cookies
        await userModel.invalidateUserTokens(userId);
        logger.info({ userId }, 'User tokens invalidated successfully during logout');
      } catch (invalidationError) {
        logger.error({ err: invalidationError, userId }, 'Error invalidating tokens during logout');
        // Proceed with logout anyway
      }
    } else {
      logger.warn('Logout request received but no authenticated user found (req.user missing).');
    }

    // Destroy the session (if still used for other purposes)
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err, userId }, 'Error destroying session during logout');
        // Still proceed to clear cookies
      } else {
        logger.info({ userId }, 'Session destroyed successfully during logout');
      }

      // For JWT, logout is primarily client-side.
      // We can send a success response.
      res.json({ success: true, message: 'Logged out successfully' });
    });
  }),

  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    // No need for explicit request log here as middleware might handle it,
    // or it's implicitly logged by accessing req.user
    if (!req.user) {
      // This case should ideally be handled by authentication middleware first
      throw new AppError('User not authenticated', 401);
    }

    // Explicitly cast to UserWithTokens to acknowledge tokens are present
    const userWithTokens = req.user as UserWithTokens;

    // Don't send sensitive info to frontend
    const { access_token, refresh_token, ...safeUser } = userWithTokens;

    res.json({ success: true, data: safeUser });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    // This endpoint will receive the refresh token in the request body
    const { refreshToken: incomingRefreshToken } = req.body;

    if (!incomingRefreshToken) {
      throw new AppError('Refresh token not provided', 400);
    }

    try {
      // Verify the refresh token
      const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET!) as { id: string, tvs: string };

      // Find the user based on the decoded ID
      const user = await userModel.findById(parseInt(decoded.id, 10)); // Convert id to number

      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Optional: Check if the tokens_valid_since matches the token's tvs
      // This helps invalidate old refresh tokens if a user logs out or password changes
      if (user.tokens_valid_since && new Date(decoded.tvs).getTime() < new Date(user.tokens_valid_since).getTime()) {
         throw new AppError('Refresh token is invalid or expired due to logout/password change', 401);
      }


      // Generate NEW access and refresh tokens
      const { token: newAccessToken, refreshToken: newRefreshToken } = generateToken(user);

      // Update the database with the NEW refresh token (if storing them)
      // If refresh tokens are stateless JWTs, you might not need this step.
      // Assuming for now we are not storing refresh tokens in DB for statelessness.
      // If you were storing them, you'd update the user record here.

      logger.info({ userId: user.id }, 'Token refresh successful, new tokens issued.');
      res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });

    } catch (error: any) {
      logger.error({ err: error }, 'Error refreshing token');
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }),

  updateUserRole: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, body: req.body, userId: req.user?.id }, 'Handling updateUserRole request'); // Use req.user?.id
    const { userId, role } = req.body;

    if (!userId || !role || !Object.values(UserRole).includes(role as UserRole)) {
      throw new AppError('Invalid user ID or role', 400);
    }

    // Only admins can update roles
    if (req.user?.role !== UserRole.ADMIN) {
      throw new AppError('Insufficient permissions', 403);
    }

    const updatedUser = await userModel.updateRole(userId, role as UserRole);

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    // Cast to UserWithTokens and don't return sensitive data
    const userWithTokens = updatedUser as UserWithTokens;
    const { access_token, refresh_token, ...safeUser } = userWithTokens;

    res.json({ success: true, data: safeUser });
  })
};