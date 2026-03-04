import { http } from '@/modules/shared/api/http';
import { setCookie, deleteCookie } from 'cookies-next';
import { LoginResponse } from '../types';
import { LoginInput } from '../validations/login.schema';

export const authService = {
  login: async (data: LoginInput): Promise<LoginResponse> => {
    const { rememberMe = false, ...credentials } = data;
    const response = await http.post<LoginResponse>('/auth/login', credentials);

    if (response.access_token) {
      setCookie('access_token', response.access_token, rememberMe
        ? { maxAge: 60 * 60 * 24 * 7 }
        : undefined);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:state-change'));
      }
    }

    return response;
  },

  logout: () => {
    deleteCookie('access_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:state-change'));
      window.location.href = '/login';
    }
  },
};
