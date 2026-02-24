import { http } from '@/modules/shared/api/http';
import { setCookie, deleteCookie } from 'cookies-next';
import { LoginResponse } from '../types';
import { LoginInput } from '../validations/login.schema';

export const authService = {
  login: async (data: LoginInput): Promise<LoginResponse> => {
    const response = await http.post<LoginResponse>('/auth/login', data);

    if (response.access_token) {
      setCookie('access_token', response.access_token, { maxAge: 60 * 60 * 24 * 7 });
    }

    return response;
  },

  logout: () => {
    deleteCookie('access_token');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
};
