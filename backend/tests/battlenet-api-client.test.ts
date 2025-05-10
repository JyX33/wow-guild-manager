// backend/tests/battlenet-api-client.test.ts
import { BattleNetApiClient } from '../src/services/battlenet-api.client';
import { HttpClient } from '../src/types/battlenet-api.types';
import { AppError } from '../src/utils/error-handler';
import { ErrorCode } from '../../shared/types/error';

// Mock config
jest.mock('../src/config/index', () => ({
  __esModule: true,
  default: {
    battlenet: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://test.com/callback',
      scopes: ['wow.profile'],
      regions: {
        eu: {
          apiBaseUrl: 'https://eu.api.blizzard.com',
          authBaseUrl: 'https://eu.battle.net/oauth',
          userInfoUrl: 'https://eu.battle.net/oauth/userinfo',
        },
      },
    },
  },
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Create a mock HTTP client
class MockHttpClient implements HttpClient {
  get = jest.fn();
  post = jest.fn();
}

describe('BattleNetApiClient', () => {
  let apiClient: BattleNetApiClient;
  let httpClient: MockHttpClient;

  beforeEach(() => {
    httpClient = new MockHttpClient();
    apiClient = new BattleNetApiClient(httpClient);
    jest.clearAllMocks();

    // Mock the token handling method to return a fake token
    jest.spyOn(apiClient as any, 'ensureClientToken').mockResolvedValue('fake-token');
    
    // Mock limiter's schedule method to simply run the callback function
    jest.spyOn(apiClient as any, 'scheduleWithRetry').mockImplementation(
      function(this: any, ...args: any[]): Promise<any> {
        const taskFn = args[1];
        return taskFn();
      }
    );
  });

  describe('getGuildData', () => {
    const validGuildResponse = {
      _links: { self: { href: 'https://eu.api.blizzard.com/data/wow/guild/test-realm/test-guild' } },
      id: 12345,
      name: 'Test Guild',
      faction: { type: 'ALLIANCE', name: 'Alliance' },
      achievement_points: 1000,
      member_count: 50,
      realm: { id: 1234, name: 'Test Realm', slug: 'test-realm' },
      created_timestamp: 1546300800000,
      roster_url: 'https://eu.api.blizzard.com/data/wow/guild/test-realm/test-guild/roster',
    };

    it('should fetch guild data successfully', async () => {
      // Setup the mock response
      httpClient.get.mockResolvedValueOnce(validGuildResponse);

      // Call the method
      const result = await apiClient.getGuildData('test-realm', 'test-guild', 'eu');

      // Verify the HTTP client was called correctly
      expect(httpClient.get).toHaveBeenCalledWith(
        'https://eu.api.blizzard.com/data/wow/guild/test-realm/test-guild',
        { namespace: 'profile-eu', locale: 'en_US' },
        { Authorization: 'Bearer fake-token' }
      );

      // Verify the result is correct
      expect(result).toEqual(validGuildResponse);
    });

    it('should handle 404 errors for non-existent guilds', async () => {
      // Create a 404 error
      const error: any = new Error('Not Found');
      error.response = { status: 404 };
      httpClient.get.mockRejectedValueOnce(error);

      // Call the method and expect it to throw
      try {
        await apiClient.getGuildData('test-realm', 'nonexistent-guild', 'eu');
        fail('Should have thrown an error');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        const appError = e as AppError;
        expect(appError.status).toBe(404);
        expect(appError.code).toBe(ErrorCode.NOT_FOUND);
        expect(appError.message).toContain('Failed to fetch guild');
        expect(appError.details).toBeDefined();
        expect(appError.details?.type).toBe('external_api');
        expect((appError.details as any)?.provider).toBe('battle.net');
      }
    });

    it('should handle 401 errors for invalid tokens', async () => {
      // Create a 401 error
      const error: any = new Error('Unauthorized');
      error.response = { status: 401 };
      httpClient.get.mockRejectedValueOnce(error);

      // Call the method and expect it to throw
      try {
        await apiClient.getGuildData('test-realm', 'test-guild', 'eu');
        fail('Should have thrown an error');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        const appError = e as AppError;
        expect(appError.status).toBe(401);
        expect(appError.code).toBe(ErrorCode.UNAUTHORIZED);
      }
    });

    it('should reject invalid response structures', async () => {
      // Setup an invalid response (missing required fields)
      const invalidResponse = {
        _links: { self: { href: 'https://eu.api.blizzard.com/data/wow/guild/test-realm/test-guild' } },
        // Missing id, name, etc.
      };

      httpClient.get.mockResolvedValueOnce(invalidResponse);

      // Call the method and expect it to throw
      try {
        await apiClient.getGuildData('test-realm', 'test-guild', 'eu');
        fail('Should have thrown an error');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        const appError = e as AppError;
        expect(appError.status).toBe(500);
        expect(appError.code).toBe(ErrorCode.EXTERNAL_API_ERROR);
        expect(appError.message).toContain('Invalid API response structure');
      }
    });
  });

  describe('getGuildRoster', () => {
    const validRosterResponse = {
      _links: { self: { href: 'https://eu.api.blizzard.com/data/wow/guild/test-realm/test-guild/roster' } },
      guild: {
        id: 12345,
        name: 'Test Guild',
        faction: { type: 'ALLIANCE', name: 'Alliance' },
        realm: { id: 1234, slug: 'test-realm', name: 'Test Realm' },
      },
      members: [
        {
          character: {
            id: 54321,
            name: 'TestChar',
            level: 60,
            playable_class: { id: 1, name: 'Warrior', slug: 'warrior' },
            playable_race: { id: 1, name: 'Human', slug: 'human' },
            realm: { id: 1234, slug: 'test-realm', name: 'Test Realm' },
          },
          rank: 0,
        },
      ],
    };

    it('should fetch guild roster successfully', async () => {
      // Setup the mock response
      httpClient.get.mockResolvedValueOnce(validRosterResponse);

      // Call the method
      const result = await apiClient.getGuildRoster('eu', 'test-realm', 'test-guild');

      // Verify the HTTP client was called correctly
      expect(httpClient.get).toHaveBeenCalledWith(
        'https://eu.api.blizzard.com/data/wow/guild/test-realm/test-guild/roster',
        { namespace: 'profile-eu', locale: 'en_US' },
        { Authorization: 'Bearer fake-token' }
      );

      // Verify the result is correct
      expect(result).toEqual(validRosterResponse);
    });
  });

  describe('getUserInfo', () => {
    const validUserInfoResponse = {
      sub: '1234567890',
      id: 12345,
      battletag: 'TestUser#1234',
    };

    it('should fetch user info successfully', async () => {
      // Setup the mock response
      httpClient.get.mockResolvedValueOnce(validUserInfoResponse);

      // Call the method
      const result = await apiClient.getUserInfo('eu', 'user-access-token');

      // Verify the HTTP client was called correctly
      expect(httpClient.get).toHaveBeenCalledWith(
        'https://eu.battle.net/oauth/userinfo',
        {},
        { Authorization: 'Bearer user-access-token' }
      );

      // Verify the result is correct
      expect(result).toEqual(validUserInfoResponse);
    });
  });

  describe('getAccessToken', () => {
    const validTokenResponse = {
      access_token: 'new-access-token',
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: 'refresh-token',
    };

    it('should exchange authorization code for token successfully', async () => {
      // Setup the mock response
      httpClient.post.mockResolvedValueOnce(validTokenResponse);

      // Call the method
      const result = await apiClient.getAccessToken('eu', 'auth-code', 'https://test.com/callback');

      // Verify the HTTP client was called correctly
      expect(httpClient.post).toHaveBeenCalledWith(
        'https://eu.battle.net/oauth/token',
        expect.any(URLSearchParams),
        { username: 'test-client-id', password: 'test-client-secret' },
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );

      // Verify the result is correct
      expect(result).toEqual(validTokenResponse);
    });

    it('should validate token response structure', async () => {
      // Setup an invalid response
      const invalidResponse = {
        // Missing access_token and expires_in
        token_type: 'bearer',
      };

      httpClient.post.mockResolvedValueOnce(invalidResponse);

      // Call the method and expect it to throw
      try {
        await apiClient.getAccessToken('eu', 'auth-code', 'https://test.com/callback');
        fail('Should have thrown an error');
      } catch (e: any) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.message).toContain('Invalid API response structure');
      }
    });
  });

  describe('getEnhancedCharacterData', () => {
    const validCharacterResponse = {
      _links: { self: { href: 'https://eu.api.blizzard.com/profile/wow/character/test-realm/test-char' } },
      id: 123456,
      name: 'TestChar',
      gender: { type: 'MALE', name: 'Male' },
      level: 60,
      equipped_item_level: 275,
      achievement_points: 5000,
      faction: { type: 'ALLIANCE', name: 'Alliance' },
      race: { id: 1, name: 'Human', slug: 'human' },
      character_class: { id: 1, name: 'Warrior', slug: 'warrior' },
      active_spec: { id: 71, name: 'Arms', slug: 'arms' },
      realm: { id: 1234, name: 'Test Realm', slug: 'test-realm' },
      last_login_timestamp: 1651234567000,
    };

    const validEquipmentResponse = {
      _links: { self: { href: 'https://eu.api.blizzard.com/profile/wow/character/test-realm/test-char/equipment' } },
      character: {
        id: 123456,
        name: 'TestChar',
        realm: { id: 1234, slug: 'test-realm', name: 'Test Realm' },
      },
      equipped_items: [
        {
          slot: { type: 'HEAD', name: 'Head' },
          item: { id: 12345, name: 'Epic Helmet' },
          quality: { type: 'EPIC', name: 'Epic' },
          level: { value: 278 },
        },
      ],
    };

    const validMythicKeystoneResponse = {
      _links: { self: { href: 'https://eu.api.blizzard.com/profile/wow/character/test-realm/test-char/mythic-keystone-profile' } },
      current_period: {
        period: { id: 123 },
        best_runs: [{
          completed_timestamp: 1651234567000,
          duration: 1800000,
          keystone_level: 15,
          members: [{
            character: {
              id: 123456,
              name: 'TestChar',
              realm: { id: 1234, slug: 'test-realm', name: 'Test Realm' },
            },
            specialization: { id: 71, name: 'Arms' },
            race: { id: 1, name: 'Human' },
            equipped_item_level: 275,
          }],
          dungeon: { id: 123, name: 'Castle Nathria' },
          is_completed_within_time: true,
        }],
      },
      character: {
        id: 123456,
        name: 'TestChar',
        realm: { id: 1234, slug: 'test-realm', name: 'Test Realm' },
      },
    };

    const validProfessionsResponse = {
      _links: { self: { href: 'https://eu.api.blizzard.com/profile/wow/character/test-realm/test-char/professions' } },
      character: {
        id: 123456,
        name: 'TestChar',
        realm: { id: 1234, slug: 'test-realm', name: 'Test Realm' },
      },
      primaries: [{
        profession: { id: 164, name: 'Blacksmithing', slug: 'blacksmithing' },
        tiers: [{
          tier: { id: 2437, name: 'Dragonflight Blacksmithing' },
          skill_points: 100,
          max_skill_points: 100,
          known_recipes: [],
        }],
      }],
      secondaries: [],
    };

    it('should fetch and combine character data successfully', async () => {
      // Setup the mock responses
      httpClient.get.mockResolvedValueOnce(validCharacterResponse); // character profile
      httpClient.get.mockResolvedValueOnce(validEquipmentResponse); // equipment
      httpClient.get.mockResolvedValueOnce(validMythicKeystoneResponse); // mythic keystone
      httpClient.get.mockResolvedValueOnce(validProfessionsResponse); // professions

      // Call the method
      const result = await apiClient.getEnhancedCharacterData('test-realm', 'test-char', 'eu');

      // Check that the correct endpoints were called
      expect(httpClient.get).toHaveBeenCalledTimes(4);
      expect(httpClient.get).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/profile/wow/character/test-realm/test-char'),
        expect.any(Object),
        expect.any(Object)
      );
      expect(httpClient.get).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/profile/wow/character/test-realm/test-char/equipment'),
        expect.any(Object),
        expect.any(Object)
      );

      // Verify the result has the combined structure
      expect(result).toBeDefined();
      expect(result?.id).toBe(123456);
      expect(result?.name).toBe('TestChar');
      expect(result?.equipment).toBeDefined();
      expect(result?.equipment.equipped_items.length).toBe(1);
      expect(result?.itemLevel).toBe(275);
      expect(result?.mythicKeystone).toBeDefined();
      expect(result?.professions).toBeDefined();
    });

    it('should return null if character profile fetch returns 404', async () => {
      // Create a 404 error
      const error: any = new Error('Not Found');
      error.response = { status: 404 };
      httpClient.get.mockRejectedValueOnce(error); // First call fails with 404

      // Call the method
      const result = await apiClient.getEnhancedCharacterData('test-realm', 'nonexistent-char', 'eu');

      // Verify result is null and no further calls were made
      expect(result).toBeNull();
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if equipment fetch fails', async () => {
      // Setup success and failure responses
      httpClient.get.mockResolvedValueOnce(validCharacterResponse); // character profile
      httpClient.get.mockRejectedValueOnce(new Error('Equipment data unavailable')); // equipment fails

      // Call the method and expect it to throw
      try {
        await apiClient.getEnhancedCharacterData('test-realm', 'test-char', 'eu');
        fail('Should have thrown an error');
      } catch (e: any) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.message).toContain('Equipment data unavailable');
      }

      // Verify the API was called for both requests
      expect(httpClient.get).toHaveBeenCalledTimes(2);
    });
  });
});