/**
 * Helper function to get the full API URL
 * This ensures API calls work correctly whether using relative paths or absolute URLs
 */

export const getApiUrl = (endpoint) => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000/api`;
    return `${apiBaseUrl}${endpoint}`;
};
