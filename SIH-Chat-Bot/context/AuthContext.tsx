import React from 'react';
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '../types';
import { fetchMeApi, loginApi, registerApi, logoutApi } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session from backend HttpOnly cookie on initial mount
  useEffect(() => {
    let isMounted = true;
    fetchMeApi()
      .then(currentUser => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    const loggedInUser = await loginApi(username, password);
    setUser(loggedInUser);
  };

  const signup = async (username: string, password: string): Promise<void> => {
    const registeredUser = await registerApi(username, password);
    setUser(registeredUser);
  };

  const loginAsGuest = useCallback(() => {
    setUser({ id: 'guest', username: 'Guest', isGuest: true });
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
