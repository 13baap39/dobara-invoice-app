import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../api.js';

// Create the AuthContext
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer function
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload.updates },
        error: null
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
}

// AuthProvider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      // Check for stored token (prefer localStorage, fallback to sessionStorage)
      const token = localStorage.getItem('dobara_token') || sessionStorage.getItem('dobara_token');
      
      if (token) {
        // Fetch user profile to validate token
        const response = await api.get('/auth/me');
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.data,
            token: token
          }
        });
      } else {
        dispatch({
          type: AUTH_ACTIONS.SET_LOADING,
          payload: { isLoading: false }
        });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // Token is invalid, remove it
      localStorage.removeItem('dobara_token');
      sessionStorage.removeItem('dobara_token');
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: 'Session expired' }
      });
    }
  };

  // Login function
  const login = async (email, password, remember = true) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;
      
      // Store token based on remember preference
      if (remember) {
        localStorage.setItem('dobara_token', token);
        sessionStorage.removeItem('dobara_token');
      } else {
        sessionStorage.setItem('dobara_token', token);
        localStorage.removeItem('dobara_token');
      }
      
      // Fetch user profile
      const userResponse = await api.get('/auth/me');
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: userResponse.data,
          token: token
        }
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });
      
      return { success: false, error: errorMessage };
    }
  };

  // Signup function
  const signup = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await api.post('/auth/signup', userData);
      const { token } = response.data;
      
      // Store token in localStorage by default for signup
      localStorage.setItem('dobara_token', token);
      sessionStorage.removeItem('dobara_token');
      
      // Fetch user profile
      const userResponse = await api.get('/auth/me');
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: userResponse.data,
          token: token
        }
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });
      
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('dobara_token');
    sessionStorage.removeItem('dobara_token');
    
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Update user profile
  const updateUser = async (updates) => {
    try {
      const response = await api.put('/auth/me', updates);
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: { updates: response.data }
      });
      
      return { success: true, user: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Update failed';
      return { success: false, error: errorMessage };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: { user: response.data }
      });
      
      return { success: true, user: response.data };
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return { success: false, error: 'Failed to refresh user data' };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    
    // Actions
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
