import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccessToken, getRefreshToken, refreshAccessToken, setTokens, clearTokens, parseJwt, isTokenExpired, authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const current = getAccessToken();
    if (!current || (isTokenExpired(current) && isTokenExpired(getRefreshToken()))) {
      return null;
    }
    return current;
  });

  const [user, setUser] = useState(() => {
    const currentToken = getAccessToken();
    if (!currentToken || (isTokenExpired(currentToken) && isTokenExpired(getRefreshToken()))) {
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

  const [loading, setLoading] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    const updateToken = (event) => setToken(event.detail);
    window.addEventListener('auth:token', updateToken);
    const current = getAccessToken();
    if (current && isTokenExpired(current)) {
      refreshAccessToken().then(setToken).catch(() => {}).finally(() => setLoading(false));
    } else if (!current) {
      setLoading(false);
    }
    return () => window.removeEventListener('auth:token', updateToken);
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
    const requestedUserId = parseJwt(getAccessToken())?.user_id;
    try {
      const profile = await authApi.getProfile();
      if (String(parseJwt(getAccessToken())?.user_id) !== String(requestedUserId) || String(profile.id) !== String(requestedUserId)) return;
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
      if (err.status === 401 && String(parseJwt(getAccessToken())?.user_id) === String(requestedUserId)) {
        clearTokens();
        setToken(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile().finally(() => setLoading(false));
    }
  }, [token]);

  useEffect(() => {
    const handleProfileRefresh = () => refreshProfile();
    window.addEventListener('profile:refresh', handleProfileRefresh);
    return () => window.removeEventListener('profile:refresh', handleProfileRefresh);
  }, []);

  const completeLogin = (username, res, remember) => {
    setTokens(res.access, res.refresh, remember);
    setToken(res.access);
    const userData = { ...parseJwt(res.access), username };
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
  };

  const loginStep1 = async (username, password, remember = true) => {
    setLoading(true);
    try {
      const res = await authApi.adminLogin(username, password);
      if (res.demo_login === true && res.access && res.refresh) {
        completeLogin(username, res, remember);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const loginStep2 = async (username, loginTicket, code, remember = true) => {
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(loginTicket, code);
      return completeLogin(username, res, remember);
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
