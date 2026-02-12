'use client';

import { useState, useEffect, useCallback } from 'react';
import { login as authLogin, logout as authLogout, checkStoredSession } from '@/lib/auth';
import type { LoginResult } from '@/lib/types';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cookies, setCookies] = useState<string>('');

  // Check for stored session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const { isValid, cookies: sessionCookies } = await checkStoredSession();
      setIsAuthenticated(isValid);
      if (sessionCookies) {
        setCookies(sessionCookies);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean = false): Promise<LoginResult> => {
      console.log('useAuth: login called');
      setIsLoading(true);
      try {
        console.log('useAuth: calling authLogin...');
        const result = await authLogin(username, password, rememberMe);
        console.log('useAuth: authLogin returned:', result.success ? 'success' : 'failure');

        if (result.success && result.cookies) {
          console.log('useAuth: setting authenticated state');
          setIsAuthenticated(true);
          setCookies(result.cookies);
        }

        console.log('useAuth: returning result');
        return result;
      } catch (error) {
        console.error('useAuth: login error:', error);
        throw error;
      } finally {
        console.log('useAuth: setting isLoading to false');
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authLogout();
      setIsAuthenticated(false);
      setCookies('');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    cookies,
    login,
    logout,
    checkSession,
  };
}
