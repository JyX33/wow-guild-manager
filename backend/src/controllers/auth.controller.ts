import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config/default';
import battleNetService from '../services/battlenet.service';
import userModel from '../models/user.model';

const generateState = () => {
  return Math.random().toString(36).substring(2, 15);
};

export default {
  login: async (req: Request, res: Response) => {
    try {
      const { region = 'eu' } = req.query;
      const state = generateState();
      
      // Store state in session to verify callback
      req.session.oauthState = state;
      req.session.region = region;
      
      const authUrl = await battleNetService.getAuthorizationUrl(region as string, state);
      console.log('Authorization URL:', authUrl);
      res.json({ authUrl });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to initiate login' });
    }
  },
  
  callback: async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      const { oauthState, region } = req.session;
      
      // Verify state to prevent CSRF
      if (state !== oauthState) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      
      // Exchange code for access token
      const tokenData = await battleNetService.getAccessToken(region as string, code as string);
      
      // Get user info from Battle.net
      const userInfo = await battleNetService.getUserInfo(region as string, tokenData.access_token);
      
      // Find or create user in database
      let user = await userModel.findByBattleNetId(userInfo.id);
      
      if (!user) {
        user = await userModel.create({
          battle_net_id: userInfo.id,
          battletag: userInfo.battletag,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
          user_data: userInfo
        });
      } else {
        // Update existing user with new tokens
        user = await userModel.update(user.id, {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
          user_data: userInfo
        });
      }
      
      // Generate JWT for frontend auth
      const token = jwt.sign(
        { id: user.id, battle_net_id: user.battle_net_id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Set JWT in cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      // Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL || 'https://localhost:5173'}/auth/callback`);
    } catch (error) {
      console.error('Callback error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  },
  
  logout: (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  },
  
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      // req.user is set by authMiddleware
      const user = await userModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Don't send sensitive info to frontend
      const { access_token, refresh_token, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user information' });
    }
  }
};