import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useElection } from '../context/ElectionContext';
import Header from '../components/Common/Header';
import Footer from '../components/Common/Footer';
import ElectionVoteForm from '../components/PollingUnit/ElectionVoteForm';
import ImageUploadWidget from '../components/PollingUnit/ImageUploadWidget';
import LiveStreamWidget from '../components/PollingUnit/LiveStreamWidget';
import CommentsSection from '../components/PollingUnit/CommentsSection';
import SubmissionStatusCard from '../components/PollingUnit/SubmissionStatusCard';
import { ArrowLeft, Clock, Radio, Calendar, Users, CheckCircle, AlertCircle, Upload, Loader, Camera, MessageSquare, Video, BarChart3, Zap } from 'lucide-react';
import { resultService } from '../services';
import '../styles/pages/PollingUnitDashboard.css';

const PollingUnitDashboard = () => {
    const { user } = useAuth();
    const { elections, loadElections } = useElection();
    const [selectedElection, setSelectedElection] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [voteData, setVoteData] = useState({});
    const [images, setImages] = useState([]);
    const [comments, setComments] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(false);

    // Submission states for each group
    const [voteSubmitting, setVoteSubmitting] = useState(false);
    const [mediaSubmitting, setMediaSubmitting] = useState(false);
    const [liveStreamSubmitting, setLiveStreamSubmitting] = useState(false);
    const [voteSubmitted, setVoteSubmitted] = useState(false);
    const [mediaSubmitted, setMediaSubmitted] = useState(false);
    const [commentSubmitted, setCommentSubmitted] = useState(false);

    // Network resilience states
    const [pendingVoteSubmission, setPendingVoteSubmission] = useState(null);
    const [pendingCommentSubmission, setPendingCommentSubmission] = useState(null);
    const [networkStatus, setNetworkStatus] = useState('online');

    // Load elections on component mount
    useEffect(() => {
        loadElections();
    }, [loadElections]);

    // Auto-refresh elections every 30 seconds to catch status changes
    useEffect(() => {
        const interval = setInterval(() => {
            loadElections();
        }, 30000);

        return () => clearInterval(interval);
    }, [loadElections]);

    // Monitor network status
    useEffect(() => {
        const handleOnline = () => {
            setNetworkStatus('online');
            // Retry pending submissions when network comes back
            if (pendingVoteSubmission) {
                retryVoteSubmission();
            }
            if (pendingCommentSubmission) {
                retryCommentSubmission();
            }
        };

        const handleOffline = () => {
            setNetworkStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [pendingVoteSubmission, pendingCommentSubmission]);

    // Fetch submission status when election is selected
    // Rejection status is now displayed inline in SubmissionStatusCard
    useEffect(() => {
        if (selectedElection && user?.unit_id) {
            setLoadingStatus(true);
            const password = sessionStorage.getItem('polling_unit_password');

            if (password) {
                // Fetch submission status (includes approval_status and rejection_reason)
                resultService
                    .getSubmissionStatus(user.unit_id, password, selectedElection)
                    .then(response => {
                        setSubmissionStatus(response.data);
                    })
                    .catch(error => {
                        console.error('Error fetching submission status:', error);
                        setSubmissionStatus(null);
                    })
                    .finally(() => {
                        setLoadingStatus(false);
                    });
            }
        } else {
            setSubmissionStatus(null);
        }
    }, [selectedElection, user?.unit_id]);

    // Auto-refresh submission status every 30 seconds to check for approval/rejection updates
    useEffect(() => {
        if (!selectedElection || !user?.unit_id) return;

        const interval = setInterval(() => {
            const password = sessionStorage.getItem('polling_unit_password');
            if (password) {
                resultService
                    .getSubmissionStatus(user.unit_id, password, selectedElection)
                    .then(response => {
                        setSubmissionStatus(response.data);
                    })
                    .catch(error => {
                        console.error('Error auto-refreshing submission status:', error);
                    });
            }
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [selectedElection, user?.unit_id]);

    const handleElectionSelect = (electionId) => {
        setSelectedElection(electionId);
        if (electionId) {
            setViewMode('detail');
        } else {
            setViewMode('grid');
        }
        setVoteData({});
        setImages([]);
        setComments('');
        setMessage({ type: '', text: '' });
    };

    const getCurrentElection = () => {
        return elections.find(e => e.id === selectedElection);
    };

    const handleVoteChange = (partyId, votes) => {
        setVoteData(prev => ({
            ...prev,
            [partyId]: votes
        }));
        setVoteSubmitted(false);
    };

    const handleImagesUpdate = (updatedImages) => {
        setImages(updatedImages);
        setMediaSubmitted(false);
    };

    const handleCommentsChange = (text) => {
        setComments(text);
        setCommentSubmitted(false);
    };

    // Retry vote submission if network was down
    const retryVoteSubmission = async () => {
        if (!pendingVoteSubmission) return;

        setVoteSubmitting(true);
        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            await resultService.submitWithEC8A(
                user.unit_id,
                password,
                selectedElection,
                pendingVoteSubmission.voteData,
                pendingVoteSubmission.ec8aImage
            );

            setMessage({
                type: 'success',
                text: 'Results submitted for admin approval! Your EC8A form and vote counts are now in the Analytics tab awaiting review.'
            });
            setVoteSubmitted(true);
            setPendingVoteSubmission(null);

            setTimeout(() => {
                setVoteData({});
                setImages([]);
                setVoteSubmitted(false);
                setMessage({ type: '', text: '' });
            }, 4000);
        } catch (error) {
            console.error('Retry vote submission error:', error);
            const isNetworkError = !error.response;

            if (!isNetworkError) {
                // On server error, stop retrying
                const serverStatusCode = error.response?.status;
                const serverMessage = error.response?.data?.error || error.response?.data?.message || `Server error (${serverStatusCode})`;
                setMessage({ type: 'error', text: `Submission failed: ${serverMessage}` });
                setPendingVoteSubmission(null);
            } else {
                setMessage({ type: 'error', text: 'Still unable to connect. Will keep retrying when network is stable.' });
            }
        } finally {
            setVoteSubmitting(false);
        }
    };

    // Retry comment submission if network was down
    const retryCommentSubmission = async () => {
        if (!pendingCommentSubmission) return;

        setMediaSubmitting(true);
        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            await resultService.addComment(user.unit_id, password, selectedElection, pendingCommentSubmission);

            setMessage({ type: 'success', text: 'Comment added successfully!' });
            setCommentSubmitted(true);
            setPendingCommentSubmission(null);

            setTimeout(() => {
                setComments('');
                setCommentSubmitted(false);
                setMessage({ type: '', text: '' });
            }, 3000);
        } catch (error) {
            console.error('Retry comment submission error:', error);
            const isNetworkError = !error.response;

            if (!isNetworkError) {
                const serverStatusCode = error.response?.status;
                const serverMessage = error.response?.data?.error || error.response?.data?.message || `Server error (${serverStatusCode})`;
                setMessage({ type: 'error', text: `Failed: ${serverMessage}` });
                setPendingCommentSubmission(null);
            } else {
                setMessage({ type: 'error', text: 'Still unable to connect. Will keep retrying when network is stable.' });
            }
        } finally {
            setMediaSubmitting(false);
        }
    };

    const submitVoteCount = async () => {
        if (Object.keys(voteData).length === 0) {
            setMessage({ type: 'error', text: 'Please enter vote counts for at least one party' });
            return;
        }
        if (images.length === 0) {
            setMessage({ type: 'error', text: 'Please upload the EC8A form image to submit results' });
            return;
        }
        setVoteSubmitting(true);
        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            // Submit vote counts + EC8A image together for approval
            const ec8aImageFile = images[0]?.file; // Use first image as EC8A form

            await resultService.submitWithEC8A(
                user.unit_id,
                password,
                selectedElection,
                voteData,
                ec8aImageFile
            );

            setMessage({
                type: 'success',
                text: 'Results submitted for admin approval! Your EC8A form and vote counts are now in the Analytics tab awaiting review.'
            });
            setVoteSubmitted(true);
            setPendingVoteSubmission(null);

            // Clear form after successful submission
            setTimeout(() => {
                setVoteData({});
                setImages([]);
                setVoteSubmitted(false);
                setMessage({ type: '', text: '' });
            }, 4000);
        } catch (error) {
            console.error('Vote submission error:', error);

            // Check if it's a network error (no response) or server error (4xx, 5xx)
            const isNetworkError = !error.response; // No response means network error
            const serverStatusCode = error.response?.status;

            // Keep the data and store pending submission for retry on network errors
            if (isNetworkError) {
                setPendingVoteSubmission({
                    voteData,
                    ec8aImage: images[0]?.file
                });
                setMessage({ type: 'error', text: 'Failed to submit. Your data has been saved and will retry automatically when network is stable.' });
            } else {
                // Server error - show specific message but keep data in form for manual retry
                const serverMessage = error.response?.data?.error || error.response?.data?.message || `Server error (${serverStatusCode})`;
                setMessage({ type: 'error', text: `Failed to submit: ${serverMessage}. Please review and try again.` });
            }
        } finally {
            setVoteSubmitting(false);
        }
    };



    const submitMediaAndComments = async () => {
        if (comments.trim().length === 0) {
            setMessage({ type: 'error', text: 'Please add a comment' });
            return;
        }
        setMediaSubmitting(true);
        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            // Add comment (separate from vote submission)
            await resultService.addComment(user.unit_id, password, selectedElection, comments);

            setMessage({ type: 'success', text: 'Comment added successfully!' });
            setCommentSubmitted(true);
            setPendingCommentSubmission(null);
            setTimeout(() => {
                setComments('');
                setCommentSubmitted(false);
                setMessage({ type: '', text: '' });
            }, 3000);
        } catch (error) {
            console.error('Comment submission error:', error);

            // Check if it's a network error or server error
            const isNetworkError = !error.response;
            const serverStatusCode = error.response?.status;

            // Keep the data in form - store for retry only on network errors
            if (isNetworkError) {
                setPendingCommentSubmission(comments);
                setMessage({ type: 'error', text: 'Failed to add comment. Your comment has been saved and will retry automatically when network is stable.' });
            } else {
                const serverMessage = error.response?.data?.error || error.response?.data?.message || `Server error (${serverStatusCode})`;
                setMessage({ type: 'error', text: `Failed to add comment: ${serverMessage}. Please try again.` });
            }
        } finally {
            setMediaSubmitting(false);
        }
    };



    const getActiveElections = () => {
        return elections.filter(e => e.status === 'active');
    };

    const getUpcomingElections = () => {
        return elections.filter(e => e.status === 'upcoming');
    };

    const getPartyCount = (election) => {
        return election.parties?.length || 0;
    };

    const renderGridView = () => {
        const activeElections = getActiveElections();
        const upcomingElections = getUpcomingElections();

        return (
            <div className="polling-unit-grid-view">
                <div className="elections-section">
                    {activeElections.length > 0 && (
                        <div className="elections-group">
                            <h2 className="section-title">
                                <Radio size={24} className="inline-icon" />Active Elections
                            </h2>
                            <div className="elections-grid">
                                {activeElections.map(election => (
                                    <div
                                        key={election.id}
                                        className="election-card active"
                                        onClick={() => handleElectionSelect(election.id)}
                                    >
                                        <div className="card-badge">
                                            <span className="live-badge" style={{ color: '#dc3545', fontWeight: 'bold' }}><Zap size={16} className="inline-icon" style={{ color: '#dc3545' }} />LIVE</span>
                                        </div>
                                        <div className="card-content">
                                            <h3 className="election-name">{election.name}</h3>
                                            <p className="election-date">
                                                <Calendar size={16} className="inline-icon" /> {new Date(election.election_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            <div className="card-meta">
                                                <span className="meta-item">
                                                    <Users size={16} className="inline-icon" /> {getPartyCount(election)} {getPartyCount(election) === 1 ? 'Party' : 'Parties'}
                                                </span>
                                            </div>
                                            {election.parties && election.parties.length > 0 && (
                                                <div className="card-parties">
                                                    {election.parties.map(party => {
                                                        const partyData = party.party_details || party;
                                                        return (
                                                            <span key={party.id || party.party} className="party-badge">
                                                                {partyData.logo_url && (
                                                                    <img
                                                                        src={partyData.logo_url}
                                                                        alt={partyData.acronym}
                                                                        className="badge-logo"
                                                                    />
                                                                )}
                                                                <span>{partyData.acronym}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-footer">
                                            <span className="status-text">Click to enter results</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {upcomingElections.length > 0 && (
                        <div className="elections-group">
                            <h2 className="section-title">
                                <Clock size={24} className="inline-icon" />Upcoming Elections
                            </h2>
                            <div className="elections-grid">
                                {upcomingElections.map(election => (
                                    <div
                                        key={election.id}
                                        className="election-card upcoming"
                                        onClick={() => handleElectionSelect(election.id)}
                                    >
                                        <div className="card-badge">
                                            <span className="upcoming-badge"><Clock size={16} className="inline-icon" />UPCOMING</span>
                                        </div>
                                        <div className="card-content">
                                            <h3 className="election-name">{election.name}</h3>
                                            <p className="election-date">
                                                <Calendar size={16} className="inline-icon" /> {new Date(election.election_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            <div className="card-meta">
                                                <span className="meta-item">
                                                    <Users size={16} className="inline-icon" /> {getPartyCount(election)} {getPartyCount(election) === 1 ? 'Party' : 'Parties'}
                                                </span>
                                            </div>
                                            {election.parties && election.parties.length > 0 && (
                                                <div className="card-parties">
                                                    {election.parties.map(party => {
                                                        const partyData = party.party_details || party;
                                                        return (
                                                            <span key={party.id || party.party} className="party-badge">
                                                                {partyData.logo_url && (
                                                                    <img
                                                                        src={partyData.logo_url}
                                                                        alt={partyData.acronym}
                                                                        className="badge-logo"
                                                                    />
                                                                )}
                                                                <span>{partyData.acronym}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-footer">
                                            <span className="status-text">Not yet started</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeElections.length === 0 && upcomingElections.length === 0 && (
                        <div className="no-elections">
                            <div className="no-elections-icon"><AlertCircle size={64} /></div>
                            <h3>No Elections Available</h3>
                            <p>There are no active or upcoming elections at the moment.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDetailView = () => {
        const currentElection = getCurrentElection();
        if (!currentElection) return null;

        const isActive = currentElection.status === 'active';

        return (
            <div className="polling-unit-detail-view">
                <div className="detail-header">
                    <button className="btn-back" onClick={() => handleElectionSelect(null)}>
                        <ArrowLeft size={20} />
                        Back to Elections
                    </button>
                    <div className="header-content-wrapper">
                        <div className="header-titles">
                            <h1>{currentElection.name}</h1>
                            <p className="detail-subtitle">
                                {isActive ? <><Radio size={18} className="inline-icon" /> LIVE - Results Entry</> : <><Clock size={18} className="inline-icon" /> Election Not Started</>}
                            </p>
                        </div>
                        {user?.unit_id && (
                            <div className="polling-unit-info">
                                <p className="unit-label">Polling Unit</p>
                                <p className="unit-id">ID: {user.unit_id}</p>
                            </div>
                        )}
                    </div>
                </div>

                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}

                {isActive && !loadingStatus && submissionStatus && (
                    <SubmissionStatusCard
                        submissionStatus={submissionStatus}
                        pollingUnitId={user?.unit_id}
                        electionId={selectedElection}
                    />
                )}

                {isActive ? (
                    <div className="detail-forms">
                        {/* Vote Counts & EC8A Submission Section */}
                        <div className="form-group-card">
                            <div className="group-header">
                                <div className="header-content">
                                    <h2><BarChart3 size={24} className="inline-icon" />Vote Counts & EC8A Form</h2>
                                    <p>Enter vote counts and upload the signed EC8A form for admin approval</p>
                                </div>
                                <div className="group-status">
                                    {voteSubmitted && <span className="status-badge status-success"><CheckCircle size={16} className="inline-icon" /> Submitted</span>}
                                    {!voteSubmitted && <span className="status-badge status-not-submitted">Not Submitted</span>}
                                    {pendingVoteSubmission && <span className="status-badge status-pending-retry"><AlertCircle size={16} className="inline-icon" /> Retrying...</span>}
                                </div>
                            </div>

                            {/* Vote Entry */}
                            <div className="group-content">
                                <div className="media-subsection">
                                    <div className="subsection-header">
                                        <h3><BarChart3 size={20} className="inline-icon" />Vote Counts</h3>
                                        <span className="subsection-label">(Required)</span>
                                    </div>
                                    <p className="subsection-description">
                                        Enter the number of votes received by each participating party. These votes will be cross-verified with your EC8A form image.
                                    </p>
                                    <ElectionVoteForm
                                        election={getCurrentElection()}
                                        voteData={voteData}
                                        onVoteChange={handleVoteChange}
                                    />
                                </div>

                                {/* EC8A Image Upload */}
                                <div className="media-subsection">
                                    <div className="subsection-header">
                                        <h3><Camera size={20} className="inline-icon" />EC8A Form Photo</h3>
                                        <span className="subsection-label">(Required - 1 photo)</span>
                                    </div>
                                    <p className="subsection-description">
                                        Upload <strong>one clear photo</strong> of the officially signed EC8A form. This image must show all vote counts and serve as proof of results.
                                    </p>
                                    <ImageUploadWidget
                                        images={images}
                                        onImagesUpdate={handleImagesUpdate}
                                        maxImages={1}
                                    />
                                </div>
                            </div>

                            <div className="group-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={submitVoteCount}
                                    disabled={voteSubmitting || Object.keys(voteData).length === 0 || images.length === 0}
                                >
                                    {voteSubmitting ? (
                                        <><Loader size={16} className="inline-icon" /> Submitting for Approval...</>
                                    ) : voteSubmitted ? (
                                        <><CheckCircle size={16} className="inline-icon" /> Submitted for Review</>
                                    ) : (
                                        <><Upload size={16} className="inline-icon" /> Submit Vote Counts & EC8A Form</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Comments Section (Optional) */}
                        <div className="form-group-card">
                            <div className="group-header">
                                <div className="header-content">
                                    <h2><MessageSquare size={24} className="inline-icon" />Additional Comments</h2>
                                    <p>Add any observations or notes about the polling process (optional)</p>
                                </div>
                                <div className="group-status">
                                    {commentSubmitted && <span className="status-badge status-success"><CheckCircle size={16} className="inline-icon" /> Submitted</span>}
                                    {!commentSubmitted && <span className="status-badge status-not-submitted">Not Submitted</span>}
                                    {pendingCommentSubmission && <span className="status-badge status-pending-retry"><AlertCircle size={16} className="inline-icon" /> Retrying...</span>}
                                </div>
                            </div>
                            <div className="group-content">
                                <CommentsSection
                                    comments={comments}
                                    onCommentsChange={handleCommentsChange}
                                />
                            </div>
                            <div className="group-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={submitMediaAndComments}
                                    disabled={mediaSubmitting || comments.trim().length === 0}
                                >
                                    {mediaSubmitting ? (
                                        <><Loader size={16} className="inline-icon" /> Submitting...</>
                                    ) : commentSubmitted ? (
                                        <><CheckCircle size={16} className="inline-icon" /> Comment Added</>
                                    ) : (
                                        <><Upload size={16} className="inline-icon" /> Add Comment</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Live Video Section */}
                        <div className="form-group-card">
                            <div className="group-header">
                                <div className="header-content">
                                    <h2><Video size={24} className="inline-icon" />Live Stream & Recording</h2>
                                    <p>Go live or record videos of the polling process</p>
                                </div>
                                <div className="group-status">
                                    {liveStreamSubmitting && <span className="status-badge status-pending-retry"><Loader size={16} className="inline-icon" /> Recording...</span>}
                                    {!liveStreamSubmitting && <span className="status-badge status-not-submitted">Optional</span>}
                                </div>
                            </div>
                            <div className="group-content">
                                <LiveStreamWidget
                                    electionId={selectedElection}
                                    pollingUnitId={user?.unit_id}
                                />
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="detail-footer">
                            <button
                                className="btn btn-secondary btn-large"
                                onClick={() => handleElectionSelect(null)}
                            >
                                <ArrowLeft size={16} /> Back to Elections
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="election-not-started">
                        <div className="not-started-content">
                            <Clock size={64} />
                            <h2>Election Not Yet Started</h2>
                            <p>This election is scheduled for {new Date(currentElection.election_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}</p>
                            <p className="secondary-text">Results entry will be available once the election begins.</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleElectionSelect(null)}
                            >
                                <ArrowLeft size={16} /> Back to Elections
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="polling-unit-dashboard-wrapper">
            <Header />

            <main className="polling-unit-dashboard">
                <div className="container">
                    {viewMode === 'grid' ? renderGridView() : renderDetailView()}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PollingUnitDashboard;
