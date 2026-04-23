/**
 * Authentication Context - Manages user authentication state
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userType, setUserType] = useState(null); // 'admin' or 'polling-unit'

    // Check if user is already logged in on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('auth_token');
        const storedUserType = localStorage.getItem('user_type');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
            setUserType(storedUserType);
        }
        setLoading(false);
    }, []);

    const loginAdmin = async (email, password) => {
        try {
            const response = await api.post('/auth/login/', {
                email,
                password,
            });

            const { user: userData, token } = response.data;

            // Verify user is admin/superuser
            if (!userData.is_central_admin) {
                throw new Error('You do not have admin privileges');
            }

            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_type', 'admin');

            setUser(userData);
            setIsAuthenticated(true);
            setUserType('admin');

            return userData;
        } catch (error) {
            // Handle both backend error formats: {"error": "..."} and {"detail": "..."}
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.error ||
                error.message ||
                'Admin login failed';
            throw new Error(errorMessage);
        }
    };

    const loginPollingUnit = async (unitId, password) => {
        try {
            const response = await api.post('/auth/polling-unit-login/', {
                unit_id: unitId,
                password,
            });

            const { polling_unit: unitData, token } = response.data;

            const pollingUnitUser = {
                id: unitData.id,
                unit_id: unitData.unit_id,
                name: unitData.name,
                lga_id: unitData.lga,
                lga_name: unitData.lga_name,
                ward_id: unitData.ward,
                ward_name: unitData.ward_name,
                is_polling_unit: true,
            };

            localStorage.setItem('user', JSON.stringify(pollingUnitUser));
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_type', 'polling-unit');
            // Store password temporarily in sessionStorage for API submissions (session-only, cleared on browser close)
            sessionStorage.setItem('polling_unit_password', password);

            setUser(pollingUnitUser);
            setIsAuthenticated(true);
            setUserType('polling-unit');

            return pollingUnitUser;
        } catch (error) {
            // Handle both backend error formats: {"error": "..."} and {"detail": "..."}
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.error ||
                error.message ||
                'Polling unit login failed';
            throw new Error(errorMessage);
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_type');
        sessionStorage.removeItem('polling_unit_password');
        setUser(null);
        setIsAuthenticated(false);
        setUserType(null);
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        userType,
        loginAdmin,
        loginPollingUnit,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
