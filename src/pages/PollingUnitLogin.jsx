import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Lock, ArrowRight, AlertCircle, Home, Check, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/LoginPage.css';

const PollingUnitLogin = () => {
    const navigate = useNavigate();
    const { loginPollingUnit } = useAuth();
    const [formData, setFormData] = useState({
        pollingUnitCode: '',
        accessCode: ''
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
            if (!formData.pollingUnitCode || !formData.accessCode) {
                setError('Please fill in all fields');
                setLoading(false);
                return;
            }

            await loginPollingUnit(formData.pollingUnitCode, formData.accessCode);
            navigate('/polling-unit');
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="login-page polling-unit-login">
            {/* Left Side - Branding */}
            <div className="login-left">
                <Link to="/" className="login-brand">
                    <div className="brand-icon"><MapPin size={32} /></div>
                    <div>
                        <h1>Oracle Watch</h1>
                        <p>Election Platform</p>
                    </div>
                </Link>

                <div className="login-hero">
                    <h2>Polling Unit Portal</h2>
                    <p>Submit and manage election results from your polling unit securely.</p>

                    <div className="features-list">
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Secure result submission</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Real-time verification</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Result confirmation</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon"><Check size={18} /></span>
                            <span>Digital receipts</span>
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
                            <h2>Polling Unit Login</h2>
                            <p>Enter your polling unit credentials</p>
                        </div>

                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="info-box">
                            <span className="info-icon"><Info size={18} /></span>
                            <p>Use the credentials provided by your election officials</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="pollingUnitCode">Polling Unit Code</label>
                            <div className="input-group">
                                <MapPin size={18} />
                                <input
                                    id="pollingUnitCode"
                                    type="text"
                                    name="pollingUnitCode"
                                    placeholder="e.g., PU-AS-001"
                                    value={formData.pollingUnitCode}
                                    onChange={handleChange}
                                    disabled={loading}
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <small>Your unique polling unit identifier</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="accessCode">Access Code</label>
                            <div className="input-group">
                                <Lock size={18} />
                                <input
                                    id="accessCode"
                                    type="password"
                                    name="accessCode"
                                    placeholder="Enter access code"
                                    value={formData.accessCode}
                                    onChange={handleChange}
                                    disabled={loading}
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <small>6-8 character code provided by officials</small>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Access Portal'}
                            {!loading && <ArrowRight size={18} />}
                        </button>

                        <div className="form-divider">
                            <span>OR</span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-primary w-full"
                            onClick={() => navigate('/admin-login')}
                        >
                            Admin Login
                        </button>

                        <div className="form-footer">
                            <p>Need help? <a href="#support">Contact support</a></p>
                        </div>
                    </form>

                    <div className="login-footer-link">
                        <p>Back to <Link to="/">Home</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PollingUnitLogin;
