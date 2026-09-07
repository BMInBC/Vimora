"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { firebaseConfig, ADMIN_EMAIL } from './config';

const FIREBASE_AUTH_BASE = `https://identitytoolkit.googleapis.com/v1`;

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  register: (email: string, pass: string, name: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'vimora_session';
const ALL_USERS_KEY = 'vimora_all_users';

function buildProfile(fbData: any, existing?: Partial<UserProfile>): UserProfile {
  const email = fbData.email || existing?.email || '';
  const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return {
    uid: fbData.localId || fbData.uid || existing?.uid || '',
    displayName: fbData.displayName || existing?.displayName || email.split('@')[0],
    email,
    emailVerified: fbData.emailVerified ?? existing?.emailVerified ?? false,
    role: isAdminEmail ? 'admin' : 'user',
    plan: existing?.plan ?? 'free',
    accountStatus: existing?.accountStatus ?? 'active',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    licenceStatus: existing?.licenceStatus ?? 'none',
  };
}

async function firebaseRequest(endpoint: string, body: object): Promise<any> {
  const res = await fetch(
    `${FIREBASE_AUTH_BASE}${endpoint}?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || 'Firebase request failed';
    // Translate Firebase error codes to friendly messages
    const messages: Record<string, string> = {
      'EMAIL_EXISTS': 'An account with this email already exists.',
      'WEAK_PASSWORD': 'Password must be at least 6 characters.',
      'INVALID_EMAIL': 'Please enter a valid email address.',
      'EMAIL_NOT_FOUND': 'No account found with this email.',
      'INVALID_PASSWORD': 'Incorrect password. Please try again.',
      'INVALID_LOGIN_CREDENTIALS': 'Incorrect email or password.',
      'USER_DISABLED': 'This account has been suspended. Contact support.',
      'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many attempts. Please try again later.',
    };
    throw new Error(messages[msg] || msg);
  }
  return data;
}

function upsertUserRegistry(user: UserProfile) {
  try {
    const raw = localStorage.getItem(ALL_USERS_KEY);
    const users: UserProfile[] = raw ? JSON.parse(raw) : [];
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed.profile);
        setIdToken(parsed.idToken || null);
      }
    } catch {}
    setLoading(false);
  }, []);

  const saveSession = (profile: UserProfile | null, token?: string) => {
    setUser(profile);
    if (token) setIdToken(token);
    if (profile) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ profile, idToken: token }));
      upsertUserRegistry(profile);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setIdToken(null);
    }
  };

  const register = async (email: string, pass: string, displayName: string) => {
    setLoading(true);
    try {
      // 1. Create user
      const data = await firebaseRequest('/accounts:signUp', {
        email,
        password: pass,
        returnSecureToken: true,
      });

      // 2. Update display name
      await firebaseRequest('/accounts:update', {
        idToken: data.idToken,
        displayName: displayName || email.split('@')[0],
        returnSecureToken: true,
      });

      // 3. Send email verification
      try {
        await firebaseRequest('/accounts:sendOobCode', {
          requestType: 'VERIFY_EMAIL',
          idToken: data.idToken,
        });
      } catch (e) { /* Non-blocking */ }

      const profile = buildProfile({ ...data, displayName, email });
      saveSession(profile, data.idToken);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const data = await firebaseRequest('/accounts:signInWithPassword', {
        email,
        password: pass,
        returnSecureToken: true,
      });

      // Get full user info
      const infoData = await firebaseRequest('/accounts:lookup', {
        idToken: data.idToken,
      });
      const fbUser = infoData.users?.[0] || data;

      // Merge with locally stored profile (plan/licenceStatus)
      const raw = localStorage.getItem(ALL_USERS_KEY);
      const allUsers: UserProfile[] = raw ? JSON.parse(raw) : [];
      const existing = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

      const profile = buildProfile({ ...fbUser, email }, existing);
      saveSession(profile, data.idToken);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    saveSession(null);
  };

  const sendPasswordReset = async (email: string) => {
    await firebaseRequest('/accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
    });
  };

  const resendVerificationEmail = async () => {
    if (!idToken) return;
    await firebaseRequest('/accounts:sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken,
    });
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        const session = raw ? JSON.parse(raw) : {};
        session.profile = updated;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        upsertUserRegistry(updated);
      } catch {}
      return updated;
    });
  };

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isPro = user?.plan === 'pro';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isPro,
        register,
        login,
        logout,
        sendPasswordReset,
        resendVerificationEmail,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}