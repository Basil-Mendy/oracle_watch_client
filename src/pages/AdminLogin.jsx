import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, Home, Check, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/LoginPage.css';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { loginAdmin } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!formData.email || !formData.password) {
                setError('Please fill in all fields');
                setLoading(false);
                return;
            }

            await loginAdmin(formData.email, formData.password);
            navigate('/admin');
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Left Side - Branding */}
            <div className="login-left">
                <Link to="/" className="login-brand">
                    <div className="brand-icon"><Lock size={32} /></div>
                    <div>
                        <h1>Oracle Watch</h1>
                        <p>Election Platform</p>
                    </div>
                </Link>

                <div className="login-hero">
                    <h2>Admin Portal</h2>
                    <p>Manage and monitor election results with administrative privileges.</p>

                    <div className="features-list">
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Full system access</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Result verification</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Advanced reports</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>User management</span>
                        </div>
                    </div>
                </div>

                <div className="login-footer-text">
                    © 2024 Oracle Watch. Transparent Elections.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="login-right">
                <button
                    className="back-to-home-btn"
                    onClick={() => navigate('/')}
                    title="Back to Home"
                >
                    <Home size={20} />
                </button>
                <div className="login-form-wrapper">
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-header">
                            <h2>Administrator Login</h2>
                            <p>Sign in to your admin account</p>
                        </div>

                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="input-group">
                                <Mail size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="admin@oraclewatch.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-group">
                                <Lock size={18} />
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="checkbox">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>
                            <a href="#forgot" className="forgot-link">Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            {!loading && <ArrowRight size={18} />}
                        </button>

                        <div className="form-divider">
                            <span>OR</span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-primary w-full"
                            onClick={() => navigate('/polling-unit-login')}
                        >
                            Polling Unit Login
                        </button>
                    </form>

                    <div className="login-footer-link">
                        <p>Back to <Link to="/">Home</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
