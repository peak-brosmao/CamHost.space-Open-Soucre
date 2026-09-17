import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getToken, setToken, getUser, setUser } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const savedToken = getToken();
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiRequest('/auth/me');
        setUserState(res);
        setUser(res);
      } catch {
        setToken(null);
        setUser(null);
        setUserState(null);
        setTokenState(null);
      } finally {
        setLoading(false);
      }
    }
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
    setTokenState(res.token);
    setUserState(res.user);
    return res;
  };

  const register = async (email, password, confirmPassword) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, password, confirm_password: confirmPassword },
    });
    setToken(res.token);
    setUser(res.user);
    setTokenState(res.token);
    setUserState(res.user);
    return res;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTokenState(null);
    setUserState(null);
  };

  const updateProfile = async (displayName, email) => {
    const res = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: { display_name: displayName, email },
    });
    if (res.user) {
      setUser(res.user);
      setUserState(res.user);
    }
    return res;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, isAdmin }}>
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
