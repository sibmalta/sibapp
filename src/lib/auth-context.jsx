// Auth Context — Real Supabase Auth via REST API (WebContainer compatible)
// Source of truth for authentication. No localStorage user storage.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Session storage key
const getStorageKey = () => `ew-auth-${SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'default'}`;

function getStoredSession() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeSession(session) {
  try {
    if (session) {
      localStorage.setItem(getStorageKey(), JSON.stringify(session));
    } else {
      localStorage.removeItem(getStorageKey());
    }
  } catch (e) { console.error('Failed to store session:', e); }
}

// Rate-limit cooldown tracker
function getCooldown(key) {
  try {
    const ts = localStorage.getItem(`sib_cooldown_${key}`);
    if (!ts) return 0;
    const remaining = parseInt(ts, 10) - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  } catch { return 0; }
}

function setCooldown(key, seconds) {
  try {
    localStorage.setItem(`sib_cooldown_${key}`, String(Date.now() + seconds * 1000));
  } catch {}
}

function getAppPath(path) {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return new URL(normalizedPath, window.location.origin + normalizedBase).toString();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const refreshTimerRef = useRef(null);

  // ── Helper: fetch user data with a token ──
  const fetchUser = async (accessToken) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    return res.json();
  };

  // ── Helper: refresh token ──
  const refreshSessionFn = useCallback(async (refreshToken) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user: data.user,
      };
    } catch {
      return null;
    }
  }, []);

  // ── Schedule automatic token refresh ──
  const scheduleRefresh = useCallback((expiresIn, refreshToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max((expiresIn - 60) * 1000, (expiresIn / 2) * 1000);
    refreshTimerRef.current = setTimeout(async () => {
      const result = await refreshSessionFn(refreshToken);
      if (result) {
        const newSession = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          user: result.user,
        };
        storeSession(newSession);
        setSession(newSession);
        setUser(result.user);
        scheduleRefresh(result.expires_in || 3600, result.refresh_token);
      } else {
        storeSession(null);
        setSession(null);
        setUser(null);
      }
    }, delay);
  }, [refreshSessionFn]);

  const applySession = useCallback((sessionData, { isRecovery = false } = {}) => {
    storeSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user || null);
    setRecoveryMode(isRecovery);
    if (sessionData.refresh_token) {
      scheduleRefresh(3600, sessionData.refresh_token);
    }
  }, [scheduleRefresh]);

  const refreshSession = useCallback(async () => {
    const stored = getStoredSession();
    const refreshToken = session?.refresh_token || stored?.refresh_token;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const result = await refreshSessionFn(refreshToken);
    if (!result) {
      storeSession(null);
      setSession(null);
      setUser(null);
      setRecoveryMode(false);
      throw new Error('Session refresh failed');
    }

    const refreshedSession = {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: result.user,
    };
    applySession(refreshedSession, { isRecovery: false });
    return refreshedSession;
  }, [applySession, refreshSessionFn, session?.refresh_token]);

  // ── Init: check hash callback or restore session ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const hash = window.location.hash;
        const search = new URLSearchParams(window.location.search);
        const code = search.get('code');
        const searchType = search.get('type');
        const tokenHash = search.get('token_hash');
        const routeLooksLikeRecovery = window.location.pathname.endsWith('/reset-password');

        if (code) {
          const { data, error } = await supabaseAuthClient.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data?.session && !cancelled) {
            const sessionData = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              user: data.session.user,
            };
            applySession(sessionData, { isRecovery: searchType === 'recovery' || routeLooksLikeRecovery });
            window.history.replaceState(null, '', window.location.pathname);
            setLoading(false);
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (tokenHash && searchType === 'recovery') {
          const { data, error } = await supabaseAuthClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) throw error;
          if (data?.session && !cancelled) {
            const sessionData = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              user: data.session.user,
            };
            applySession(sessionData, { isRecovery: true });
            window.history.replaceState(null, '', window.location.pathname);
            setLoading(false);
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');

          if (accessToken) {
            const userData = await fetchUser(accessToken);
            if (userData && !cancelled) {
              const sessionData = {
                access_token: accessToken,
                refresh_token: refreshToken,
                user: userData,
              };
              applySession(sessionData, { isRecovery: type === 'recovery' || routeLooksLikeRecovery });

              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              setLoading(false);
              return;
            }
          }
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // Restore existing session
        const stored = getStoredSession();
        if (stored?.access_token) {
          const userData = await fetchUser(stored.access_token);
          if (userData && !cancelled) {
            const restoredSession = { ...stored, user: userData };
            applySession(restoredSession, { isRecovery: false });
          } else if (stored.refresh_token) {
            const result = await refreshSessionFn(stored.refresh_token);
            if (result && !cancelled) {
              const newSession = {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                user: result.user,
              };
              applySession(newSession, { isRecovery: false });
            } else {
              storeSession(null);
            }
          } else {
            storeSession(null);
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
        storeSession(null);
      }

      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [applySession, refreshSessionFn]);

  // ── Sign Up ──
  const signUp = useCallback(async (email, password, metadata = {}) => {
    const redirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL || getAppPath('auth/callback');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({
        email,
        password,
        data: metadata,
        gotrue_meta_security: {},
        email_redirect_to: redirectTo,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || 'Signup failed');
    }

    if (data.access_token) {
      const sessionData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      };
      storeSession(sessionData);
      setSession(sessionData);
      setUser(data.user);
      scheduleRefresh(data.expires_in || 3600, data.refresh_token);
    }

    return data;
  }, [scheduleRefresh]);

  // ── Sign In ──
  const signIn = useCallback(async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || 'Login failed');
    }

    const sessionData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    };
    storeSession(sessionData);
    setSession(sessionData);
    setUser(data.user);
    scheduleRefresh(data.expires_in || 3600, data.refresh_token);

    return data;
  }, [scheduleRefresh]);

  const checkEmailVerification = useCallback(async (email, password) => {
    if (!email || !password) return { verified: false };

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.error_description || data.msg || data.message || 'Login failed';
      if (
        /email not confirmed/i.test(message) ||
        /invalid login/i.test(message) ||
        /invalid credentials/i.test(message)
      ) {
        return { verified: false, message };
      }
      throw new Error(message);
    }

    const sessionData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    };
    storeSession(sessionData);
    setSession(sessionData);
    setUser(data.user);
    scheduleRefresh(data.expires_in || 3600, data.refresh_token);

    return { verified: true, user: data.user };
  }, [scheduleRefresh]);

  // ── Sign Out ──
  const signOut = useCallback(async () => {
    const stored = getStoredSession();
    if (stored?.access_token) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stored.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
        });
      } catch {}
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    storeSession(null);
    setSession(null);
    setUser(null);
    setRecoveryMode(false);
  }, []);

  // ── Forgot Password (request reset email via Supabase) ──
  const resetPasswordForEmail = useCallback(async (email) => {
    const remaining = getCooldown('reset');
    if (remaining > 0) {
      throw new Error(`Please wait ${remaining} seconds before requesting another reset link.`);
    }

    const redirectTo = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL
      || getAppPath('reset-password');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, redirect_to: redirectTo, gotrue_meta_security: {} }),
    });

    setCooldown('reset', 60);

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many requests. Please wait a few minutes before trying again.');
      }
    }

    return { ok: true };
  }, []);

  // ── Update Password (after clicking Supabase reset link) ──
  const updatePassword = useCallback(async (newPassword) => {
    if (!session?.access_token) {
      throw new Error('No active session. Please use the reset link from your email.');
    }

    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || 'Password update failed');
    }

    setRecoveryMode(false);
    await signOut();

    return { success: true };
  }, [session, signOut]);

  // ── Resend Verification Email ──
  const resendVerification = useCallback(async (email) => {
    const remaining = getCooldown('verify');
    if (remaining > 0) {
      throw new Error(`Please wait ${remaining} seconds before requesting another verification email.`);
    }

    const redirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL || getAppPath('auth/callback');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ type: 'signup', email, email_redirect_to: redirectTo }),
    });

    setCooldown('verify', 60);

    if (!res.ok && res.status === 429) {
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }

    return { ok: true };
  }, []);

  // ── Update user metadata ──
  const updateUserMetadata = useCallback(async (metadata) => {
    if (!session?.access_token) throw new Error('Not authenticated');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ data: metadata }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');

    setUser(data);
    const updated = { ...session, user: data };
    storeSession(updated);
    setSession(updated);

    return data;
  }, [session]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      recoveryMode,
      signUp,
      signIn,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      resendVerification,
      checkEmailVerification,
      updateUserMetadata,
      refreshSession,
    }}>
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
