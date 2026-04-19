/**
 * Admin Login Form - Email/Username + Password
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/Auth.css';

const AdminLoginForm = () => {
    const navigate = useNavigate();
    const { loginAdmin, isAuthenticated, userType } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Navigate when authentication succeeds
    useEffect(() => {
        if (isAuthenticated && userType === 'admin') {
            navigate('/admin', { replace: true });
        }
    }, [isAuthenticated, userType, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await loginAdmin(email, password);
            // Navigation will happen via useEffect when context updates
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
                <label htmlFor="admin-email">Email or Username</label>
                <input
                    id="admin-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email or username"
                    required
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Logging in...' : 'Login as Admin'}
            </button>

            <div className="auth-footer">
                <p>Don't have an account? Contact your administrator.</p>
            </div>
        </form>
    );
};

export default AdminLoginForm;
