import axios from 'axios';

// ✅ Logic: Always use environment variable for flexibility
// Production (Vercel): Uses VITE_API_URL env var
// Development: Uses local .env file or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

console.log("🚀 Oracle Watch API Base:", API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach Token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});

export default api;