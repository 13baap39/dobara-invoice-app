import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5002',
});

api.interceptors.request.use(
  (config) => {
    // Prefer localStorage, fallback to sessionStorage
    const token = localStorage.getItem('dobara_token') || sessionStorage.getItem('dobara_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
