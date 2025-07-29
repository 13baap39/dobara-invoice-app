import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    // Prefer localStorage, fallback to sessionStorage
    const token = localStorage.getItem('dobara_token') || sessionStorage.getItem('dobara_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Allow tracking upload progress
    if (config.onUploadProgress) {
      config.onUploadProgress = config.onUploadProgress;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
