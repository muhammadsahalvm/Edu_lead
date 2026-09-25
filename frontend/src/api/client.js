import axios from 'axios';
import { API_ENDPOINTS } from './endpoints';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: inject JWT access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edulead_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on login or refresh endpoint itself
    const isAuthUrl =
      originalRequest.url?.includes(API_ENDPOINTS.AUTH.TOKEN) ||
      originalRequest.url?.includes(API_ENDPOINTS.AUTH.REFRESH);

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthUrl) {
      const refreshToken = localStorage.getItem('edulead_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('edulead_access_token');
        localStorage.removeItem('edulead_refresh_token');
        localStorage.removeItem('edulead_user');
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { message: 'Session expired. Please sign in to continue.' },
          })
        );
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('edulead_access_token', newAccessToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('edulead_access_token');
        localStorage.removeItem('edulead_refresh_token');
        localStorage.removeItem('edulead_user');
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { message: 'Your session has expired. Please sign in again.' },
          })
        );
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Normalizes API error responses into clean, user-facing error messages.
 * Prevents raw backend stack traces, SQL traces, or HTML pages from leaking to the UI.
 */
export const formatApiError = (error) => {
  if (!error) return 'An unexpected error occurred.';

  // If already a clean string message
  if (typeof error === 'string') {
    // Check if it looks like raw HTML
    if (error.trim().startsWith('<') || error.includes('<!DOCTYPE')) {
      return 'A server error occurred. Please try again later.';
    }
    return error;
  }

  // Handle Network Timeout
  if (
    error.code === 'ECONNABORTED' ||
    (error.message && error.message.toLowerCase().includes('timeout'))
  ) {
    return 'Request timed out. The server took too long to respond. Please try again.';
  }

  // Handle Server Unavailable / Network Disconnect
  if (
    !error.response ||
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    error.code === 'ECONNREFUSED'
  ) {
    return 'Unable to reach the server. Please check your network connection or verify that the API server is online.';
  }

  const { status, data } = error.response;

  // 5xx Server Errors: NEVER expose raw stack traces or internal Django tracebacks
  if (status >= 500) {
    return 'An internal server error occurred. Please try again later or contact support.';
  }

  // 404 Not Found
  if (status === 404) {
    if (data?.detail && typeof data.detail === 'string') {
      return data.detail;
    }
    return 'The requested resource was not found.';
  }

  // 403 Forbidden
  if (status === 403) {
    if (data?.detail && typeof data.detail === 'string') {
      return data.detail;
    }
    return 'Access denied. You do not have permission to perform this action.';
  }

  // 401 Unauthorized
  if (status === 401) {
    if (data?.detail && typeof data.detail === 'string') {
      const lower = data.detail.toLowerCase();
      if (lower.includes('token') || lower.includes('expired') || lower.includes('invalid')) {
        return 'Your session has expired or the token is invalid. Please sign in again.';
      }
      return data.detail;
    }
    return 'Authentication required. Please sign in to continue.';
  }

  // 400 Bad Request / Validation Errors
  if (status === 400 && data) {
    if (typeof data === 'string') {
      if (data.trim().startsWith('<') || data.includes('<!DOCTYPE')) {
        return 'Invalid request format or server error occurred.';
      }
      return data;
    }

    if (data.detail && typeof data.detail === 'string') {
      return data.detail;
    }

    if (data.non_field_errors) {
      return Array.isArray(data.non_field_errors)
        ? data.non_field_errors.join(' ')
        : String(data.non_field_errors);
    }

    // Dictionary of field validation errors
    if (typeof data === 'object') {
      const fieldErrors = Object.entries(data)
        .map(([field, messages]) => {
          const text = Array.isArray(messages) ? messages.join(' ') : String(messages);
          const fieldName = field.replace(/_/g, ' ');
          const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          return `${capitalizedField}: ${text}`;
        })
        .join(' | ');

      if (fieldErrors) return fieldErrors;
    }
  }

  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};
