import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getCookie } from 'cookies-next';
import { toast } from 'sonner';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1';
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:3000/api/v1';

interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

class HttpClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor
    this.instance.interceptors.request.use(async (config) => {
      const isClient = typeof window !== 'undefined';

      // Dinamik Base URL (SSR vs Client)
      config.baseURL = isClient ? PUBLIC_API_URL : INTERNAL_API_URL;

      let token: string | undefined;
      if (isClient) {
        token = getCookie('access_token') as string;
      } else {
        try {
          const { cookies } = await import('next/headers');
          const cookieStore = await cookies();
          token = cookieStore.get('access_token')?.value;
        } catch (e) {
          console.error('[SSR HTTP] Failed to get cookies:', e);
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const unauthorizedStatuses = [401];

    // Response Interceptor - Merkezi Error Handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        const isClient = typeof window !== 'undefined';
        const message = error.response?.data?.message || 'Bir hata oluştu.';
        const status = error.response?.status;

        if (!isClient) {
          console.error(`[API Error SSR] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
        }

        if (status && unauthorizedStatuses.includes(status)) {
          if (isClient) {
            Promise.all([
              import('cookies-next'),
              import('sonner')
            ]).then(([{ deleteCookie }, { toast }]) => {
              deleteCookie('access_token');
              window.location.href = '/login';
              toast.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.');
            });
          }
        } else if (isClient) {
          const skipToast = (error.config as any)?.skipToast;
          if (!skipToast) {
            import('sonner').then(({ toast }) => {
              toast.error(Array.isArray(message) ? message.join(', ') : message);
            });
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<BackendResponse<T>>(url, config);
    return response.data.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<BackendResponse<T>>(url, data, config);
    return response.data.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<BackendResponse<T>>(url, data, config);
    return response.data.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<BackendResponse<T>>(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<BackendResponse<T>>(url, config);
    return response.data.data;
  }

  async upload<T>(url: string, file: File, fieldName: string = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    const isClient = typeof window !== 'undefined';
    const baseURL = isClient ? PUBLIC_API_URL : INTERNAL_API_URL;
    
    let token: string | undefined;
    if (isClient) {
      token = getCookie('access_token') as string;
    } else {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        token = cookieStore.get('access_token')?.value;
      } catch (e) {
        console.error('[SSR HTTP] Failed to get cookies:', e);
      }
    }

    const response = await this.instance.post<BackendResponse<T>>(
      `${baseURL}${url}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data.data;
  }
}

export const http = new HttpClient();
