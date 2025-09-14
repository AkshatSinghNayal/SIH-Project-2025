
import React from 'react';
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '../types';

interface Session {
  user: User;
  token: string; // Mock JWT
  expiry: number; // Timestamp
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session duration: 1 hour
const SESSION_DURATION = 60 * 60 * 1000;
const USERS_DB_KEY = 'users_db';

// Use cross-platform timer type that works in both Node and the browser
let logoutTimer: ReturnType<typeof setTimeout>;

// Helper to get mock users from localStorage
const getMockUsers = (): User[] => {
    const users = localStorage.getItem(USERS_DB_KEY);
    return users ? JSON.parse(users) : [];
};

// Helper to save mock users to localStorage
const saveMockUsers = (users: User[]) => {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('session');
    if (logoutTimer) {
      clearTimeout(logoutTimer);
    }
    console.log("Session ended. User logged out.");
  }, []);

  const createSession = (loggedInUser: User) => {
    const expirationTime = new Date().getTime() + SESSION_DURATION;
    const { password, ...userToStore } = loggedInUser; // Don't store password in session
    
    const newSession: Session = {
        user: userToStore,
        token: `mock_jwt_${Date.now()}`,
        expiry: expirationTime,
    };

    localStorage.setItem('session', JSON.stringify(newSession));
    setUser(userToStore);

    logoutTimer = setTimeout(logout, SESSION_DURATION);
    console.log(`User '${userToStore.username}' logged in. Session expires in ${SESSION_DURATION / 60000} minutes.`);
  }

  const login = async (username: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const users = getMockUsers();
        const foundUser = users.find(u => u.username === username);

        if (foundUser && foundUser.password === password) {
            createSession(foundUser);
            resolve();
        } else {
            reject(new Error('Invalid username or password.'));
        }
    });
  };

  const signup = async (username: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const users = getMockUsers();
        const userExists = users.some(u => u.username === username);

        if (userExists) {
            reject(new Error('Username already exists.'));
            return;
        }

        const newUser: User = { 
            id: `user_${crypto.randomUUID()}`, 
            username, 
            password 
        };
        
        const updatedUsers = [...users, newUser];
        saveMockUsers(updatedUsers);
        
        createSession(newUser);
        resolve();
    });
  };

  useEffect(() => {
    const storedSession = localStorage.getItem('session');
    if (storedSession) {
        try {
            const session: Session = JSON.parse(storedSession);
            const remainingTime = session.expiry - new Date().getTime();

            if (remainingTime > 0) {
                setUser(session.user);
                logoutTimer = setTimeout(logout, remainingTime);
                console.log(`Session restored for '${session.user.username}'. Expires in ${Math.round(remainingTime / 60000)} minutes.`);
            } else {
                logout();
            }
        } catch (error) {
            console.error("Failed to parse session from storage", error);
            logout();
        }
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
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
