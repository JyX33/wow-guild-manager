import { jest, describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals'; // Consolidated imports, Added afterAll
import { BattleNetApiClient } from './battlenet-api.client.js';
// Removed import for battleNetService
import { AppError } from '../utils/error-handler.js';
import { BattleNetRegion } from '../../../shared/types/user.js';
import { TokenResponse } from '../../../shared/types/auth.js'; // Added import
import { BattleNetGuild, BattleNetGuildRoster } from '../../../shared/types/guild.js'; // Added imports
import config from '../config/index.js'; // Added config import

// Top-level jest.mock removed. Mocks will be set up in beforeEach.

// --- Test Suite ---

describe('BattleNetApiClient', () => {
  let apiClient: BattleNetApiClient;
  // Define spies for the private methods we want to mock
  let doAxiosGetSpy: jest.SpiedFunction<any>; // Use any for private method access
  let doAxiosPostSpy: jest.SpiedFunction<any>; // Use any for private method access

  beforeEach(() => {
    jest.clearAllMocks();

    // Instantiate the client
    // Instantiate apiClient INSIDE beforeEach for clean state
    apiClient = new BattleNetApiClient();

    // Spy on the private methods of the instance or prototype
    // Using prototype is often cleaner for unit tests
    doAxiosGetSpy = jest.spyOn(BattleNetApiClient.prototype as any, '_doAxiosGet');
    doAxiosPostSpy = jest.spyOn(BattleNetApiClient.prototype as any, '_doAxiosPost');

    // Provide default mock implementations (can be overridden in tests)
    doAxiosGetSpy.mockResolvedValue({}); // Default success
    doAxiosPostSpy.mockResolvedValue({}); // Default success
  });

  


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
      // Mock the underlying POST call for token fetching
      doAxiosPostSpy.mockResolvedValue(mockTokenResponse);
      const token = await apiClient.ensureClientToken();
      expect(token).toBe(mockTokenResponse.access_token);
      // Check if the POST method was called (indirectly via _fetchClientCredentialsToken)
      expect(doAxiosPostSpy).toHaveBeenCalledTimes(1);
      expect(doAxiosPostSpy).toHaveBeenCalledWith(
        expect.stringContaining('/token'), // URL
        expect.any(URLSearchParams), // Data
        expect.objectContaining({ username: config.battlenet.clientId }), // Auth
        expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }) // Headers
      );
    });

    it('should return the existing token if it is valid', async () => {
      // First call to get the token
      // Mock the underlying POST call
      doAxiosPostSpy.mockResolvedValue(mockTokenResponse);
      await apiClient.ensureClientToken();
      expect(doAxiosPostSpy).toHaveBeenCalledTimes(1);

      // Second call should use the cached token
      const token = await apiClient.ensureClientToken();
      expect(token).toBe(mockTokenResponse.access_token);
      expect(doAxiosPostSpy).toHaveBeenCalledTimes(1); // Still 1 call
    });
    
    it('should throw AppError if getClientCredentialsToken fails', async () => {
      const error = new Error('Network Error');
      // Make the underlying POST call fail
      doAxiosPostSpy.mockRejectedValue(error);

      await expect(apiClient.ensureClientToken()).rejects.toThrow(AppError);
      await expect(apiClient.ensureClientToken()).rejects.toMatchObject({
        message: `Failed to get API token: ${error.message}`,
        status: 500,
        code: 'BATTLE_NET_AUTH_ERROR',
      });
    });

     it('should throw AppError if token response is invalid', async () => {
      // Make the underlying POST call return an invalid response
      doAxiosPostSpy.mockResolvedValue({} as any); // Invalid response

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
      // Reset mock implementation for getGuildData before each test in this block
      // Mock the underlying GET call
      doAxiosGetSpy.mockResolvedValue(mockData);
    });

    it('should call ensureClientToken', async () => {
      await apiClient.getGuildData(realm, guild, region);
      expect(apiClient.ensureClientToken).toHaveBeenCalledTimes(1);
    });

    it('should call battleNetService.getGuildData with correct parameters', async () => {
      await apiClient.getGuildData(realm, guild, region);
      // Check if the GET method was called (indirectly via _fetchGuildData)
      expect(doAxiosGetSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/data/wow/guild/${realm}/${guild}`), // URL check
        'fake-token', // Token check
        expect.objectContaining({ namespace: `profile-${region}` }) // Params check
      );
    });

    it('should return the data from battleNetService', async () => {
      const data = await apiClient.getGuildData(realm, guild, region);
      expect(data).toEqual(mockData);
    });

    it('should throw AppError if internal fetch fails', async () => {
      const error = new Error('API Error');
      // Use mockImplementation to explicitly throw the error asynchronously
      // Make the underlying GET call fail
      // Mock the underlying GET call to fail
      doAxiosGetSpy.mockRejectedValue(error);

      // Use .rejects matcher and check properties
      await expect(apiClient.getGuildData(realm, guild, region)).rejects.toThrow(AppError);
      await expect(apiClient.getGuildData(realm, guild, region)).rejects.toMatchObject({
          message: `Failed to fetch guild data: ${error.message}`,
          code: 'BATTLE_NET_API_ERROR',
          status: 500,
          details: { realmSlug: realm, guildNameSlug: guild, region }
       });
    });
    
  }); // <-- Close describe('getGuildData', ...)
  

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
        // Reset mock implementation for getGuildRoster before each test
        // Mock the underlying GET call
        doAxiosGetSpy.mockResolvedValue(mockData);
      });

      it('should call ensureClientToken', async () => {
        await apiClient.getGuildRoster(region, realm, guild);
        expect(apiClient.ensureClientToken).toHaveBeenCalledTimes(1);
      });

      it('should call battleNetService.getGuildRoster with correct parameters', async () => {
        await apiClient.getGuildRoster(region, realm, guild);
        // Check if the GET method was called (indirectly via _fetchGuildRoster)
        expect(doAxiosGetSpy).toHaveBeenCalledWith(
          expect.stringContaining(`/data/wow/guild/${realm}/${guild}/roster`), // URL check
          'fake-token', // Token check
          expect.objectContaining({ namespace: `profile-${region}` }) // Params check
        );
      });

      it('should return the data from battleNetService', async () => {
        const data = await apiClient.getGuildRoster(region, realm, guild);
        expect(data).toEqual(mockData);
      });

      it('should throw AppError if internal fetch fails', async () => {
        const error = new Error('Roster API Error');
        // Use mockImplementation to explicitly throw the error asynchronously
        // Make the underlying GET call fail
        // Mock the underlying GET call to fail
        doAxiosGetSpy.mockRejectedValue(error);

        // Use .rejects matcher and check properties
        await expect(apiClient.getGuildRoster(region, realm, guild)).rejects.toThrow(AppError);
        await expect(apiClient.getGuildRoster(region, realm, guild)).rejects.toMatchObject({
            message: `Failed to fetch guild roster: ${error.message}`,
            code: 'BATTLE_NET_API_ERROR',
            status: 500,
            details: { realmSlug: realm, guildNameSlug: guild, region }
         });
      });

   }); // <-- Close describe('getGuildRoster', ...)


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
        // Reset mock implementation before each test
        // Mock the underlying GET calls for profile, equipment, mythic, professions
        // For simplicity, assume all return successfully for this test setup
        // Profile call
        doAxiosGetSpy.mockResolvedValueOnce(mockData); // Profile is the first call in Promise.all
        // Equipment call
        doAxiosGetSpy.mockResolvedValueOnce(mockData.equipment); // Second call
        // Mythic Keystone call
        doAxiosGetSpy.mockResolvedValueOnce(mockData.mythicKeystone); // Third call
        // Professions call
        doAxiosGetSpy.mockResolvedValueOnce(mockData.professions); // Fourth call
      });

       it('should call ensureClientToken', async () => {
        await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(apiClient.ensureClientToken).toHaveBeenCalledTimes(1);
      });

       it('should call battleNetService.getEnhancedCharacterData with correct parameters', async () => {
        await apiClient.getEnhancedCharacterData(realm, charName, region);
        // Check if the GET method was called multiple times (indirectly via _fetch... methods)
        expect(doAxiosGetSpy).toHaveBeenCalledTimes(4);
        // Check specific calls (optional, can be verbose)
        expect(doAxiosGetSpy).toHaveBeenCalledWith(expect.stringContaining(`/profile/wow/character/${realm}/${charName}`), 'fake-token', expect.anything());
        expect(doAxiosGetSpy).toHaveBeenCalledWith(expect.stringContaining(`/profile/wow/character/${realm}/${charName}/equipment`), 'fake-token', expect.anything());
        expect(doAxiosGetSpy).toHaveBeenCalledWith(expect.stringContaining(`/profile/wow/character/${realm}/${charName}/mythic-keystone-profile`), 'fake-token', expect.anything());
        expect(doAxiosGetSpy).toHaveBeenCalledWith(expect.stringContaining(`/profile/wow/character/${realm}/${charName}/professions`), 'fake-token', expect.anything());
      });

       it('should return the data from battleNetService', async () => {
        const data = await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(data).toEqual(mockData);
      });

       it('should return null if internal profile fetch returns 404', async () => {
        // Mock the profile call to return null/undefined or throw 404 to simulate not found
        // Mock the profile fetch (_doAxiosGet called first) to reject with 404
        doAxiosGetSpy.mockReset();
        const error404 = { isAxiosError: true, response: { status: 404 }, config: { url: `profile/wow/character/${realm}/${charName}` } }; // Simulate Axios 404
        doAxiosGetSpy.mockRejectedValueOnce(error404);
        // Mock other calls to succeed (though they might not be reached if profile fails early)
        doAxiosGetSpy.mockResolvedValueOnce({}); // Equipment
        doAxiosGetSpy.mockResolvedValueOnce(null); // Mythic
        doAxiosGetSpy.mockResolvedValue({ primaries: [], secondaries: [] }); // Professions (ensure subsequent calls have a mock)
        const data = await apiClient.getEnhancedCharacterData(realm, charName, region);
        expect(data).toBeNull();
      });

       it('should throw AppError if an internal fetch throws an error (non-404)', async () => {
        const error = new Error('Character API Error');
         // Use mockImplementation to explicitly throw the error asynchronously
        // Make one of the underlying GET calls fail (e.g., equipment)
        doAxiosGetSpy.mockReset();
        doAxiosGetSpy.mockResolvedValueOnce(mockData); // Profile succeeds
        // Mock an internal GET call (e.g., equipment) to fail with a non-404 error
        doAxiosGetSpy.mockReset();
        doAxiosGetSpy.mockResolvedValueOnce(mockData); // Profile succeeds
        doAxiosGetSpy.mockRejectedValueOnce(error); // Equipment fails
        doAxiosGetSpy.mockResolvedValueOnce(null); // Mythic
        doAxiosGetSpy.mockResolvedValueOnce({ primaries: [], secondaries: [] }); // Professions

        // Use .rejects matcher and check properties
        await expect(apiClient.getEnhancedCharacterData(realm, charName, region)).rejects.toThrow(AppError);
        await expect(apiClient.getEnhancedCharacterData(realm, charName, region)).rejects.toMatchObject({
            message: `Failed to fetch character data: ${error.message}`,
            code: 'BATTLE_NET_API_ERROR',
            status: 500,
            details: { realmSlug: realm, characterNameLower: charName, region }
         });
      });

   }); // <-- Close describe('getEnhancedCharacterData', ...)

}); // <-- Close describe('BattleNetApiClient', ...)