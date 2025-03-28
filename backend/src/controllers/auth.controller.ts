import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import battleNetService from '../services/battlenet.service';
import characterModel from '../models/character.model';
import userModel from '../models/user.model';
import { User, UserRole, UserWithTokens, BattleNetUserProfile } from '../../../shared/types/user';
import { AppError } from '../utils/error-handler';
import { asyncHandler } from '../utils/error-handler';

const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
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
    const regionQuery = req.query.region;
    let regionString: string;

    if (Array.isArray(regionQuery)) {
      regionString = typeof regionQuery[0] === 'string' ? regionQuery[0] : 'eu';
    } else if (typeof regionQuery === 'string') {
      regionString = regionQuery;
    } else {
      regionString = 'eu'; // Default if undefined or ParsedQs
    }

    const state = generateState();
    
    // Store state in session to verify callback
    req.session.oauthState = state;
    req.session.region = regionString; // Assign the validated string
    
    // Set a short expiry on the state
    req.session.stateExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    const authUrl = await battleNetService.getAuthorizationUrl(regionString, state); // Use validated string
    res.json({ success: true, data: { authUrl } });
  }),
  
  callback: asyncHandler(async (req: Request, res: Response) => {
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
    
    // Exchange code for access token
    const tokenData = await battleNetService.getAccessToken(region as string, code as string);
    
    // Get user info from Battle.net
    const userInfo = await battleNetService.getUserInfo(region as string, tokenData.access_token);
    
    // Find or create user in database
    let user = await userModel.findByBattleNetId(userInfo.id);
    
    const tokenExpiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
    
    if (!user) {
      // Create new user
      user = await userModel.createUser({
        battle_net_id: userInfo.id,
        battletag: userInfo.battletag,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiryDate.toISOString(),
        user_data: userInfo as BattleNetUserProfile,
        role: UserRole.USER
      });
    } else {
      // Update existing user with new tokens
      user = await userModel.updateTokens(
        user.id, 
        tokenData.access_token, 
        tokenData.refresh_token, 
        tokenExpiryDate
      ) as User;
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

    if (req.query.sync === 'true') {
      try {
        // Get WoW profile from Battle.net
        const wowProfile = await battleNetService.getWowProfile(
          region as string, 
          tokenData.access_token
        );
        
        // Sync characters
        await characterModel.syncCharactersFromBattleNet(
          user.id, 
          wowProfile.wow_accounts || []
        );
        
        // Update sync timestamp
        await userModel.updateCharacterSyncTimestamp(user.id);
      } catch (syncError) {
        console.error('Error syncing characters during login:', syncError);
        // Don't fail the login if sync fails
      }
    }
    
    // Redirect to frontend
    res.redirect(`${config.server.frontendUrl}/auth/callback`);
  }),
  
  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth/refresh'
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
  }),
  
  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not found', 404);
    }
    
    // Explicitly cast to UserWithTokens to acknowledge tokens are present
    const userWithTokens = req.user as UserWithTokens;
    
    // Don't send sensitive info to frontend
    const { access_token, refresh_token, ...safeUser } = userWithTokens;
    
    res.json({ success: true, data: safeUser });
  }),
  
  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication failed', 401);
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