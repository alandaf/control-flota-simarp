import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken } from './api';
import { disconnectSocket } from './socket';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin' | 'company';
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, setUser: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api<{ user: User }>('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    clearToken();
    disconnectSocket();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, setUser, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
