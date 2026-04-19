import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/pages/LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle login submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/login/', {
                email: email.toLowerCase().trim(),
                password,
            });

            const { user, token } = response.data;

            // Store in localStorage and update context
            login(user, token);

            // Redirect based on user role
            if (user.is_central_admin) {
                navigate('/admin');
            } else {
                navigate('/polling-unit');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error.response?.status === 401) {
                setApiError('Invalid email or password');
            } else if (error.response?.data?.error) {
                setApiError(error.response.data.error);
            } else {
                setApiError('An error occurred during login. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">🔐</div>
                    <h1>Oracle-Watch</h1>
                    <p>Election Monitoring System</p>
                </div>

                {apiError && (
                    <div className="alert alert-error">
                        <span>{apiError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    {/* Email Field */}
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className={`form-input ${errors.email ? 'input-error' : ''}`}
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setApiError('');
                            }}
                            disabled={loading}
                        />
                        {errors.email && (
                            <span className="error-message">{errors.email}</span>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className={`form-input ${errors.password ? 'input-error' : ''}`}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setApiError('');
                            }}
                            disabled={loading}
                        />
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="login-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>Remember me</span>
                        </label>
                        <a href="#forgot" className="forgot-password">
                            Forgot password?
                        </a>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        For support, contact:
                        <br />
                        <strong>support@oracle-watch.ng</strong>
                    </p>
                </div>

                <div className="demo-info">
                    <p><FileText size={18} className="inline-icon" /> Demo Credentials (to be created by admin):</p>
                    <ul>
                        <li><strong>Admin:</strong> admin@oracle-watch.ng / password</li>
                        <li><strong>Polling Unit:</strong> Unit ID + password (from admin)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
