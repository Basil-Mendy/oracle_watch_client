/**
 * API Service - Central place for all HTTP requests
 * Handles communication with Django backend
 */

import axios from 'axios';

// ✅ BASE URL INCLUDES /api (IMPORTANT)
const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000/api';

// 🔍 Debug
console.log("🚀 API BASE URL:", API_BASE_URL);

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 🔐 Attach auth token if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');

        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }

        console.log(
            "📡 Request:",
            config.method?.toUpperCase(),
            config.baseURL + config.url
        );

        return config;
    },
    (error) => Promise.reject(error)
);

// 🌍 Global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("❌ API Error:", error.response || error.message);

        if (error.response?.status === 401) {
            const method = error.config?.method?.toUpperCase();
            const url = error.config?.url || '';

            const shouldLogout =
                method !== 'GET' ||
                url.includes('login') ||
                url.includes('auth');

            if (shouldLogout) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;