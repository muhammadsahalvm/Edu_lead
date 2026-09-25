import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/auth';
import { apiClient, formatApiError } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore & validate authenticated session against backend source of truth
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('edulead_access_token');
      const refreshToken = localStorage.getItem('edulead_refresh_token');

      // If no tokens exist, guarantee clean state
      if (!storedToken && !refreshToken) {
        localStorage.removeItem('edulead_access_token');
        localStorage.removeItem('edulead_refresh_token');
        localStorage.removeItem('edulead_user');
        delete apiClient.defaults.headers.common.Authorization;
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        // Query backend /api/v1/auth/me/ to verify active token and obtain true user profile
        // If storedToken is expired, apiClient interceptor automatically uses refreshToken
        const verifiedUser = await authService.getCurrentUser();
        const activeToken = localStorage.getItem('edulead_access_token');

        if (verifiedUser && activeToken) {
          localStorage.setItem('edulead_user', JSON.stringify(verifiedUser));
          apiClient.defaults.headers.common.Authorization = `Bearer ${activeToken}`;
          setToken(activeToken);
          setUser(verifiedUser);
        } else {
          throw new Error('Identity verification returned empty user profile.');
        }
      } catch (err) {
        console.warn('Session verification failed, purging stale auth state:', err);
        localStorage.removeItem('edulead_access_token');
        localStorage.removeItem('edulead_refresh_token');
        localStorage.removeItem('edulead_user');
        delete apiClient.defaults.headers.common.Authorization;
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to unauthorized event dispatched by Axios interceptor
    const handleUnauthorized = () => {
      localStorage.removeItem('edulead_access_token');
      localStorage.removeItem('edulead_refresh_token');
      localStorage.removeItem('edulead_user');
      delete apiClient.defaults.headers.common.Authorization;
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    // 1. Clear stale authentication state before attempting new login
    localStorage.removeItem('edulead_access_token');
    localStorage.removeItem('edulead_refresh_token');
    localStorage.removeItem('edulead_user');
    delete apiClient.defaults.headers.common.Authorization;
    setUser(null);
    setToken(null);

    try {
      // 2. Authenticate the new user against backend
      const data = await authService.login(username, password);

      // 3. Store the new access & refresh tokens
      localStorage.setItem('edulead_access_token', data.access);
      localStorage.setItem('edulead_refresh_token', data.refresh);
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;

      // 4. Store the corresponding user profile verified from backend response
      localStorage.setItem('edulead_user', JSON.stringify(data.user));

      // 5. Update React authentication state atomically
      setToken(data.access);
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      // Clean up any partial state on failure
      localStorage.removeItem('edulead_access_token');
      localStorage.removeItem('edulead_refresh_token');
      localStorage.removeItem('edulead_user');
      delete apiClient.defaults.headers.common.Authorization;
      setToken(null);
      setUser(null);

      const errorMsg = formatApiError(error);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('edulead_access_token');
    localStorage.removeItem('edulead_refresh_token');
    localStorage.removeItem('edulead_user');
    delete apiClient.defaults.headers.common.Authorization;
    setUser(null);
    setToken(null);
  }, []);

  const updateCurrentUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('edulead_user', JSON.stringify(updatedUser));
  };

  const toggleAvailability = async () => {
    if (!user) return;
    try {
      const updated = await authService.updateProfile({
        is_available_for_assignment: !user.is_available_for_assignment,
      });
      updateCurrentUser(updated);
      return { success: true, user: updated };
    } catch (error) {
      return { success: false, error: formatApiError(error) };
    }
  };

  const isManager = user?.role === 'MANAGER';
  const isCounsellor = user?.role === 'COUNSELLOR';
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        isManager,
        isCounsellor,
        login,
        logout,
        updateCurrentUser,
        toggleAvailability,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
