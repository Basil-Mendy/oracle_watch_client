/**
 * Polling Unit Login Form - ID + Password with Name Confirmation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { locationService } from '../../services';
import '../../styles/components/Auth.css';

const PollingUnitLoginForm = () => {
    const navigate = useNavigate();
    const { loginPollingUnit, isAuthenticated, userType } = useAuth();
    const [pollingUnitId, setPollingUnitId] = useState('');
    const [password, setPassword] = useState('');
    const [pollingUnitName, setPollingUnitName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingName, setFetchingName] = useState(false);
    const [error, setError] = useState('');
    const [idConfirmed, setIdConfirmed] = useState(false);

    // Navigate when authentication succeeds
    useEffect(() => {
        if (isAuthenticated && userType === 'polling-unit') {
            navigate('/polling-unit', { replace: true });
        }
    }, [isAuthenticated, userType, navigate]);

    // Fetch polling unit name when ID changes
    useEffect(() => {
        if (!pollingUnitId.trim()) {
            setPollingUnitName('');
            setIdConfirmed(false);
            return;
        }

        const fetchPollingUnitName = async () => {
            setFetchingName(true);
            setError('');
            try {
                const response = await locationService.getPollingUnitByUnitId(pollingUnitId);
                setPollingUnitName(response.name);
                setIdConfirmed(true);
            } catch (err) {
                setPollingUnitName('');
                setIdConfirmed(false);
                // Don't show error here, just silently fail
            } finally {
                setFetchingName(false);
            }
        };

        const timer = setTimeout(fetchPollingUnitName, 500); // Debounce
        return () => clearTimeout(timer);
    }, [pollingUnitId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!idConfirmed) {
            setError('Invalid Polling Unit ID');
            return;
        }

        setLoading(true);

        try {
            await loginPollingUnit(pollingUnitId, password);
            // Navigation will happen via useEffect when context updates
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
                <label htmlFor="pu-id">Polling Unit ID</label>
                <input
                    id="pu-id"
                    type="text"
                    value={pollingUnitId}
                    onChange={(e) => setPollingUnitId(e.target.value.toUpperCase())}
                    placeholder="e.g., PU-00001"
                    required
                    disabled={loading}
                    maxLength="20"
                />
                {fetchingName && <div className="loading-text">Verifying ID...</div>}
            </div>

            {idConfirmed && pollingUnitName && (
                <div className="confirmation-box">
                    <p className="confirmation-label"><CheckCircle size={18} className="inline-icon" /> Polling Unit Confirmed:</p>
                    <p className="confirmation-name">{pollingUnitName}</p>
                </div>
            )}

            <div className="form-group">
                <label htmlFor="pu-password">Password</label>
                <input
                    id="pu-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading || !idConfirmed}
                />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading || !idConfirmed} className="submit-btn">
                {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>

            <div className="auth-footer">
                <p>Contact admin for Polling Unit ID and password.</p>
            </div>
        </form>
    );
};

export default PollingUnitLoginForm;
