/**
 * API Service - Central place for all HTTP requests
 * This file handles communication with the Django backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});

// Handle errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only logout on 401 for specific endpoints that require authentication
            // Don't logout for GET requests to endpoints that might not require auth
            const method = error.config?.method?.toUpperCase();
            const url = error.config?.url || '';

            // Only logout if it's a POST/PUT/DELETE or login endpoint
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
