import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../utils/api';
import { clearAllAppDataCaches } from '../utils/cacheManager';
const profileUrlForRole = role => {
  if (role === 'applicant') return '/api/applicant/profile';
  if (role === 'hr') return '/api/hr/profile';
  return null;
};
const readStoredUserRole = () => {
  try {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s).role : null;
  } catch {
    return null;
  }
};
const persistUserToStorage = userObj => {
  try {
    localStorage.setItem('user', JSON.stringify(userObj));
  } catch {
    try {
      const {
        profilePicture,
        avatar,
        ...rest
      } = userObj;
      localStorage.setItem('user', JSON.stringify(rest));
    } catch {
      /* ignore quota */
    }
  }
};
const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [avatarHydrating, setAvatarHydrating] = useState(false);
  const hydrateAvatarIfNeeded = useCallback(async candidateUser => {
    return;
  }, [token, avatarHydrating]);
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setTimeout(() => {
          setLoading(false);
        }, 0);
        setLastRefreshTime(0);
        refreshUserData(storedToken, parsedUser.role);
        hydrateAvatarIfNeeded(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      console.log('🔐 AuthContext: No stored auth data found');
      setLoading(false);
    }
  }, []);
  const refreshUserData = async (authToken, role) => {
    const now = Date.now();
    const REFRESH_COOLDOWN = 10 * 1000;
    if (isRefreshingUser) {
      return;
    }
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
      return;
    }
    const url = profileUrlForRole(role);
    if (!url) {
      return;
    }
    try {
      setIsRefreshingUser(true);
      setLastRefreshTime(now);
      const response = await fetch(buildApiUrl(url), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.success) {
          return;
        }
        if (role === 'applicant') {
          const processedUserData = {
            ...data.data,
            profile: data.data.profile,
            resume: data.data.resume || data.data.profile?.resume,
            currentResumeId: data.data.currentResumeId || data.data.profile?.currentResumeId,
            resumeAvailable: data.data.resumeAvailable,
            skills: data.data.profile?.primarySkills || data.data.skills
          };
          setUser(processedUserData);
          persistUserToStorage(processedUserData);
        } else if (role === 'hr') {
          const {
            success: _s,
            ...profile
          } = data;
          const processedUserData = {
            ...profile,
            profilePicture: profile.avatar || profile.profilePicture,
            avatar: profile.avatar
          };
          setUser(processedUserData);
          persistUserToStorage(processedUserData);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data on startup:', error);
    } finally {
      setIsRefreshingUser(false);
    }
  };
  const login = async (email, password) => {
    try {
      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      const data = await response.json();
      if (data.success) {
        clearAllAppDataCaches();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } else {
        const error = new Error(data.message || 'Đăng nhập thất bại');
        error.code = data.code;
        error.email = data.data?.email;
        throw error;
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.message) {
        throw error;
      }
      throw new Error('Lỗi mạng. Vui lòng thử lại.');
    }
  };
  const logout = useCallback(() => {
    clearAllAppDataCaches();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);
  const updateUser = updatedUser => {
    setUser(updatedUser);
    persistUserToStorage(updatedUser);
    hydrateAvatarIfNeeded(updatedUser);
  };
  const refreshUser = async (forceRefresh = false) => {
    try {
      if (!token) return;
      const now = Date.now();
      const REFRESH_COOLDOWN = 10 * 1000;
      if (isRefreshingUser) {
        return;
      }
      if (!forceRefresh && now - lastRefreshTime < REFRESH_COOLDOWN) {
        return;
      }
      setIsRefreshingUser(true);
      setLastRefreshTime(now);
      const role = user?.role || readStoredUserRole();
      const url = profileUrlForRole(role);
      if (!url) {
        setIsRefreshingUser(false);
        return;
      }
      const response = await fetch(buildApiUrl(url), {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          let updatedUser;
          if (role === 'applicant') {
            updatedUser = {
              ...user,
              ...data.data,
              profile: data.data.profile,
              resume: data.data.resume || data.data.profile?.resume,
              currentResumeId: data.data.currentResumeId || data.data.profile?.currentResumeId,
              resumeAvailable: data.data.resumeAvailable,
              skills: data.data.profile?.primarySkills || data.data.skills
            };
          } else if (role === 'hr') {
            const {
              success: _s,
              ...profile
            } = data;
            updatedUser = {
              ...user,
              ...profile,
              profilePicture: profile.avatar || profile.profilePicture,
              avatar: profile.avatar
            };
          } else {
            return;
          }
          updateUser(updatedUser);
          return updatedUser;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshingUser(false);
    }
  };
  const isAuthenticated = () => {
    return !!token && !!user;
  };
  const hasRole = roles => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return false;
  };
  const isCompanyAdmin = () => {
    return user?.isCompanyAdmin || false;
  };
  const getCompany = () => {
    return user?.company || null;
  };
  const apiRequest = useCallback(async (path, options = {}) => {
    const fullUrl = buildApiUrl(path);
    const {
      headers: optionHeaders,
      cache: optionCache,
      ...restOptions
    } = options;
    const config = {
      ...restOptions,
      cache: optionCache ?? 'no-store',
      headers: {
        ...(!(options.body instanceof FormData) && {
          'Content-Type': 'application/json'
        }),
        ...(token && {
          Authorization: `Bearer ${token}`
        }),
        ...optionHeaders
      }
    };
    try {
      const response = await fetch(fullUrl, config);
      if (response.status === 401) {
        logout();
        throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      }
      if (response.status === 431) {
        console.error('Request headers too large. Clearing auth data...');
        logout();
        throw new Error('Dữ liệu phiên bị lỗi. Vui lòng đăng nhập lại.');
      }
      return response;
    } catch (error) {
      if (error.message?.includes('431') || error.message?.includes('header')) {
        console.error('Header size error detected. Clearing auth data...');
        logout();
        throw new Error('Dữ liệu phiên bị lỗi. Vui lòng đăng nhập lại.');
      }
      throw error;
    }
  }, [token, logout]);
  const value = {
    user,
    token,
    loading,
    avatarHydrating,
    login,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated,
    hasRole,
    isCompanyAdmin,
    getCompany,
    apiRequest
  };
  return <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>;
};
export default AuthContext;