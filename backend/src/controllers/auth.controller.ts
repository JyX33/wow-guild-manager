import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import battleNetService from '../services/battlenet.service';
import characterModel from '../models/character.model';
import userModel from '../models/user.model';
import { User, UserRole, UserWithTokens, BattleNetUserProfile, BattleNetRegion } from '../../../shared/types/user'; // Import BattleNetRegion
import { AppError } from '../utils/error-handler';
import { asyncHandler } from '../utils/error-handler';
import logger from '../utils/logger'; // Import the logger
import { OnboardingService } from '../services/onboarding.service'; // Import OnboardingService
import { BattleNetApiClient } from '../services/battlenet-api.client'; // Import ApiClient

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


const generateToken = (user: User | UserWithTokens) => {
  // Generate JWT for frontend auth
  // @ts-ignore // TODO: Investigate TS2769 error
  const token = jwt.sign(
    { id: user.id, battle_net_id: user.battle_net_id, role: user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );

  // Generate refresh token with longer expiry
  // @ts-ignore // TODO: Investigate TS2769 error
  const refreshToken = jwt.sign(
    { id: user.id },
    config.auth.jwtRefreshSecret,
    { expiresIn: config.auth.jwtRefreshExpiresIn }
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

    // Store state and validated region in session
    req.session.oauthState = state;
    req.session.region = validRegion; // Assign the validated BattleNetRegion

    // Set a short expiry on the state
    req.session.stateExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes

    const authUrl = await battleNetService.getAuthorizationUrl(validRegion, state); // Use validated region
    res.json({ success: true, data: { authUrl } });
  }),

  callback: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, query: req.query }, 'Handling callback request');
    const { code, state } = req.query;
    const { oauthState, region, stateExpiry } = req.session;

    // Verify state to prevent CSRF
    if (!state || state !== oauthState) {
      throw new AppError('Invalid state parameter', 400);
    }

    // Check if state has expired
    if (!stateExpiry || Date.now() > stateExpiry) {
      throw new AppError('Authorization request has expired', 400);
    }

    // Clear the state from session to prevent replay attacks
    delete req.session.oauthState;
    delete req.session.stateExpiry;

    // Ensure region is valid before proceeding
    const callbackRegion = region || 'eu'; // Default to 'eu' if somehow missing from session

    // Exchange code for access token
    const tokenData = await battleNetService.getAccessToken(callbackRegion, code as string);

    // Get user info from Battle.net
    const userInfo = await battleNetService.getUserInfo(callbackRegion, tokenData.access_token);

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
        role: UserRole.USER
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

    // Set tokens in cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: config.auth.cookieMaxAge
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',  // Only accessible by refresh endpoint
      maxAge: config.auth.refreshCookieMaxAge
    });

    // Store userId in session for backend use
    req.session.userId = user.id;
    logger.info({ userId: user.id }, 'User session established');

    // Trigger the onboarding process (fetches profile, syncs chars, checks GM status)
    // This runs asynchronously in the background, not blocking the redirect.
    onboardingService.processNewUser(user.id, tokenData.access_token, callbackRegion)
      .then(() => {
        logger.info({ userId: user.id }, '[AuthCallback] Background onboarding process finished.');
      })
      .catch((onboardingError: any) => { // Add type annotation
        // Log error from the async onboarding process
        logger.error({ err: onboardingError, userId: user.id }, '[AuthCallback] Error during background onboarding process:');
      });

    // Redirect to frontend immediately
    res.redirect(`${config.server.frontendUrl}/auth/callback`);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, userId: req.session?.userId }, 'Handling logout request');
    const userId = req.session?.userId; // Log user ID before destroying session

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err, userId }, 'Error destroying session during logout');
        // Still proceed to clear cookies
      } else {
        logger.info({ userId }, 'Session destroyed successfully during logout');
      }

      // Clear cookies regardless of session destruction success
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth/refresh'
      });

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
    logger.info({ method: req.method, path: req.path, userId: req.session?.userId }, 'Handling refreshToken request');
    if (!req.user) {
      // This implies the refresh token validation failed in middleware
      throw new AppError('Authentication failed (invalid refresh token)', 401);
    }

    // Generate new tokens
    const { token, refreshToken } = generateToken(req.user);

    // Set new tokens in cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: config.auth.cookieMaxAge
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: config.auth.refreshCookieMaxAge
    });

    res.json({ success: true, message: 'Token refreshed successfully' });
  }),

  updateUserRole: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, body: req.body, userId: req.session?.userId }, 'Handling updateUserRole request');
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