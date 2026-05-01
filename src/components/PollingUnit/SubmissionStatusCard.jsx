import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Image as ImageIcon, Video, MessageSquare, BarChart3, Download, Camera } from 'lucide-react';
import BulkDownloadModal from '../Common/BulkDownloadModal';
import '../../styles/components/SubmissionStatusCard.css';

const SubmissionStatusCard = ({ submissionStatus, pollingUnitId, electionId }) => {
    const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);
    const [showRejectionReason, setShowRejectionReason] = useState(false);

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

    // Get approval status for vote counts
    const voteApprovalStatus = submissions.vote_counts?.approval_status;
    const voteRejectionReason = submissions.vote_counts?.rejection_reason;

    const getApprovalStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return { class: 'status-approved', text: 'Submitted - Approved', icon: CheckCircle };
            case 'pending':
                return { class: 'status-pending-approval', text: 'Submitted - Pending Approval', icon: Clock };
            case 'rejected':
                return { class: 'status-rejected', text: 'Rejected', icon: AlertCircle };
            default:
                return { class: 'status-not-submitted', text: 'Not submitted', icon: AlertCircle };
        }
    };

    const VoteAndImageItem = ({ voteSubmission, imageSubmission }) => {
        const statusInfo = getApprovalStatusBadge(voteApprovalStatus);
        const StatusIcon = statusInfo.icon;

        return (
            <div className={`submission-item combined-item ${voteApprovalStatus || 'not-submitted'}`}>
                <div className="item-header">
                    <div className="item-title">
                        <BarChart3 size={20} className="item-icon" />
                        <span>Vote Count & EC8A Form</span>
                    </div>
                    <div className="item-actions">
                        {imageSubmission.count > 0 && (
                            <button
                                className="download-action-button"
                                onClick={() => setShowBulkDownloadModal(true)}
                                title="Download EC8A form image"
                            >
                                <Download size={16} />
                            </button>
                        )}
                        <span className={`item-badge approval-badge ${statusInfo.class}`}>
                            <StatusIcon size={16} />
                            {statusInfo.text}
                        </span>
                    </div>
                </div>

                {voteApprovalStatus === 'rejected' && voteRejectionReason && (
                    <div className="item-rejection">
                        <button
                            className="rejection-reason-button"
                            onClick={() => setShowRejectionReason(!showRejectionReason)}
                        >
                            <AlertCircle size={14} />
                            View rejection reason
                        </button>
                        {showRejectionReason && (
                            <div className="rejection-reason-content">
                                <p>{voteRejectionReason}</p>
                                <small>You can submit a new vote count & EC8A form to reapply for approval</small>
                            </div>
                        )}
                    </div>
                )}

                {voteSubmission.submitted && (
                    <div className="item-timestamp">
                        <Clock size={14} />
                        <span>Submitted: {formatTimestamp(voteSubmission.submitted_at)}</span>
                    </div>
                )}

                {voteSubmission.details && voteSubmission.details.length > 0 && (
                    <div className="item-details">
                        <div className="details-label">Current vote counts:</div>
                        <div className="vote-details">
                            {voteSubmission.details.map((detail, idx) => (
                                <div key={idx} className="vote-detail">
                                    <span className="party-name">{detail.party_acronym}</span>
                                    <span className="vote-count">{detail.vote_count} votes</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {imageSubmission.count > 0 && imageSubmission.first_submitted_at && (
                    <div className="item-details">
                        <div className="details-timeline">
                            <span className="detail-first">
                                <Camera size={12} /> EC8A Form: {formatTimestamp(imageSubmission.first_submitted_at)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const SimpleSubmissionItem = ({ submission, title, icon: Icon, type }) => {
        const isSubmitted = submission.submitted;

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
                        {isSubmitted && (type === 'videos') && submission.count > 0 && (
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
                                Pending submission
                            </span>
                        )}
                    </div>
                </div>

                {isSubmitted && submission.submitted_at && (
                    <div className="item-timestamp">
                        <Clock size={14} />
                        <span>Submitted: {formatTimestamp(submission.submitted_at)}</span>
                    </div>
                )}

                {submission.count > 0 && submission.first_submitted_at && (
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
                            <p>Status of each submission category</p>
                        </div>
                    </div>
                    <div className="header-summary">
                        {!submissions.vote_counts?.submitted && !submissions.videos?.submitted && !submissions.comments?.submitted ? (
                            <span className="summary-text no-submissions">No submissions yet</span>
                        ) : (
                            <span className="summary-text has-submissions">
                                {[submissions.vote_counts?.submitted, submissions.videos?.submitted, submissions.comments?.submitted].filter(Boolean).length} of 3 categories submitted
                            </span>
                        )}
                    </div>
                </div>

                <div className="submissions-list">
                    {/* Combined Vote Counts & EC8A Form Category */}
                    <VoteAndImageItem
                        voteSubmission={submissions.vote_counts}
                        imageSubmission={submissions.images}
                    />

                    {/* Videos Category */}
                    <SimpleSubmissionItem
                        submission={submissions.videos}
                        title="Videos"
                        icon={Video}
                        type="videos"
                    />

                    {/* Comments Category */}
                    <SimpleSubmissionItem
                        submission={submissions.comments}
                        title="Comments"
                        icon={MessageSquare}
                        type="comments"
                    />
                </div>

                <div className="card-footer">
                    <div className="legend">
                        <div className="legend-item">
                            <span className="legend-color approved"></span>
                            <span>Approved: Your submission has been reviewed and approved</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color pending-approval"></span>
                            <span>Pending Approval: Awaiting admin review</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color rejected"></span>
                            <span>Rejected: Your submission was rejected. Click to view reason</span>
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
