import React from 'react';
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '../types';
import { fetchMeApi, loginApi, registerApi, logoutApi } from '../services/authService';
import { seedDemoData } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  loginDemoUser: () => Promise<void>;
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

  const loginDemoUser = async (): Promise<void> => {
    let loggedUser: User | null = null;
    try {
      loggedUser = await loginApi('recruiter_demo', 'Recruiter@2025');
    } catch {
      try {
        loggedUser = await registerApi('recruiter_demo', 'Recruiter@2025');
      } catch {
        loggedUser = { id: 'recruiter_demo', username: 'recruiter_demo' };
      }
    }
    if (loggedUser) {
      seedDemoData(loggedUser.id);
      setUser(loggedUser);
    }
  };

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginAsGuest, loginDemoUser, logout }}>
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
