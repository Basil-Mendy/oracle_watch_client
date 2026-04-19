import React, { useState } from 'react';
import locationService from '../../services/locationService';
import './PasswordResetModal.css';

const PasswordResetModal = ({ pollingUnit, isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [resetResponse, setResetResponse] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleResetPassword = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setResetResponse(null);

        try {
            // Backend will generate the password, so we just send the unit ID
            const response = await locationService.resetPollingUnitPassword(pollingUnit.id);

            // Backend returns the temporary password
            setResetResponse(response);
            setMessage({
                type: 'success',
                text: 'New temporary password generated successfully!'
            });
        } catch (error) {
            console.error('Error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || error.response?.data?.message || 'Failed to reset password'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPassword = () => {
        if (resetResponse?.temporary_password) {
            navigator.clipboard.writeText(resetResponse.temporary_password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setResetResponse(null);
        setMessage({ type: '', text: '' });
        setCopied(false);
        if (resetResponse) {
            onSuccess();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content password-reset-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>🔐 Reset Polling Unit Password</h3>
                    <button className="modal-close" onClick={handleClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="polling-unit-info">
                        <p><strong>Unit:</strong> {pollingUnit?.name}</p>
                        <p><strong>ID:</strong> {pollingUnit?.unit_id}</p>
                    </div>

                    {message.text && (
                        <div className={`message message-${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {!resetResponse ? (
                        <div className="reset-prompt">
                            <p>
                                Click the button below to generate a new temporary password for this polling unit.
                                The agent will need to use this new password to log in.
                            </p>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? '⏳ Generating...' : '🔄 Generate New Password'}
                            </button>
                        </div>
                    ) : (
                        <div className="reset-success">
                            <div className="success-badge">✓</div>
                            <h4>New Password Generated</h4>

                            <div className="credentials-display">
                                <div className="credential-item">
                                    <label>Username (Unit Code):</label>
                                    <div className="credential-value">{resetResponse.pu_code}</div>
                                </div>

                                <div className="credential-item">
                                    <label>Temporary Password:</label>
                                    <div className="password-display-reset">
                                        <code>{resetResponse.temporary_password}</code>
                                        <button
                                            type="button"
                                            className="btn-copy"
                                            onClick={handleCopyPassword}
                                        >
                                            {copied ? '✓ Copied!' : '📋 Copy'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="reset-warning">
                                <strong>⚠️ Important:</strong> {resetResponse.warning}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        {resetResponse ? 'Done' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetModal;

