import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Image as ImageIcon, Video, MessageSquare, BarChart3, Download } from 'lucide-react';
import BulkDownloadModal from '../Common/BulkDownloadModal';
import '../../styles/components/SubmissionStatusCard.css';

const SubmissionStatusCard = ({ submissionStatus, pollingUnitId, electionId }) => {
    const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);

    if (!submissionStatus) {
        return (
            <div className="submission-status-card loading">
                <div className="status-shimmer"></div>
            </div>
        );
    }

    const { submissions, submission_summary } = submissionStatus;

    if (!submissions) {
        return null;
    }

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Not submitted';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / 60000);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const SubmissionItem = ({ submission, title, icon: Icon, type }) => {
        const isSubmitted = submission.submitted;
        const mergeBehavior = submission.merge_behavior;

        return (
            <div className={`submission-item ${isSubmitted ? 'submitted' : 'pending'}`}>
                <div className="item-header">
                    <div className="item-title">
                        <Icon size={20} className="item-icon" />
                        <span>{title}</span>
                        {submission.count > 0 && (
                            <span className="item-count">{submission.count}</span>
                        )}
                    </div>
                    <div className="item-actions">
                        {isSubmitted && (type === 'images' || type === 'videos') && submission.count > 0 && (
                            <button
                                className="download-action-button"
                                onClick={() => setShowBulkDownloadModal(true)}
                                title={`Download ${type}`}
                            >
                                <Download size={16} />
                            </button>
                        )}
                        {isSubmitted && (
                            <span className="item-badge submitted-badge">
                                <CheckCircle size={16} />
                                Submitted
                            </span>
                        )}
                        {!isSubmitted && (
                            <span className="item-badge pending-badge">
                                <AlertCircle size={16} />
                                Not submitted
                            </span>
                        )}
                    </div>
                </div>

                <div className="item-behavior">
                    {mergeBehavior === 'OVERRIDE' && (
                        <div className="behavior-warning">
                            <span className="behavior-badge override">Override</span>
                            <span className="behavior-text">
                                New submission will <strong>replace</strong> the previous one
                            </span>
                        </div>
                    )}
                    {mergeBehavior === 'ADD_TO_EXISTING' && (
                        <div className="behavior-info">
                            <span className="behavior-badge additive">Additive</span>
                            <span className="behavior-text">
                                New submissions will be <strong>added</strong> to existing ones
                            </span>
                        </div>
                    )}
                </div>

                {isSubmitted && submission.submitted_at && (
                    <div className="item-timestamp">
                        <Clock size={14} />
                        <span>Submitted: {formatTimestamp(submission.submitted_at)}</span>
                    </div>
                )}

                {submission.details && submission.details.length > 0 && type === 'votes' && (
                    <div className="item-details">
                        <div className="details-label">Current vote counts:</div>
                        <div className="vote-details">
                            {submission.details.map((detail, idx) => (
                                <div key={idx} className="vote-detail">
                                    <span className="party-name">{detail.party_acronym}</span>
                                    <span className="vote-count">{detail.vote_count} votes</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {submission.count > 0 && submission.first_submitted_at && type !== 'votes' && (
                    <div className="item-details">
                        <div className="details-timeline">
                            <span className="detail-first">
                                <Clock size={12} /> First: {formatTimestamp(submission.first_submitted_at)}
                            </span>
                            {submission.last_submitted_at && (
                                <span className="detail-last">
                                    <Clock size={12} /> Latest: {formatTimestamp(submission.last_submitted_at)}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {type === 'images' && submission.remaining < submission.max_allowed && (
                    <div className="item-capacity">
                        <div className="capacity-bar">
                            <div
                                className="capacity-fill"
                                style={{ width: `${(submission.count / submission.max_allowed) * 100}%` }}
                            ></div>
                        </div>
                        <span className="capacity-text">
                            {submission.count}/{submission.max_allowed} slots used
                            {submission.remaining > 0 && ` (${submission.remaining} remaining)`}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="submission-status-card">
                <div className="card-header">
                    <div className="header-title">
                        <BarChart3 size={24} />
                        <div>
                            <h3>Submission Status</h3>
                            <p>What you've submitted for this election</p>
                        </div>
                    </div>
                    <div className="header-summary">
                        {Object.values(submission_summary).filter(Boolean).length === 0 ? (
                            <span className="summary-text no-submissions">No submissions yet</span>
                        ) : (
                            <span className="summary-text has-submissions">
                                {Object.values(submission_summary).filter(Boolean).length} of 4 categories submitted
                            </span>
                        )}
                    </div>
                </div>

                <div className="submissions-list">
                    <SubmissionItem
                        submission={submissions.vote_counts}
                        title="Vote Counts"
                        icon={BarChart3}
                        type="votes"
                    />
                    <SubmissionItem
                        submission={submissions.images}
                        title="Photos"
                        icon={ImageIcon}
                        type="images"
                    />
                    <SubmissionItem
                        submission={submissions.videos}
                        title="Videos"
                        icon={Video}
                        type="videos"
                    />
                    <SubmissionItem
                        submission={submissions.comments}
                        title="Comments"
                        icon={MessageSquare}
                        type="comments"
                    />
                </div>

                <div className="card-footer">
                    <div className="legend">
                        <div className="legend-item">
                            <span className="legend-color override"></span>
                            <span>Override: Replaces previous submission</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color additive"></span>
                            <span>Additive: Adds to existing submissions</span>
                        </div>
                    </div>
                </div>
            </div>

            <BulkDownloadModal
                isOpen={showBulkDownloadModal}
                onClose={() => setShowBulkDownloadModal(false)}
                election={electionId}
                pollingUnitId={pollingUnitId}
                counts={{
                    images: submissions.images.count || 0,
                    videos: submissions.videos.count || 0
                }}
            />
        </>
    );
};

export default SubmissionStatusCard;
