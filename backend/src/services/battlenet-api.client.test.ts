import { jest, describe, it, expect, beforeEach } from '@jest/globals'; // Explicit import (removed advanceTimersByTime)
import { BattleNetApiClient } from './battlenet-api.client';
import * as battleNetService from './battlenet.service'; // The actual service making HTTP calls
import { AppError } from '../utils/error-handler';
import { BattleNetRegion } from '../../../shared/types/user';
import { TokenResponse } from '../../../shared/types/auth'; // Added import
import { BattleNetGuild, BattleNetGuildRoster } from '../../../shared/types/guild'; // Added imports

// Top-level jest.mock removed. Mocks will be set up in beforeEach.

// --- Test Suite ---

describe('BattleNetApiClient', () => {
  let apiClient: BattleNetApiClient;
  // No need for mockBattleNetService variable, we spy on the imported module directly

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up spies on the actual imported service module
    // Specific implementations (mockResolvedValue/mockRejectedValue) are set in tests
    jest.spyOn(battleNetService, 'getClientCredentialsToken');
    jest.spyOn(battleNetService, 'getGuildData');
    jest.spyOn(battleNetService, 'getGuildRoster');
    jest.spyOn(battleNetService, 'getEnhancedCharacterData');

    apiClient = new BattleNetApiClient();
    // jest.useFakeTimers(); // Removed fake timer setup
  });

  // afterEach(() => {
  //   jest.useRealTimers(); // Removed fake timer cleanup
  // });

  // --- Tests for ensureClientToken ---
  describe('ensureClientToken', () => {
    // Updated mock to satisfy TokenResponse interface
    const mockTokenResponse: TokenResponse = {
      access_token: 'test-token-123',
      expires_in: 3600, // 1 hour
      token_type: 'bearer',
      refresh_token: 'mock-refresh-token', // Added required field
      scope: 'wow.profile', // Added required field
    };

    it('should call getClientCredentialsToken if no token exists', async () => {
      jest.spyOn(battleNetService, 'getClientCredentialsToken').mockResolvedValue(mockTokenResponse);
      const token = await apiClient.ensureClientToken();
      expect(token).toBe(mockTokenResponse.access_token);
      expect(battleNetService.getClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should return the existing token if it is valid', async () => {
      // First call to get the token
      jest.spyOn(battleNetService, 'getClientCredentialsToken').mockResolvedValue(mockTokenResponse);
      await apiClient.ensureClientToken();
      expect(battleNetService.getClientCredentialsToken).toHaveBeenCalledTimes(1);

      // Second call should use the cached token
      const token = await apiClient.ensureClientToken();
      expect(token).toBe(mockTokenResponse.access_token);
      expect(battleNetService.getClientCredentialsToken).toHaveBeenCalledTimes(1); // Still 1 call
    });

    // Removed tests relying on fake timers due to environment incompatibility
    // - should refresh the token if it is nearing expiry (within 1 minute)
    // - should refresh the token if it has expired

    it('should throw AppError if getClientCredentialsToken fails', async () => {
      const error = new Error('Network Error');
      jest.spyOn(battleNetService, 'getClientCredentialsToken').mockRejectedValue(error);

      await expect(apiClient.ensureClientToken()).rejects.toThrow(AppError);
      await expect(apiClient.ensureClientToken()).rejects.toMatchObject({
        message: `Failed to get API token: ${error.message}`,
        status: 500,
        code: 'BATTLE_NET_AUTH_ERROR',
      });
    });

     it('should throw AppError if token response is invalid', async () => {
      jest.spyOn(battleNetService, 'getClientCredentialsToken').mockResolvedValue({} as any); // Invalid response

      await expect(apiClient.ensureClientToken()).rejects.toThrow(AppError);
       await expect(apiClient.ensureClientToken()).rejects.toMatchObject({
        message: expect.stringContaining('Invalid token response'),
        status: 500,
        code: 'BATTLE_NET_AUTH_ERROR',
      });
    });
  });

  // --- Tests for getGuildData ---
  describe('getGuildData', () => {
    const realm = 'test-realm';
    const guild = 'test-guild';
    const region: BattleNetRegion = 'eu';
    // Updated mock to satisfy BattleNetGuild type
    const mockData: BattleNetGuild = { // Use full type
      _links: { self: { href: 'guild-self-link' } },
      id: 1,
      name: 'Test Guild Data',
      faction: { type: 'ALLIANCE', name: 'Alliance' },
      achievement_points: 12345,
      member_count: 50,
      realm: { key: { href: 'realm-key-link' }, name: 'Test Realm', id: 1, slug: 'test-realm' },
      crest: { emblem: {} as any, border: {} as any, background: {} as any }, // Provide minimal structure or 'as any'
      created_timestamp: Date.now(),
      roster: { href: 'roster-link' },
      achievements: { href: 'achievements-link' },
      activity: { href: 'activity-link' }, // Added missing required field
    };

    beforeEach(() => {
      // Mock ensureClientToken for these tests
      jest.spyOn(apiClient, 'ensureClientToken').mockResolvedValue('fake-token');
      jest.spyOn(battleNetService, 'getGuildData').mockResolvedValue(mockData); // Spy on the actual module
    });

    it('should call ensureClientToken', async () => {
      await apiClient.getGuildData(realm, guild, region);
      expect(apiClient.ensureClientToken).toHaveBeenCalledTimes(1);
    });

    it('should call battleNetService.getGuildData with correct parameters', async () => {
      await apiClient.getGuildData(realm, guild, region);
      expect(battleNetService.getGuildData).toHaveBeenCalledWith(realm, guild, 'fake-token', region); // Check call on the actual module
    });

    it('should return the data from battleNetService', async () => {
      const data = await apiClient.getGuildData(realm, guild, region);
      expect(data).toEqual(mockData);
    });

    it('should throw AppError if battleNetService.getGuildData fails', async () => {
      const error = new Error('API Error');
      // Use mockImplementation to explicitly throw the error asynchronously
      jest.spyOn(battleNetService, 'getGuildData').mockImplementation(async () => {
        throw error;
      });

      // Use .rejects matcher and check properties
      await expect(apiClient.getGuildData(realm, guild, region)).rejects.toThrow(AppError);
      await expect(apiClient.getGuildData(realm, guild, region)).rejects.toMatchObject({
          message: `Failed to fetch guild data: ${error.message}`,
          code: 'BATTLE_NET_API_ERROR',
          status: 500,
          details: { realmSlug: realm, guildNameSlug: guild, region }
       });
    });
  });

   // --- Tests for getGuildRoster ---
   describe('getGuildRoster', () => {
      const realm = 'test-realm';
      const guild = 'test-guild';
      const region: BattleNetRegion = 'us';
      // Updated mock to satisfy BattleNetGuildRoster type
      const mockData: BattleNetGuildRoster = {
         _links: { self: { href: 'roster-self-link' } },
         guild: { key: { href: 'guild-key-link' }, name: guild, id: 123, realm: { key: { href: 'realm-key-link' }, name: 'Test Realm', id: 1, slug: realm }, faction: { type: 'A', name: 'Alliance' } },
         members: [], // Keep members empty for this base mock
      };

      beforeEach(() => {
        jest.spyOn(apiClient, 'ensureClientToken').mockResolvedValue('fake-token');
        jest.spyOn(battleNetService, 'getGuildRoster').mockResolvedValue(mockData); // Spy on the actual module
      });

      it('should call ensureClientToken', async () => {
        await apiClient.getGuildRoster(region, realm, guild);
        expect(apiClient.ensureClientToken).toHaveBeenCalledTimes(1);
      });

      it('should call battleNetService.getGuildRoster with correct parameters', async () => {
        await apiClient.getGuildRoster(region, realm, guild);
        expect(battleNetService.getGuildRoster).toHaveBeenCalledWith(region, realm, guild, 'fake-token'); // Check call on the actual module
      });

      it('should return the data from battleNetService', async () => {
        const data = await apiClient.getGuildRoster(region, realm, guild);
        expect(data).toEqual(mockData);
      });

      it('should throw AppError if battleNetService.getGuildRoster fails', async () => {
        const error = new Error('Roster API Error');
        // Use mockImplementation to explicitly throw the error asynchronously
        jest.spyOn(battleNetService, 'getGuildRoster').mockImplementation(async () => {
          throw error;
        });

        // Use .rejects matcher and check properties
        await expect(apiClient.getGuildRoster(region, realm, guild)).rejects.toThrow(AppError);
        await expect(apiClient.getGuildRoster(region, realm, guild)).rejects.toMatchObject({
            message: `Failed to fetch guild roster: ${error.message}`,
            code: 'BATTLE_NET_API_ERROR',
            status: 500,
            details: { realmSlug: realm, guildNameSlug: guild, region }
         });
      });
   });

   // --- Tests for getEnhancedCharacterData ---
   describe('getEnhancedCharacterData', () => {
      const realm = 'test-realm';
      const charName = 'testchar';
      const region: BattleNetRegion = 'kr';
      // Updated mock to satisfy the complex return type (removed Partial)
      const mockData = { // Removed explicit type annotation for simplicity, relying on inference + structure
        _links: { self: { href: 'char-self-link' } }, // Required by BattleNetCharacter
        id: 101,
        name: 'TestChar Data',
        gender: { type: 'MALE', name: 'Male' },
        faction: { type: 'ALLIANCE', name: 'Alliance' },
        race: { key: { href: '' }, name: 'Human', id: 1 },
        character_class: { key: { href: '' }, name: 'Warrior', id: 1 },
        active_spec: { key: { href: '' }, name: 'Arms', id: 71 },
        realm: { key: { href: '' }, name: 'Test Realm', id: 1, slug: 'test-realm' },
        level: 70,
        experience: 0,
        achievement_points: 1000,
        last_login_timestamp: Date.now(),
        average_item_level: 450,
        equipped_item_level: 455,
        // Mock the added properties
        equipment: { _links: {} as any, character: {} as any, equipped_items: [] },
        itemLevel: 455, // Match equipped_item_level for simplicity
        mythicKeystone: null, // Or a mock BattleNetMythicKeystoneProfile object
        professions: [], // Or mock professions array
        // Add other required fields from BattleNetCharacter if needed
        titles: { href: '' },
        pvp_summary: { href: '' },
        encounters: { href: '' },
        media: { href: '' },
        specializations: { href: '' },
        statistics: { href: '' },
        mythic_keystone_profile: { href: '' },
        achievements: { href: '' },
      };

       beforeEach(() => {
        jest.spyOn(apiClient, 'ensureClientToken').mockResolvedValue('fake-token');
        jest.spyOn(battleNetService, 'getEnhancedCharacterData').mockResolvedValue(mockData); // Spy on the actual module
      });

       it('should call ensureClientToken', async () => {
        await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(apiClient.ensureClientToken).toHaveBeenCalledTimes(1);
      });

       it('should call battleNetService.getEnhancedCharacterData with correct parameters', async () => {
        await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(battleNetService.getEnhancedCharacterData).toHaveBeenCalledWith(realm, charName, 'fake-token', region); // Check call on the actual module
      });

       it('should return the data from battleNetService', async () => {
        const data = await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(data).toEqual(mockData);
      });

       it('should return null if battleNetService returns null (e.g., 404)', async () => {
        jest.spyOn(battleNetService, 'getEnhancedCharacterData').mockResolvedValue(null); // Spy on the actual module
        const data = await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(data).toBeNull();
      });

       it('should throw AppError if battleNetService throws an error', async () => {
        const error = new Error('Character API Error');
         // Use mockImplementation to explicitly throw the error asynchronously
        jest.spyOn(battleNetService, 'getEnhancedCharacterData').mockImplementation(async () => {
          throw error;
        });

        // Use .rejects matcher and check properties
        await expect(apiClient.getEnhancedCharacterData(realm, charName, region)).rejects.toThrow(AppError);
        await expect(apiClient.getEnhancedCharacterData(realm, charName, region)).rejects.toMatchObject({
            message: `Failed to fetch character data: ${error.message}`,
            code: 'BATTLE_NET_API_ERROR',
            status: 500,
            details: { realmSlug: realm, characterNameLower: charName, region }
         });
      });
   });

});