import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { getCookie, deleteCookie } from 'cookies-next';

export interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
  message?: string;
}

export interface HttpClientOptions {
  publicApiUrl: string;
  internalApiUrl: string;
  accessCookieName: string;
  refreshPath?: string;
  loginPath: string;
  onUnauthorized?: () => Promise<boolean> | boolean;
}

export function createHttpClient(options: HttpClientOptions) {
  const instance = axios.create({
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let refreshInFlight: Promise<boolean> | null = null;

  async function runRefresh() {
    if (!options.refreshPath) {
      return false;
    }

    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          await instance.post(options.refreshPath);
          return true;
        } catch {
          return false;
        } finally {
          refreshInFlight = null;
        }
      })();
    }

    return refreshInFlight;
  }

  instance.interceptors.request.use(async (config) => {
    const isClient = typeof window !== 'undefined';
    config.baseURL = isClient ? options.publicApiUrl : options.internalApiUrl;

    const token = getCookie(options.accessCookieName);

    if (token && typeof token === 'string') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiEnvelope<unknown>>) => {
      const status = error.response?.status;
      const originalRequest = error.config as AxiosRequestConfig & {
        __retried?: boolean;
      };

      if (status === 401 && !originalRequest?.__retried) {
        originalRequest.__retried = true;

        const refreshed =
          (await options.onUnauthorized?.()) ?? (await runRefresh());

        if (refreshed && originalRequest) {
          return instance.request(originalRequest);
        }

        if (typeof window !== 'undefined') {
          deleteCookie(options.accessCookieName);
          window.location.href = options.loginPath;
        }
      }

      return Promise.reject(error);
    },
  );

  return {
    async get<T>(url: string, config?: AxiosRequestConfig) {
      const response = await instance.get<ApiEnvelope<T>>(url, config);
      return response.data.data;
    },
    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
      const response = await instance.post<ApiEnvelope<T>>(url, data, config);
      return response.data.data;
    },
    async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
      const response = await instance.patch<ApiEnvelope<T>>(url, data, config);
      return response.data.data;
    },
    async delete<T>(url: string, config?: AxiosRequestConfig) {
      const response = await instance.delete<ApiEnvelope<T>>(url, config);
      return response.data.data;
    },
  };
}
