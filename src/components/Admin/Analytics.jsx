import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, X, AlertCircle, Download } from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import api from '../../services/api';
import '../../styles/admin/analytics.css';

const Analytics = () => {
    const { elections, loadElections } = useElection();
    const [selectedElectionId, setSelectedElectionId] = useState('');
    const [election, setElection] = useState(null);
    const [lgas, setLgas] = useState({});
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [selectedLgaTab, setSelectedLgaTab] = useState(null); // Track selected LGA tab
    const [expandedSubmission, setExpandedSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingSubmission, setEditingSubmission] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [partyMap, setPartyMap] = useState({}); // Map party IDs to names

    // Create party map from election object
    useEffect(() => {
        if (election && election.parties) {
            const map = {};
            election.parties.forEach(party => {
                map[party.id] = party.name;
            });
            setPartyMap(map);
        }
    }, [election]);

    // Load elections on mount
    useEffect(() => {
        if (elections.length === 0) {
            loadElections().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    // Fetch pending results when election is selected
    useEffect(() => {
        if (selectedElectionId) {
            loadPendingResults();
        }
    }, [selectedElectionId]);

    const loadPendingResults = async () => {
        try {
            setLoading(true);

            if (!selectedElectionId) {
                setError('Please select an election from the dropdown above');
                setLoading(false);
                return;
            }

            const response = await api.get(
                `/results/analytics/pending/?election_id=${selectedElectionId}`
            );

            setElection(response.data.election);
            setLgas(response.data.lgas);
            setStats(response.data.overall_stats);
            setError('');

            // Auto-select first LGA on load
            const lgaNames = Object.keys(response.data.lgas);
            if (lgaNames.length > 0) {
                setSelectedLgaTab(lgaNames[0]);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to load pending results');
        } finally {
            setLoading(false);
        }
    };

    const approveSubmission = async (submissionId, editedVotes = null) => {
        try {
            setProcessingId(submissionId);

            await api.post('/results/analytics/approve/', {
                submission_id: submissionId,
                edited_votes: editedVotes,
            });

            await loadPendingResults();
            setEditingSubmission(null);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to approve result');
        } finally {
            setProcessingId(null);
        }
    };

    const rejectSubmission = async (submissionId, reason) => {
        try {
            setProcessingId(submissionId);

            await api.post('/results/analytics/reject/', {
                submission_id: submissionId,
                reason: reason,
            });

            await loadPendingResults();
            setRejectReason('');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to reject result');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading && elections.length === 0) {
        return <div className="analytics-container"><div className="loading">Loading elections...</div></div>;
    }

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h2>Result Audit & Approval</h2>

                {/* Election Selector */}
                <div className="election-selector-wrapper">
                    <label htmlFor="election-select" className="election-label">Select Election:</label>
                    <select
                        id="election-select"
                        className="election-select"
                        value={selectedElectionId}
                        onChange={(e) => setSelectedElectionId(e.target.value)}
                    >
                        <option value="">-- Choose an election --</option>
                        {elections.map((election) => (
                            <option key={election.id} value={election.id}>
                                {election.name} ({election.status})
                            </option>
                        ))}
                    </select>
                </div>

                {election && <p className="election-name">Election: {election.name}</p>}
            </div>

            {error && <div className="error-message">{error}</div>}

            {!selectedElectionId ? (
                <div className="no-election-selected">
                    <AlertCircle size={48} />
                    <h3>No Election Selected</h3>
                    <p>Please select an election from the dropdown above to view and manage pending result submissions.</p>
                </div>
            ) : (
                <>
                    {/* Overall Statistics - Combined Across All LGAs */}
                    <div className="analytics-stats-section">
                        <h3>Overall Statistics (All LGAs)</h3>
                        <div className="stats-grid">
                            <div className="stat-card pending">
                                <div className="stat-number">{stats.pending}</div>
                                <div className="stat-label">Pending Review</div>
                                <AlertCircle size={20} />
                            </div>
                            <div className="stat-card approved">
                                <div className="stat-number">{stats.approved}</div>
                                <div className="stat-label">Approved</div>
                                <Check size={20} />
                            </div>
                            <div className="stat-card rejected">
                                <div className="stat-number">{stats.rejected}</div>
                                <div className="stat-label">Rejected</div>
                                <X size={20} />
                            </div>
                        </div>
                    </div>

                    {/* LGA Tabs */}
                    <div className="lga-tabs-container">
                        <div className="lga-tabs">
                            {Object.entries(lgas).map(([lgaName, lgaData]) => {
                                const pendingCount = lgaData.submissions.filter(s => s.status === 'pending').length;
                                const approvedCount = lgaData.submissions.filter(s => s.status === 'approved').length;
                                const rejectedCount = lgaData.submissions.filter(s => s.status === 'rejected').length;
                                const totalCount = pendingCount + approvedCount + rejectedCount;

                                return (
                                    <button
                                        key={lgaData.lga_id}
                                        className={`lga-tab ${selectedLgaTab === lgaName ? 'active' : ''}`}
                                        onClick={() => setSelectedLgaTab(lgaName)}
                                    >
                                        <div className="tab-name">{lgaName}</div>
                                        <div className="tab-count">{totalCount} results</div>
                                        <div className="tab-status-badges">
                                            {pendingCount > 0 && <span className="badge-mini pending">{pendingCount}P</span>}
                                            {approvedCount > 0 && <span className="badge-mini approved">{approvedCount}A</span>}
                                            {rejectedCount > 0 && <span className="badge-mini rejected">{rejectedCount}R</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected LGA Content */}
                    {selectedLgaTab && lgas[selectedLgaTab] && (
                        <div className="lga-content">
                            {/* LGA Statistics */}
                            <div className="lga-stats-section">
                                <h3>Results for {selectedLgaTab}</h3>
                                <div className="stats-grid">
                                    <div className="stat-card pending">
                                        <div className="stat-number">
                                            {lgas[selectedLgaTab].submissions.filter(s => s.status === 'pending').length}
                                        </div>
                                        <div className="stat-label">Pending Review</div>
                                        <AlertCircle size={20} />
                                    </div>
                                    <div className="stat-card approved">
                                        <div className="stat-number">
                                            {lgas[selectedLgaTab].submissions.filter(s => s.status === 'approved').length}
                                        </div>
                                        <div className="stat-label">Approved</div>
                                        <Check size={20} />
                                    </div>
                                    <div className="stat-card rejected">
                                        <div className="stat-number">
                                            {lgas[selectedLgaTab].submissions.filter(s => s.status === 'rejected').length}
                                        </div>
                                        <div className="stat-label">Rejected</div>
                                        <X size={20} />
                                    </div>
                                </div>
                            </div>

                            {/* Pending Submissions in this LGA */}
                            {lgas[selectedLgaTab].submissions.filter(s => s.status === 'pending').length > 0 && (
                                <div className="status-section">
                                    <div className="section-divider">
                                        <h4>Pending Approvals</h4>
                                    </div>
                                    <div className="submissions-list">
                                        {lgas[selectedLgaTab].submissions
                                            .filter(s => s.status === 'pending')
                                            .map((submission) => (
                                                <ResultSubmissionItem
                                                    key={submission.id}
                                                    submission={submission}
                                                    partyMap={partyMap}
                                                    isExpanded={expandedSubmission === submission.id}
                                                    onToggleExpand={() =>
                                                        setExpandedSubmission(
                                                            expandedSubmission === submission.id ? null : submission.id
                                                        )
                                                    }
                                                    onApprove={approveSubmission}
                                                    onReject={rejectSubmission}
                                                    isProcessing={processingId === submission.id}
                                                    onEdit={setEditingSubmission}
                                                    isEditing={editingSubmission?.id === submission.id}
                                                    editData={editingSubmission}
                                                    rejectReason={rejectReason}
                                                    onRejectReasonChange={setRejectReason}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Approved Submissions in this LGA */}
                            {lgas[selectedLgaTab].submissions.filter(s => s.status === 'approved').length > 0 && (
                                <div className="status-section">
                                    <div className="section-divider">
                                        <h4>Approved Results</h4>
                                    </div>
                                    <div className="submissions-list approved-list">
                                        {lgas[selectedLgaTab].submissions
                                            .filter(s => s.status === 'approved')
                                            .map((submission) => (
                                                <ResultSubmissionItem
                                                    key={submission.id}
                                                    submission={submission}
                                                    partyMap={partyMap}
                                                    isExpanded={expandedSubmission === submission.id}
                                                    onToggleExpand={() =>
                                                        setExpandedSubmission(
                                                            expandedSubmission === submission.id ? null : submission.id
                                                        )
                                                    }
                                                    onApprove={approveSubmission}
                                                    onReject={rejectSubmission}
                                                    isProcessing={processingId === submission.id}
                                                    onEdit={setEditingSubmission}
                                                    isEditing={editingSubmission?.id === submission.id}
                                                    editData={editingSubmission}
                                                    rejectReason={rejectReason}
                                                    onRejectReasonChange={setRejectReason}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Rejected Submissions in this LGA */}
                            {lgas[selectedLgaTab].submissions.filter(s => s.status === 'rejected').length > 0 && (
                                <div className="status-section">
                                    <div className="section-divider">
                                        <h4>Rejected Results</h4>
                                    </div>
                                    <div className="submissions-list rejected-list">
                                        {lgas[selectedLgaTab].submissions
                                            .filter(s => s.status === 'rejected')
                                            .map((submission) => (
                                                <ResultSubmissionItem
                                                    key={submission.id}
                                                    submission={submission}
                                                    partyMap={partyMap}
                                                    isExpanded={expandedSubmission === submission.id}
                                                    onToggleExpand={() =>
                                                        setExpandedSubmission(
                                                            expandedSubmission === submission.id ? null : submission.id
                                                        )
                                                    }
                                                    onApprove={approveSubmission}
                                                    onReject={rejectSubmission}
                                                    isProcessing={processingId === submission.id}
                                                    onEdit={setEditingSubmission}
                                                    isEditing={editingSubmission?.id === submission.id}
                                                    editData={editingSubmission}
                                                    rejectReason={rejectReason}
                                                    onRejectReasonChange={setRejectReason}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* No results message */}
                            {lgas[selectedLgaTab].submissions.length === 0 && (
                                <div className="no-results-message">
                                    <AlertCircle size={32} />
                                    <p>No submissions for {selectedLgaTab}</p>
                                </div>
                            )}
                        </div>
                    )}

                </>
            )}
        </div>
    );
};

/**
 * Individual Result Submission Item (Expandable)
 */
const ResultSubmissionItem = ({
    submission,
    partyMap,
    isExpanded,
    onToggleExpand,
    onApprove,
    onReject,
    isProcessing,
    onEdit,
    isEditing,
    editData,
    rejectReason,
    onRejectReasonChange,
}) => {
    const getStatusBadge = (status) => {
        const badges = {
            pending: { class: 'badge-pending', text: 'Pending' },
            approved: { class: 'badge-approved', text: 'Approved' },
            rejected: { class: 'badge-rejected', text: 'Rejected' },
        };
        return badges[status] || badges.pending;
    };

    const badge = getStatusBadge(submission.status);
    const [editedVotes, setEditedVotes] = useState(submission.vote_data);

    return (
        <div className="result-item">
            {/* Result Header */}
            <div className="result-header" onClick={onToggleExpand}>
                <div className="result-info">
                    <div className="result-title">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        <span className="polling-unit-name">
                            {submission.polling_unit.name}
                        </span>
                        <span className="polling-unit-id">({submission.polling_unit.unit_id})</span>
                    </div>
                    <span className={`status-badge ${badge.class}`}>{badge.text}</span>
                </div>
                <div className="result-timestamp">
                    {new Date(submission.submitted_at).toLocaleString()}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="result-expanded">
                    {/* EC8A Form Image */}
                    <div className="ec8a-section">
                        <h4>EC8A Form</h4>
                        {submission.ec8a_form_image && (
                            <img
                                src={submission.ec8a_form_image}
                                alt="EC8A Form"
                                className="ec8a-image"
                            />
                        )}
                    </div>

                    {/* Vote Counts */}
                    <div className="vote-counts-section">
                        <h4>Vote Counts</h4>
                        <div className="vote-counts">
                            {Object.entries(isEditing ? editedVotes : submission.vote_data).map(
                                ([partyId, voteCount]) => (
                                    <div key={partyId} className="vote-count-item">
                                        <span className="party-id">
                                            {partyMap[partyId] || partyId.substring(0, 8) + '...'}
                                        </span>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={voteCount}
                                                onChange={(e) => {
                                                    const newVotes = { ...editedVotes };
                                                    newVotes[partyId] = parseInt(e.target.value) || 0;
                                                    setEditedVotes(newVotes);
                                                }}
                                                className="vote-input"
                                            />
                                        ) : (
                                            <span className="vote-value">{voteCount}</span>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Admin Notes */}
                    {submission.admin_notes && (
                        <div className="admin-notes">
                            <h4>Admin Notes</h4>
                            <p>{submission.admin_notes}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {submission.status === 'pending' && (
                        <div className="action-buttons">
                            {isEditing ? (
                                <>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => onApprove(submission.id, editedVotes)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? 'Processing...' : 'Save & Approve'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => onEdit(null)}
                                    >
                                        Cancel Edit
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => onApprove(submission.id, null)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? 'Processing...' : '✓ Approve'}
                                    </button>
                                    <button
                                        className="btn btn-warning"
                                        onClick={() => onEdit(submission)}
                                    >
                                        ✎ Edit & Approve
                                    </button>
                                    <div className="reject-section">
                                        <input
                                            type="text"
                                            placeholder="Reason for rejection..."
                                            value={rejectReason}
                                            onChange={(e) => onRejectReasonChange(e.target.value)}
                                            className="reject-input"
                                        />
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => onReject(submission.id, rejectReason)}
                                            disabled={isProcessing || !rejectReason}
                                        >
                                            {isProcessing ? 'Processing...' : '✕ Reject'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Analytics;
