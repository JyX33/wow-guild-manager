// backend/src/services/http-client.ts
import axios, { AxiosBasicCredentials, AxiosError, AxiosRequestConfig } from "axios";
import logger from "../utils/logger.js";
import { HttpClient } from "../types/battlenet-api.types.js";

/**
 * Axios implementation of the HttpClient interface
 */
export class AxiosHttpClient implements HttpClient {
  /**
   * Performs a GET request using Axios
   * @param url The URL to fetch
   * @param params Optional query parameters
   * @param headers Optional request headers
   * @returns The response data
   */
  async get<T>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    try {
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      logger.debug(
        { requestId, url, method: "GET", params },
        `[HttpClient] Sending GET request to ${url}`
      );
      
      const config: AxiosRequestConfig = {
        params,
        headers: {
          "Accept-Encoding": "gzip,deflate,compress",
          ...headers,
        },
        timeout: 15000,
      };
      
      const response = await axios.get<T>(url, config);
      
      logger.debug(
        { requestId, url, method: "GET", status: response.status },
        `[HttpClient] Received response from ${url}`
      );
      
      return response.data;
    } catch (error) {
      this.logError(error as Error, "GET", url);
      throw error;
    }
  }

  /**
   * Performs a POST request using Axios
   * @param url The URL to post to
   * @param data The data to send
   * @param auth Optional basic auth credentials
   * @param headers Optional request headers
   * @returns The response data
   */
  async post<T>(
    url: string,
    data: any,
    auth?: { username: string; password?: string | undefined },
    headers?: Record<string, string>
  ): Promise<T> {
    try {
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      logger.debug(
        { requestId, url, method: "POST" },
        `[HttpClient] Sending POST request to ${url}`
      );
      
      const config: AxiosRequestConfig = {
        auth: auth as AxiosBasicCredentials | undefined,
        headers: {
          ...headers,
        },
        timeout: 15000,
      };
      
      const response = await axios.post<T>(url, data, config);
      
      logger.debug(
        { requestId, url, method: "POST", status: response.status },
        `[HttpClient] Received response from ${url}`
      );
      
      return response.data;
    } catch (error) {
      this.logError(error as Error, "POST", url);
      throw error;
    }
  }

  /**
   * Logs HTTP errors in a standardized format
   * @param error The error to log
   * @param method The HTTP method used
   * @param url The URL requested
   */
  private logError(error: Error, method: string, url: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error({
        err: {
          message: axiosError.message,
          code: axiosError.code,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          data: axiosError.response?.data,
        },
      }, `[HttpClient] ${method} request to ${url} failed: ${axiosError.message}`);
    } else {
      logger.error(
        { err: error },
        `[HttpClient] ${method} request to ${url} failed: ${error.message}`
      );
    }
  }
}