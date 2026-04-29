import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    Home,
    Calendar,
    CheckCircle,
    BarChart3,
    Users,
    TrendingUp,
    Clock,
    Zap,
    Check
} from 'lucide-react';
import Header from '../components/Common/Header';
import Footer from '../components/Common/Footer';
import { useAuth } from '../context/AuthContext';
import { useElection } from '../context/ElectionContext';
import '../styles/pages/LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, userType } = useAuth();
    const { elections, loadElections } = useElection();

    useEffect(() => {
        if (elections.length === 0) {
            loadElections();
        }
    }, [elections.length, loadElections]);

    // Separate elections by status
    const liveElections = elections.filter(e => e.status === 'active');
    const upcomingElections = elections.filter(e => e.status === 'upcoming');
    const pastElections = elections.filter(e => e.status === 'ended').slice(0, 3);

    return (
        <div className="landing-page">
            <Header />

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <h1 className="hero-title">
                                Election Results
                                <span className="gradient-text"> Platform</span>
                            </h1>
                            <p className="hero-description">
                                Real-time election results with complete transparency and accuracy.
                                View ongoing and past election data from across all states.
                            </p>
                            <div className="hero-buttons">
                                {isAuthenticated && (
                                    <button
                                        className="btn btn-lg btn-primary"
                                        onClick={() => navigate(userType === 'admin' ? '/admin' : '/polling-unit')}
                                    >
                                        <Home size={20} />
                                        Go to Dashboard
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="hero-illustration">
                            <div className="live-elections-preview">
                                <h3>Live Elections</h3>
                                <div className="live-list">
                                    {liveElections.length > 0 ? (
                                        liveElections.map(election => (
                                            <div
                                                key={election.id}
                                                className="live-item"
                                                onClick={() => navigate(`/result-center?election=${election.id}`)}
                                                style={{ cursor: 'pointer' }}
                                                title="Click to view results"
                                            >
                                                <span className="live-indicator"><Zap size={16} style={{ color: '#dc3545' }} /></span>
                                                <span className="election-name">{election.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-live">No elections currently live</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live & Upcoming Elections Section */}
            <section className="live-upcoming-section" id="results">
                <div className="container">
                    <div className="section-header">
                        <div>
                            <h2>Current Elections</h2>
                            <p>Live and upcoming elections from your administrator</p>
                        </div>
                    </div>

                    {/* Live Elections */}
                    {liveElections.length > 0 && (
                        <div className="elections-subsection">
                            <h3 className="subsection-title"><Zap size={20} className="inline-icon" style={{ color: '#dc3545' }} /> Live Elections</h3>
                            <div className="elections-grid">
                                {liveElections.map(election => (
                                    <div
                                        key={election.id}
                                        className="election-card live-card blinking"
                                        onClick={() => navigate(`/result-center?election=${election.id}`)}
                                    >
                                        <div className="election-header">
                                            <span className="live-badge"><Zap size={16} style={{ color: '#dc3545' }} /> LIVE</span>
                                        </div>
                                        <h3>{election.name}</h3>
                                        <p className="election-date">
                                            <Calendar size={16} className="inline-icon" /> {new Date(election.election_date).toLocaleDateString()}
                                        </p>
                                        <p className="election-status">Results streaming live</p>
                                        <button className="btn btn-full btn-primary">
                                            View Results
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Elections */}
                    {upcomingElections.length > 0 && (
                        <div className="elections-subsection">
                            <h3 className="subsection-title"><Clock size={20} className="inline-icon" /> Upcoming Elections</h3>
                            <div className="elections-grid">
                                {upcomingElections.map(election => (
                                    <div
                                        key={election.id}
                                        className="election-card upcoming-card"
                                        onClick={() => navigate(`/result-center?election=${election.id}`)}
                                    >
                                        <div className="election-header">
                                            <span className="upcoming-badge"><Clock size={16} /> UPCOMING</span>
                                        </div>
                                        <h3>{election.name}</h3>
                                        <p className="election-date">
                                            <Calendar size={16} className="inline-icon" /> {new Date(election.election_date).toLocaleDateString()}
                                        </p>
                                        <p className="election-status not-started">Not yet started</p>
                                        <p className="election-subtitle" style={{ fontSize: '0.85rem', marginTop: '8px', color: '#6b7280' }}>
                                            Results will be available when election starts
                                        </p>
                                        <button className="btn btn-full btn-outline-primary">
                                            View Election
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {liveElections.length === 0 && upcomingElections.length === 0 && (
                        <div className="no-elections-message">
                            <Calendar size={48} />
                            <h3>No Elections Currently</h3>
                            <p>Check back later for ongoing and upcoming elections</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Past Elections Section */}
            <section className="past-elections-section">
                <div className="container">
                    <div className="section-header">
                        <div>
                            <h2>Past Elections</h2>
                            <p>Browse completed and archived elections</p>
                        </div>
                        {pastElections.length > 0 && (
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => navigate('/past-elections')}
                            >
                                View All Elections
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>

                    {pastElections.length > 0 ? (
                        <div className="elections-grid">
                            {pastElections.map(election => (
                                <div
                                    key={election.id}
                                    className="election-card past-card"
                                    onClick={() => navigate(`/result-center?election=${election.id}`)}
                                >
                                    <div className="election-header">
                                        <span className="completed-badge"><Check size={16} /> COMPLETED</span>
                                    </div>
                                    <h3>{election.name}</h3>
                                    <div className="election-date">
                                        <Calendar size={16} className="inline-icon" /> {new Date(election.election_date).toLocaleDateString()}
                                    </div>

                                    <div className="election-results">
                                        <div className="result-item">
                                            <span className="result-label">Status:</span>
                                            <span className="result-value">{election.status}</span>
                                        </div>
                                    </div>

                                    <button className="btn btn-full btn-outline-primary">
                                        View Results
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-elections-message">
                            <CheckCircle size={48} />
                            <h3>No Past Elections Yet</h3>
                            <p>Completed elections will appear here</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header">
                        <div>
                            <h2>Why Poll Watch?</h2>
                            <p>Trusted platform for transparent election monitoring</p>
                        </div>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon primary">
                                <BarChart3 size={24} />
                            </div>
                            <h3>Real-Time Results</h3>
                            <p>Get instant access to election results as they are submitted and verified.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon secondary">
                                <Users size={24} />
                            </div>
                            <h3>Complete Transparency</h3>
                            <p>Every vote counted and every result publicly available for verification.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon success">
                                <TrendingUp size={24} />
                            </div>
                            <h3>Detailed Analytics</h3>
                            <p>Comprehensive data analytics and historical election insights.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon info">
                                <Clock size={24} />
                            </div>
                            <h3>24/7 Access</h3>
                            <p>Access election results anytime, anywhere with our reliable platform.</p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LandingPage;
