import React, { useState } from 'react';
import { AlertTriangle, X, Clock, User } from 'lucide-react';
import '../../styles/components/RejectionNotificationsCard.css';

const RejectionNotificationsCard = ({ rejectionNotifications, onDismiss }) => {
    const [expandedRejection, setExpandedRejection] = useState(null);

    if (!rejectionNotifications || rejectionNotifications.length === 0) {
        return null;
    }

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Not specified';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / 60000);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const toggleExpanded = (rejectionId) => {
        setExpandedRejection(expandedRejection === rejectionId ? null : rejectionId);
    };

    return (
        <div className="rejection-notifications-card">
            <div className="card-header alert-header">
                <div className="header-left">
                    <AlertTriangle size={24} className="alert-icon" />
                    <div>
                        <h2>Submission Rejections</h2>
                        <p>{rejectionNotifications.length} {rejectionNotifications.length === 1 ? 'rejection' : 'rejections'}</p>
                    </div>
                </div>
                <button
                    className="btn-dismiss"
                    onClick={onDismiss}
                    title="Dismiss notifications"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="rejections-list">
                {rejectionNotifications.map((rejection) => (
                    <div key={rejection.id} className="rejection-item">
                        <div
                            className="rejection-header"
                            onClick={() => toggleExpanded(rejection.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    toggleExpanded(rejection.id);
                                }
                            }}
                        >
                            <div className="rejection-meta">
                                <div className="election-info">
                                    <h3>{rejection.election_name}</h3>
                                    <span className="status-badge rejection-badge">Rejected</span>
                                </div>
                                <div className="rejection-timestamp">
                                    <Clock size={14} />
                                    <span>{formatTimestamp(rejection.rejected_at)}</span>
                                </div>
                            </div>

                            <div className="expansion-toggle">
                                <span className="toggle-arrow" data-expanded={expandedRejection === rejection.id}>
                                    ▼
                                </span>
                            </div>
                        </div>

                        {expandedRejection === rejection.id && (
                            <div className="rejection-details">
                                <div className="details-section">
                                    <div className="details-row">
                                        <span className="details-label">Rejection Reason:</span>
                                        <p className="rejection-reason">{rejection.reason}</p>
                                    </div>

                                    <div className="details-row">
                                        <span className="details-label">Rejected By:</span>
                                        <div className="rejected-by-info">
                                            <User size={14} />
                                            <span>{rejection.rejected_by}</span>
                                        </div>
                                    </div>

                                    <div className="details-row">
                                        <span className="details-label">Rejected At:</span>
                                        <span className="rejection-datetime">
                                            {new Date(rejection.rejected_at).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <div className="action-hint">
                                        <p>Please review the rejection reason and resubmit your results with corrections.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="card-footer alert-footer">
                <p className="footer-message">
                    Please address the rejection reasons and resubmit your results. Contact admin support if you need clarification.
                </p>
            </div>
        </div>
    );
};

export default RejectionNotificationsCard;
