'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCookie, deleteCookie } from 'cookies-next';
import { jwtDecode } from 'jwt-decode';
import { User } from '../types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  restaurantId: string | null;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(() => {
    const token = getCookie('access_token');
    if (token && typeof token === 'string') {
      try {
        const decoded = jwtDecode<Record<string, unknown>>(token);

        // Token expiration check
        const exp = decoded.exp as number | undefined;
        const isExpired = exp ? exp * 1000 < Date.now() : false;

        if (isExpired) {
          setIsAuthenticated(false);
          setUser(null);
          deleteCookie('access_token');
          return;
        }

        setIsAuthenticated(true);

        // Backend'den gelen snake_case'i camelCase'e dönüştür
        const restaurantId = (decoded.restaurantId as string) || (decoded.restaurant_id as string) || null;

        setUser({
          id: decoded.sub as string,
          email: decoded.email as string,
          role: decoded.role as User['role'],
          restaurantId: restaurantId || undefined,
          first_name: decoded.first_name as string | undefined,
          last_name: decoded.last_name as string | undefined,
        });
      } catch (error) {
        console.error('AuthContext - Token decoding error:', error);
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    deleteCookie('access_token');
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('auth:state-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth:state-change', handleAuthChange);
    };
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    restaurantId: user?.restaurantId || null,
    logout,
    refreshAuth: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
