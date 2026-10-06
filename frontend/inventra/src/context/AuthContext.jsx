import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccessToken, setTokens, clearTokens, parseJwt, isTokenExpired, authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const current = getAccessToken();
    if (!current || isTokenExpired(current)) {
      return null;
    }
    return current;
  });

  const [user, setUser] = useState(() => {
    const currentToken = getAccessToken();
    if (!currentToken || isTokenExpired(currentToken)) {
      return null;
    }
    const saved = localStorage.getItem('inventra_user') || sessionStorage.getItem('inventra_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return parseJwt(currentToken);
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const current = getAccessToken();
    if (current && isTokenExpired(current)) {
      clearTokens();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
      clearTokens();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const refreshProfile = async () => {
    if (!getAccessToken()) return;
    try {
      const profile = await authApi.getProfile();
      setUser((prev) => {
        const merged = { ...prev, ...profile };
        if (localStorage.getItem('inventra_access_token')) {
          localStorage.setItem('inventra_user', JSON.stringify(merged));
        } else {
          sessionStorage.setItem('inventra_user', JSON.stringify(merged));
        }
        return merged;
      });
      return profile;
    } catch (err) {
      if (err.status === 401) {
        clearTokens();
        setToken(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token]);

  const loginStep1 = async (username, password) => {
    setLoading(true);
    try {
      const res = await authApi.adminLogin(username, password);
      return res; // { detail: 'Verification code sent.', phone_hint: '...' }
    } finally {
      setLoading(false);
    }
  };

  const loginStep2 = async (username, code, remember = true) => {
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(username, code);
      // res contains { access, refresh }
      setTokens(res.access, res.refresh, remember);
      setToken(res.access);
      const parsed = parseJwt(res.access);
      const userData = {
        ...parsed,
        username,
      };
      setUser(userData);
      if (remember) {
        localStorage.setItem('inventra_user', JSON.stringify(userData));
        sessionStorage.removeItem('inventra_user');
      } else {
        sessionStorage.setItem('inventra_user', JSON.stringify(userData));
        localStorage.removeItem('inventra_user');
      }
      refreshProfile();
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setToken(null);
    setUser(null);
  };

  const acceptTerms = async () => {
    setLoading(true);
    try {
      const res = await authApi.acceptTerms();
      const updatedUser = res.user || { ...user, terms_accepted: true };
      setUser(updatedUser);
      if (localStorage.getItem('inventra_access_token')) {
        localStorage.setItem('inventra_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('inventra_user', JSON.stringify(updatedUser));
      }
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const role = user?.role || null;
  const isOwner = role === 'owner';
  const isStaff = role === 'staff';
  const isAdmin = role === 'platform_admin';
  const isAuthenticated = Boolean(token && user);
  const hasAcceptedTerms = Boolean(user?.terms_accepted);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        isOwner,
        isStaff,
        isAdmin,
        isAuthenticated,
        hasAcceptedTerms,
        loading,
        loginStep1,
        loginStep2,
        logout,
        acceptTerms,
        setUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
