import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

// Create the AuthContext
const AuthContext = createContext({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async (token, userData) => {},
  logout: async () => {},
  updateUser: (userData) => {},
});

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken, userData) => {
    try {
      // Store token and user data
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      // Update state
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear stored data
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

      // Clear state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    // Update stored user data
    AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser))
      .catch(error => console.error('Failed to update stored user:', error));
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;




