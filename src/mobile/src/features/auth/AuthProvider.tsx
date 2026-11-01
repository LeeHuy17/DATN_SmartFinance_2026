import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { setOnSessionExpired } from '@/lib/api/client';
import {
  clearRefreshToken,
  clearToken,
  getRefreshToken,
  getToken,
  setToken,
} from '@/lib/storage';

import { clearNotificationCache } from '@/features/notifications/notificationsStore';
import { clearProfile } from '@/features/profile/profileStore';

import { logout } from './loginApi';

/** Xóa dữ liệu của tài khoản hiện tại đang giữ trong bộ nhớ, để tài khoản đăng nhập sau không thấy */
const clearUserData = () => {
  clearProfile();
  clearNotificationCache();
};

type AuthContextValue = {
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getToken()
      .then(setTokenState)
      .catch(() => setTokenState(null))
      .finally(() => setIsLoading(false));
    // Refresh token hết hạn hoặc bị thu hồi: quay về màn hình đăng nhập
    setOnSessionExpired(() => {
      clearUserData();
      setTokenState(null);
    });
    return () => setOnSessionExpired(null);
  }, []);

  const signIn = async (newToken: string) => {
    await setToken(newToken);
    setTokenState(newToken);
  };

  const signOut = async () => {
    const refresh = await getRefreshToken();
    if (refresh) await logout(refresh);
    await Promise.all([clearToken(), clearRefreshToken()]);
    clearUserData();
    setTokenState(null);
  };

  return (
    <AuthContext.Provider value={{ isLoading, isSignedIn: !!token, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}
