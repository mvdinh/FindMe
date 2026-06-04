import { useState, useCallback, useRef } from 'react';
import { useApiRequest } from './useApiRequest';

export const useHRApplications = () => {
  const { makeJsonRequest } = useApiRequest();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalApplications: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 20
  });

  const cacheRef = useRef(new Map());
  const lastFetchParamsRef = useRef(null);

  const generateCacheKey = useCallback(params => {
    return JSON.stringify({
      page: params.page || 1,
      limit: params.limit || 20,
      job: params.job || 'all',
      status: params.status || 'all',
      search: params.search || '',
      sortBy: params.sortBy || 'appliedDate',
      sortOrder: params.sortOrder || 'desc'
    });
  }, []);

  const fetchApplications = useCallback(
    async (params = {}, options = {}) => {
      const { force = false, silent = false } = options;
      let trackLoading = false;
      try {
        const cacheKey = generateCacheKey(params);
        const sameParams = JSON.stringify(params) === JSON.stringify(lastFetchParamsRef.current);
        if (!force && cacheRef.current.has(cacheKey) && sameParams) {
          const cachedData = cacheRef.current.get(cacheKey);
          setApplications(cachedData.applications);
          setPagination(cachedData.pagination);
          setError(null);
          setLoading(false);
          return cachedData;
        }

        if (!silent) {
          setLoading(true);
          trackLoading = true;
        }
        setError(null);

        const queryParams = new URLSearchParams();
        queryParams.append('page', String(params.page ?? 1));
        queryParams.append('limit', String(params.limit ?? 20));
        if (params.job && params.job !== 'all') queryParams.append('job', params.job);
        if (params.status && params.status !== 'all') queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const response = await makeJsonRequest(`/api/hr/applications?${queryParams}`);
        if (response.success) {
          const responseData = {
            applications: response.data,
            pagination: response.pagination
          };
          cacheRef.current.set(cacheKey, responseData);
          lastFetchParamsRef.current = params;
          setApplications(response.data);
          setPagination(response.pagination);
          setError(null);
          return responseData;
        }
        throw new Error(response.message || 'Failed to fetch applications');
      } catch (err) {
        console.error('Error fetching applications:', err);
        if (!silent) {
          setError(err.message || 'Failed to fetch applications');
          setApplications([]);
        }
        return null;
      } finally {
        if (trackLoading) {
          setLoading(false);
        }
      }
    },
    [makeJsonRequest, generateCacheKey]
  );

  const updateApplicationStatus = useCallback(
    async (applicationId, newStatus, notes = '', scheduleMeta = {}) => {
      try {
        const response = await makeJsonRequest(`/api/hr/applications/${applicationId}/status`, {
          method: 'PUT',
          body: JSON.stringify({
            status: newStatus,
            notes,
            ...scheduleMeta
          })
        });
        if (response.success) {
          const matchId = id => String(id) === String(applicationId);
          setApplications(prev =>
            prev.map(app =>
              matchId(app.id ?? app._id)
                ? {
                    ...app,
                    status: newStatus
                  }
                : app
            )
          );
          cacheRef.current = new Map();
          lastFetchParamsRef.current = null;
          return {
            success: true,
            data: response.data
          };
        }
        throw new Error(response.message || 'Failed to update application status');
      } catch (err) {
        console.error('Error updating application status:', err);
        return {
          success: false,
          error: err.message || 'Failed to update application status'
        };
      }
    },
    [makeJsonRequest]
  );

  const clearCache = useCallback(() => {
    cacheRef.current = new Map();
    lastFetchParamsRef.current = null;
  }, []);

  const invalidateCache = useCallback(() => {
    cacheRef.current = new Map();
  }, []);

  return {
    applications,
    pagination,
    loading,
    error,
    fetchApplications,
    updateApplicationStatus,
    clearCache,
    invalidateCache,
    isCached: () => cacheRef.current.size > 0
  };
};
