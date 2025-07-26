import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
};

// Action types
const authActions = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false
      };
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false
      };
    case authActions.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      dispatch({ type: authActions.SET_LOADING, payload: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user: response.data.data.user }
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: authActions.SET_LOADING, payload: false });
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data.data;
      
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user }
      });
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      dispatch({ type: authActions.SET_LOADING, payload: false });
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      const response = await api.post('/auth/register', userData);
      const { user, accessToken, refreshToken } = response.data.data;
      
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user }
      });
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      dispatch({ type: authActions.SET_LOADING, payload: false });
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: authActions.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Update profile function
  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      const updatedUser = response.data.data.user;
      
      dispatch({
        type: authActions.UPDATE_USER,
        payload: updatedUser
      });
      
      toast.success('Profile updated successfully!');
      return { success: true, user: updatedUser };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    api // Expose api instance for other components
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
