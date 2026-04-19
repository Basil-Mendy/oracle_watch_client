/**
 * Success Modal - Displays polling unit credentials with password
 * Shows plain-text password only once (ephemeral visibility)
 */
import React, { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import './PollingUnitSuccessModal.css';

const PollingUnitSuccessModal = ({ isOpen, unit, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !unit) return null;

    const handleCopyPassword = () => {
        navigator.clipboard.writeText(unit.temporary_password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content success-modal">
                <div className="modal-header success-header">
                    <h2><CheckCircle size={24} className="inline-icon" style={{ color: '#10b981' }} /> Polling Unit Created Successfully</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="success-warning">
                        <strong><AlertCircle size={18} className="inline-icon" style={{ color: '#dc3545' }} /> Important:</strong> This password will not be shown again.
                        Please share it with the agent immediately.
                    </div>

                    <div className="credentials-container">
                        <div className="credential-field">
                            <label>Polling Unit Name:</label>
                            <div className="credential-value">{unit.pu_name || unit.name}</div>
                        </div>

                        <div className="credential-field">
                            <label>Polling Unit Code (Username):</label>
                            <div className="credential-value">{unit.pu_code || unit.unit_id}</div>
                        </div>

                        <div className="credential-field">
                            <label>Temporary Password:</label>
                            <div className="password-display-success">
                                <code className="password-code">{unit.temporary_password}</code>
                                <button
                                    type="button"
                                    className="btn-copy"
                                    onClick={handleCopyPassword}
                                    title="Copy password to clipboard"
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="credential-field ward-lga">
                            <label>Location:</label>
                            <div className="credential-value">
                                {unit.ward_name} Ward, {unit.lga_name}
                            </div>
                        </div>
                    </div>

                    <div className="next-steps">
                        <h4>Next Steps:</h4>
                        <ol>
                            <li>Copy this password and securely share it with the polling unit agent</li>
                            <li>The agent will use the Unit Code as username and this password to log in</li>
                            <li>Upon first login, the agent will be prompted to set their own password</li>
                            <li>If the password is lost or needs resetting, use the "Reset Password" feature</li>
                        </ol>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PollingUnitSuccessModal;
