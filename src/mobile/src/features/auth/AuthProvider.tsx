import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { clearToken, getToken, setToken } from '@/lib/storage';

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
  }, []);

  const signIn = async (newToken: string) => {
    await setToken(newToken);
    setTokenState(newToken);
  };

  const signOut = async () => {
    await clearToken();
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
