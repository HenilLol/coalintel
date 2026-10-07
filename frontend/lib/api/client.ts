import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
  // Issue #65: session token lives in an httpOnly cookie set by the backend —
  // the browser attaches it automatically and JS can never read it. LocalStorage
  // token storage removed (XSS-stealable).
  withCredentials: true,
});

// Back-compat during migration: if a legacy localStorage token still exists
// (pre-#65 sessions), attach it as a Bearer header. Do NOT write new tokens to
// localStorage; new sessions rely on the httpOnly cookie.
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('coalintel_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear any legacy localStorage remnants from pre-#65 sessions
        localStorage.removeItem('coalintel_token');
        localStorage.removeItem('coalintel_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
