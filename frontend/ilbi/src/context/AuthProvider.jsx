import { localStore, sessionStore } from '../utils/brandStorage.js';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AuthContext from './authContext.js';
import { getAccessToken, getRefreshToken, refreshAccessToken, setTokens, clearTokens, parseJwt, isTokenExpired, authApi, getAuthenticationGeneration, invalidateAuthenticationRequests } from '../api/client';
import { beginLoginSupportSession } from '../api/support';
import { captureLegacyDraftOwner } from '../utils/accountDrafts';
import { localAccountLogin, prepareDesktopAccount } from '../utils/desktopSession';

export function AuthProvider({ children }) {
  const { pathname } = useLocation();
  const loginPage = pathname === '/login';
  const [token, setToken] = useState(() => {
    const access = getAccessToken();
    let cached = null;
    try { cached = JSON.parse(localStore.getItem('ilbi_user') || sessionStore.getItem('ilbi_user') || 'null'); } catch { /* Keep unidentified drafts archived. */ }
    captureLegacyDraftOwner(parseJwt(access)?.user_id, cached);
    return access;
  });
  // Browser storage is a cache, never proof that a session or role is valid.
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getAccessToken() || getRefreshToken()));
  const [busy, setBusy] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [sessionId, setSessionId] = useState(getAuthenticationGeneration);
  const profileRequest = useRef(0);
  const observedTokens = useRef([getAccessToken(), getRefreshToken()]);

  const logout = useCallback(() => {
    const oldAccess = getAccessToken();
    if (oldAccess) void window.ilbiDesktop?.lockSession?.(oldAccess).catch(() => {});
    profileRequest.current += 1;
    clearTokens();
    beginLoginSupportSession();
    observedTokens.current = [null, null];
    setToken(null);
    setUser(null);
    setChecking(false);
    setSessionError('');
    setSessionId(getAuthenticationGeneration());
  }, []);

  const refreshProfile = useCallback(async () => {
    const sequence = ++profileRequest.current;
    const generation = getAuthenticationGeneration();
    const current = () => sequence === profileRequest.current && generation === getAuthenticationGeneration();
    if (!getAccessToken() && !getRefreshToken()) {
      setToken(null);
      setUser(null);
      setChecking(false);
      setSessionError('');
      return;
    }
    try {
      if (isTokenExpired(getAccessToken())) await refreshAccessToken();
      if (!current()) return;
      const requestedUserId = parseJwt(getAccessToken())?.user_id;
      const profile = await authApi.getProfile();
      if (!current()) return;
      if (!requestedUserId || String(profile.id) !== String(requestedUserId)) throw new Error('Profil tasdiqlanmadi.');
      if(window.ilbiDesktop?.activateSession)await window.ilbiDesktop.activateSession(getAccessToken());
      if(!current())return;
      setUser(profile);
      setToken(getAccessToken());
      setSessionError('');
      const remember = Boolean(localStore.getItem('ilbi_access_token'));
      (remember ? localStore : sessionStore).setItem('ilbi_user', JSON.stringify(profile));
      (remember ? sessionStore : localStore).removeItem('ilbi_user');
      observedTokens.current = [getAccessToken(), getRefreshToken()];
      return profile;
    } catch (error) {
      if (!current()) return;
      if (error.status === 401) logout();
      else {
        setUser(null);
        setSessionError('Sessiyani tekshirib bo‘lmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.');
      }
    } finally {
      if (current()) setChecking(false);
    }
  }, [logout]);

  // An explicit visit to /login starts a new login; drafts and login name survive.
  useLayoutEffect(() => { if (loginPage) logout(); }, [loginPage, logout]);

  useEffect(() => {
    const updateToken = event => {
      observedTokens.current = [getAccessToken(), getRefreshToken()];
      setToken(event.detail);
      if(event.detail)void window.ilbiDesktop?.activateSession?.(event.detail).catch(()=>{});
    };
    const handleProfileRefresh = () => { void refreshProfile(); };
    const handleStorage = event => {
      if (event.key && !/^(ilbi|inventra)_(access_token|refresh_token|user)$/.test(event.key)) return;
      const next = [getAccessToken(), getRefreshToken()];
      if (next.every((value, index) => value === observedTokens.current[index])) return;
      invalidateAuthenticationRequests();
      observedTokens.current = next;
      setUser(null);
      setToken(next[0]);
      setSessionId(getAuthenticationGeneration());
      setChecking(Boolean(next[0] || next[1]));
      if (window.location.pathname === '/login') {
        setToken(null);
        setChecking(false);
      } else void refreshProfile();
    };
    window.addEventListener('auth:token', updateToken);
    window.addEventListener('auth:logout', logout);
    window.addEventListener('profile:refresh', handleProfileRefresh);
    window.addEventListener('storage', handleStorage);
    void refreshProfile();
    return () => {
      profileRequest.current += 1;
      window.removeEventListener('auth:token', updateToken);
      window.removeEventListener('auth:logout', logout);
      window.removeEventListener('profile:refresh', handleProfileRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [logout, refreshProfile]);

  const completeLogin = (username, response, remember) => {
    setTokens(response.access, response.refresh, remember);
    observedTokens.current = [getAccessToken(), getRefreshToken()];
    setToken(response.access);
    setUser(null);
    setSessionId(getAuthenticationGeneration());
    setSessionError('');
    setChecking(true);
    void refreshProfile();
    return { ...parseJwt(response.access), username };
  };

  const loginStep1 = async (username, password, remember = true) => {
    setBusy(true);
    const generation=getAuthenticationGeneration();
    try {
      const local = await localAccountLogin(username, password);
      if(generation!==getAuthenticationGeneration())throw Error('Kirish bekor qilindi. Qayta urinib ko‘ring.');
      if (local) {
        completeLogin(username, local, remember);
        return {...local,local_login:true};
      }
      const response = await authApi.adminLogin(username, password);
      if (response.demo_login === true && response.access && response.refresh) completeLogin(username, response, remember);
      return response;
    } finally { setBusy(false); }
  };

  const loginStep2 = async (username, loginTicket, code, remember = true, password) => {
    setBusy(true);
    const generation=getAuthenticationGeneration();
    try {
      const cloud = await authApi.verifyOtp(loginTicket, code);
      const response = await prepareDesktopAccount(username, password, cloud);
      if(generation!==getAuthenticationGeneration())throw Error('Kirish bekor qilindi. Qayta urinib ko‘ring.');
      return {...completeLogin(username,response,remember),desktopNotice:response.desktopNotice};
    }
    finally { setBusy(false); }
  };

  const acceptTerms = async () => {
    setBusy(true);
    try {
      const response = await authApi.acceptTerms();
      const updatedUser = response.user || { ...user, terms_accepted: true };
      setUser(updatedUser);
      (localStore.getItem('ilbi_access_token') ? localStore : sessionStore).setItem('ilbi_user', JSON.stringify(updatedUser));
      return updatedUser;
    } finally { setBusy(false); }
  };

  const visibleUser = loginPage ? null : user;
  const role = visibleUser?.role || null;
  return (
    <AuthContext.Provider value={{
      token: loginPage ? null : token,
      user: visibleUser,
      role,
      isOwner: role === 'owner',
      isStaff: role === 'staff',
      isAdmin: role === 'platform_admin',
      isAuthenticated: Boolean(!loginPage && token && visibleUser),
      hasAcceptedTerms: Boolean(visibleUser?.terms_accepted),
      loading: checking || busy,
      sessionError,
      sessionId,
      retrySession: () => { setChecking(true); setSessionError(''); void refreshProfile(); },
      loginStep1, loginStep2, logout, acceptTerms, setUser, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
