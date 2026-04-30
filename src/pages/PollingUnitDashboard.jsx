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
    const [voteSubmitted, setVoteSubmitted] = useState(false);
    const [mediaSubmitted, setMediaSubmitted] = useState(false);

    // Load elections on component mount and when returning from detail view
    useEffect(() => {
        loadElections();
    }, [loadElections]);

    // Auto-refresh elections every 30 seconds to catch status changes (upcoming → active)
    useEffect(() => {
        const interval = setInterval(() => {
            loadElections();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [loadElections]);

    // Fetch submission status when election is selected
    useEffect(() => {
        if (selectedElection && user?.unit_id) {
            setLoadingStatus(true);
            const password = sessionStorage.getItem('polling_unit_password');

            if (password) {
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
        setMessage({ type: '', text: '' });  // Remove preRecordedVideos from reset
    };

    const getCurrentElection = () => {
        return elections.find(e => e.id === selectedElection);
    };

    const handleVoteChange = (partyId, votes) => {
        setVoteData(prev => ({
            ...prev,
            [partyId]: votes
        }));
        // Reset voteSubmitted flag to allow resubmission when votes are changed
        setVoteSubmitted(false);
    };

    const handleImagesUpdate = (updatedImages) => {
        setImages(updatedImages);
        // Reset mediaSubmitted flag to allow resubmission of additional media
        setMediaSubmitted(false);
    };

    const handleCommentsChange = (text) => {
        setComments(text);
        // Reset mediaSubmitted flag to allow resubmission when new comments are added
        setMediaSubmitted(false);
    };

    const submitVoteCount = async () => {
        if (Object.keys(voteData).length === 0) {
            setMessage({ type: 'error', text: 'Please enter vote counts for at least one party' });
            return;
        }
        setVoteSubmitting(true);
        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            // Convert voteData to results array format
            const results = Object.entries(voteData).map(([partyId, voteCount]) => ({
                party_id: partyId,
                vote_count: parseInt(voteCount) || 0,
            }));

            await resultService.submitResults(user.unit_id, password, selectedElection, results);
            setMessage({ type: 'success', text: 'Vote counts submitted successfully!' });
            setVoteSubmitted(true);
        } catch (error) {
            console.error('Vote submission error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || error.message || 'Failed to submit vote counts' });
        } finally {
            setVoteSubmitting(false);
        }
    };

    const submitMediaAndComments = async () => {
        if (images.length === 0 && comments.trim().length === 0) {
            setMessage({ type: 'error', text: 'Please upload at least one image or add comments' });
            return;
        }
        setMediaSubmitting(true);
        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            // Upload images
            for (const image of images) {
                await resultService.uploadMedia(user.unit_id, password, selectedElection, image.file, 'image');
            }

            // Add comment if provided
            if (comments.trim().length > 0) {
                await resultService.addComment(user.unit_id, password, selectedElection, comments);
            }

            setMessage({ type: 'success', text: 'Photos and comments submitted successfully!' });
            setMediaSubmitted(true);
            // Clear form for next batch of submissions
            setTimeout(() => {
                setImages([]);
                setComments('');
                setMediaSubmitted(false);
            }, 2000);
        } catch (error) {
            console.error('Media submission error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || error.message || 'Failed to submit photos and comments' });
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
                    <h1>{currentElection.name}</h1>
                    <p className="detail-subtitle">
                        {isActive ? <><Radio size={18} className="inline-icon" /> LIVE - Results Entry</> : <><Clock size={18} className="inline-icon" /> Election Not Started</>}
                    </p>
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
                        {/* Vote Counts Section */}
                        <div className="form-group-card">
                            <div className="group-header">
                                <div className="header-content">
                                    <h2><BarChart3 size={24} className="inline-icon" />Vote Counts</h2>
                                    <p>Enter the number of votes received by each participating party</p>
                                </div>
                                <div className="group-status">
                                    {voteSubmitted && <span className="status-badge status-success"><CheckCircle size={16} className="inline-icon" /> Submitted</span>}
                                    {!voteSubmitted && Object.keys(voteData).length > 0 && <span className="status-badge status-pending"><Loader size={16} className="inline-icon" /> Pending</span>}
                                </div>
                            </div>
                            <div className="group-content">
                                <ElectionVoteForm
                                    election={currentElection}
                                    voteData={voteData}
                                    onVoteChange={handleVoteChange}
                                />
                            </div>
                            <div className="group-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={submitVoteCount}
                                    disabled={voteSubmitting || Object.keys(voteData).length === 0}
                                >
                                    {voteSubmitting ? <><Loader size={16} className="inline-icon" /> Submitting...</> : voteSubmitted ? <><CheckCircle size={16} className="inline-icon" /> Submitted</> : <><Upload size={16} className="inline-icon" /> Submit Vote Counts</>
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Photos & Comments Section */}
                        <div className="form-group-card">
                            <div className="group-header">
                                <div className="header-content">
                                    <h2><Camera size={24} className="inline-icon" />Evidence & Observations</h2>
                                    <p>Upload photos and add comments about the polling process</p>
                                </div>
                                <div className="group-status">
                                    {mediaSubmitted && <span className="status-badge status-success"><CheckCircle size={16} className="inline-icon" /> Submitted</span>}
                                    {!mediaSubmitted && (images.length > 0 || comments.trim().length > 0) && <span className="status-badge status-pending"><Loader size={16} className="inline-icon" /> Pending</span>}
                                </div>
                            </div>
                            <div className="group-content">
                                <div className="media-subsection">
                                    <div className="subsection-header">
                                        <h3><Camera size={20} className="inline-icon" />Upload Photos</h3>
                                        <span className="subsection-label">(Up to 10 photos)</span>
                                    </div>
                                    <ImageUploadWidget
                                        images={images}
                                        onImagesUpdate={handleImagesUpdate}
                                        maxImages={10}
                                    />
                                </div>
                                <div className="media-subsection">
                                    <div className="subsection-header">
                                        <h3><MessageSquare size={20} className="inline-icon" />Comments</h3>
                                        <span className="subsection-label">(Optional)</span>
                                    </div>
                                    <CommentsSection
                                        comments={comments}
                                        onCommentsChange={handleCommentsChange}
                                    />
                                </div>
                            </div>
                            <div className="group-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={submitMediaAndComments}
                                    disabled={mediaSubmitting || (images.length === 0 && comments.trim().length === 0)}
                                >
                                    {mediaSubmitting ? <><Loader size={16} className="inline-icon" /> Submitting...</> : mediaSubmitted ? <><CheckCircle size={16} className="inline-icon" /> Submitted</> : <><Upload size={16} className="inline-icon" /> Submit Media & Comments</>
                                    }
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
