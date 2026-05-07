import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Send HttpOnly cookies on every request
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Response interceptor: redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop on auth pages
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
