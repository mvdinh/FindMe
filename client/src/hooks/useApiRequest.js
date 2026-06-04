import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export const useApiRequest = () => {
  const navigate = useNavigate();
  const {
    apiRequest
  } = useAuth();
  const makeRequest = useCallback(async (url, options = {}) => {
    try {
      const response = await apiRequest(url, options);
      return response;
    } catch (error) {
      if (error.message === 'Authentication required') {
        console.log('Authentication required, redirecting to login...');
        navigate('/login');
        throw error;
      }
      throw error;
    }
  }, [apiRequest, navigate]);
  const makeJsonRequest = useCallback(async (url, options = {}) => {
    const response = await makeRequest(url, options);
    if (response && response.status === 304) {
      const err = new Error('Phản hồi 304 — dữ liệu có thể lỗi thời. Vui lòng tải lại trang.');
      err.status = 304;
      throw err;
    }
    if (response && response.ok) {
      return await response.json();
    }
    if (response && !response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          success: false,
          error: 'Server Error',
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      const error = new Error(errorData.message || errorData.error || 'Request failed');
      error.response = {
        data: errorData,
        status: response.status
      };
      throw error;
    }
    return null;
  }, [makeRequest]);
  return {
    makeRequest,
    makeJsonRequest
  };
};