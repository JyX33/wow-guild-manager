// backend/tests/http-client.test.ts
import axios from 'axios';
import { AxiosHttpClient } from '../src/services/http-client';

// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('AxiosHttpClient', () => {
  let httpClient: AxiosHttpClient;

  beforeEach(() => {
    httpClient = new AxiosHttpClient();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should make a GET request and return the data', async () => {
      // Mock the axios get response
      const mockData = { data: 'test-data' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockData, status: 200 });

      // Call the method
      const result = await httpClient.get<typeof mockData>('https://api.test.com/resource', { param: 'value' });

      // Verify axios was called with the right parameters
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.test.com/resource', {
        params: { param: 'value' },
        headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
        timeout: 15000,
      });

      // Verify the result is correct
      expect(result).toEqual(mockData);
    });

    it('should handle errors from the GET request', async () => {
      // Mock an axios error
      const axiosError = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      // Call the method and expect it to throw
      await expect(httpClient.get('https://api.test.com/resource')).rejects.toThrow('Network error');
    });

    it('should include provided headers in the request', async () => {
      // Mock the axios get response
      const mockData = { data: 'test-data' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockData, status: 200 });

      // Custom headers
      const customHeaders = {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value'
      };

      // Call the method
      await httpClient.get('https://api.test.com/resource', undefined, customHeaders);

      // Verify axios was called with the right headers
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.test.com/resource', {
        params: undefined,
        headers: {
          'Accept-Encoding': 'gzip,deflate,compress',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        },
        timeout: 15000,
      });
    });
  });

  describe('post', () => {
    it('should make a POST request and return the data', async () => {
      // Mock the axios post response
      const mockData = { success: true };
      mockedAxios.post.mockResolvedValueOnce({ data: mockData, status: 201 });

      // Request data
      const requestData = { name: 'test' };

      // Call the method
      const result = await httpClient.post<typeof mockData>(
        'https://api.test.com/resource',
        requestData
      );

      // Verify axios was called with the right parameters
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.test.com/resource',
        requestData,
        {
          auth: undefined,
          headers: {},
          timeout: 15000,
        }
      );

      // Verify the result is correct
      expect(result).toEqual(mockData);
    });

    it('should handle authentication in POST requests', async () => {
      // Mock the axios post response
      const mockData = { token: 'access-token' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockData, status: 200 });

      // Auth credentials
      const auth = { username: 'client-id', password: 'client-secret' };

      // Call the method
      await httpClient.post(
        'https://api.test.com/token',
        { grant_type: 'client_credentials' },
        auth,
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );

      // Verify axios was called with the right parameters
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.test.com/token',
        { grant_type: 'client_credentials' },
        {
          auth,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }
      );
    });

    it('should handle errors from the POST request', async () => {
      // Mock an axios error
      const axiosError = new Error('Bad request');
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      // Call the method and expect it to throw
      await expect(
        httpClient.post('https://api.test.com/resource', { test: true })
      ).rejects.toThrow('Bad request');
    });
  });
});