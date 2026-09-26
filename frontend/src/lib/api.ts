import axios from 'axios';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Interceptor to inject user ID header from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('reachinbox_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (e) {
        // ignore parse error
      }
    }
  }
  return config;
});
export default api;
