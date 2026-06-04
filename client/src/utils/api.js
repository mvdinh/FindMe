export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || '';
};
export const buildApiUrl = endpoint => {
  const apiUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return apiUrl ? `${apiUrl}${cleanEndpoint}` : cleanEndpoint;
};
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  return fetch(url, options);
};
export default {
  getApiUrl,
  buildApiUrl,
  apiRequest
};