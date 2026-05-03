import React, { useState } from 'react';
import Header from '../components/Common/Header';
import Footer from '../components/Common/Footer';
import { BarChart3, Airplay, MapPin, CheckCircle, TrendingUp, Shield, Eye, ArrowLeft, Calendar, Users, Zap, Clock, AlertCircle, Radio, Archive } from 'lucide-react';
import { useElection } from '../context/ElectionContext';
import WardForm from '../components/Admin/WardForm';
import PollingUnitForm from '../components/Admin/PollingUnitForm';
import PartyForm from '../components/Admin/PartyForm';
import ElectionForm from '../components/Admin/ElectionForm';
import ResultsCenter from '../components/Admin/ResultsCenter';
import Analytics from '../components/Admin/Analytics';
import ResultCenterPage from './ResultCenterPage';
import '../styles/pages/AdminDashboard.css';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('elections');
    const [selectedPublicResultElection, setSelectedPublicResultElection] = useState(null);
    const { elections, loadElections } = useElection();

    React.useEffect(() => {
        loadElections();
    }, [loadElections]);

    const tabs = [
        { id: 'elections', label: 'Elections', icon: BarChart3 },
        { id: 'parties', label: 'Parties', icon: Airplay },
        { id: 'wards', label: 'Wards', icon: MapPin },
        { id: 'polling-units', label: 'Polling Units', icon: CheckCircle },
        { id: 'results', label: 'Results', icon: TrendingUp },
        { id: 'analytics', label: 'Analytics', icon: Shield },
        { id: 'public-result', label: 'Public Result', icon: Eye },
    ];

    const getPartyCount = (election) => {
        return election.parties?.length || 0;
    };

    const renderPublicResultsGrid = () => {
        const activeElections = elections.filter(e => e.status === 'active');
        const upcomingElections = elections.filter(e => e.status === 'upcoming');
        const pastElections = elections.filter(e => e.status === 'ended' || e.status === 'completed' || e.status === 'past');

        return (
            <div style={{ padding: '20px' }}>
                {activeElections.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Radio size={24} />Active Elections
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {activeElections.map(election => (
                                <div
                                    key={election.id}
                                    onClick={() => setSelectedPublicResultElection(election.id)}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        borderTop: '4px solid #1e40af'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                                    }}
                                >
                                    <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)', borderBottom: '1px solid #e0e7ff', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#dc3545', boxShadow: '0 2px 8px rgba(220, 53, 69, 0.2)' }}>
                                            <Zap size={16} />LIVE
                                        </span>
                                    </div>
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af', margin: 0, lineHeight: 1.4 }}>{election.name}</h3>
                                        <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={16} /> {new Date(election.election_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', padding: '6px 12px', background: '#f3f4f6', borderRadius: '20px' }}>
                                                <Users size={16} /> {getPartyCount(election)} {getPartyCount(election) === 1 ? 'Party' : 'Parties'}
                                            </span>
                                        </div>
                                        {election.parties && election.parties.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                                                {election.parties.map(party => {
                                                    const partyData = party.party_details || party;
                                                    return (
                                                        <span key={party.id || party.party} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'white', border: '1px solid #d1d5db', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap' }}>
                                                            {partyData.logo_url && (
                                                                <img src={partyData.logo_url} alt={partyData.acronym} style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: '2px' }} />
                                                            )}
                                                            <span>{partyData.acronym}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '0.85rem', fontWeight: 500, color: '#7c3aed' }}>
                                        Click to view results
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {upcomingElections.length > 0 && (
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Clock size={24} />Upcoming Elections
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {upcomingElections.map(election => (
                                <div
                                    key={election.id}
                                    onClick={() => setSelectedPublicResultElection(election.id)}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        borderTop: '4px solid #f59e0b',
                                        opacity: 0.95
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                                    }}
                                >
                                    <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)', borderBottom: '1px solid #e0e7ff', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#f59e0b', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)' }}>
                                            <Clock size={16} />UPCOMING
                                        </span>
                                    </div>
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af', margin: 0, lineHeight: 1.4 }}>{election.name}</h3>
                                        <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={16} /> {new Date(election.election_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', padding: '6px 12px', background: '#f3f4f6', borderRadius: '20px' }}>
                                                <Users size={16} /> {getPartyCount(election)} {getPartyCount(election) === 1 ? 'Party' : 'Parties'}
                                            </span>
                                        </div>
                                        {election.parties && election.parties.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                                                {election.parties.map(party => {
                                                    const partyData = party.party_details || party;
                                                    return (
                                                        <span key={party.id || party.party} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'white', border: '1px solid #d1d5db', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap' }}>
                                                            {partyData.logo_url && (
                                                                <img src={partyData.logo_url} alt={partyData.acronym} style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: '2px' }} />
                                                            )}
                                                            <span>{partyData.acronym}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '0.85rem', fontWeight: 500, color: '#f59e0b' }}>
                                        Not yet started
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pastElections.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Archive size={24} />Past Elections
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {pastElections.map(election => (
                                <div
                                    key={election.id}
                                    onClick={() => setSelectedPublicResultElection(election.id)}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        borderTop: '4px solid #6b7280',
                                        opacity: 0.9
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                                    }}
                                >
                                    <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderBottom: '1px solid #d1d5db', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#6b7280', boxShadow: '0 2px 8px rgba(107, 114, 128, 0.15)' }}>
                                            <Archive size={16} />ENDED
                                        </span>
                                    </div>
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af', margin: 0, lineHeight: 1.4 }}>{election.name}</h3>
                                        <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={16} /> {new Date(election.election_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', padding: '6px 12px', background: '#f3f4f6', borderRadius: '20px' }}>
                                                <Users size={16} /> {getPartyCount(election)} {getPartyCount(election) === 1 ? 'Party' : 'Parties'}
                                            </span>
                                        </div>
                                        {election.parties && election.parties.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                                                {election.parties.map(party => {
                                                    const partyData = party.party_details || party;
                                                    return (
                                                        <span key={party.id || party.party} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>
                                                            {partyData.logo_url && (
                                                                <img src={partyData.logo_url} alt={partyData.acronym} style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: '2px' }} />
                                                            )}
                                                            <span>{partyData.acronym}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '0.85rem', fontWeight: 500, color: '#6b7280' }}>
                                        View final results
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeElections.length === 0 && upcomingElections.length === 0 && pastElections.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}><AlertCircle size={64} /></div>
                        <h3 style={{ fontSize: '1.5rem', color: '#1e40af', marginBottom: '12px' }}>No Elections Available</h3>
                        <p style={{ fontSize: '1rem', color: '#4b5563', margin: 0 }}>There are no active or upcoming elections at the moment.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'elections':
                return <ElectionForm />;
            case 'parties':
                return <PartyForm />;
            case 'wards':
                return <WardForm />;
            case 'polling-units':
                return <PollingUnitForm />;
            case 'results':
                return <ResultsCenter />;
            case 'analytics':
                return <Analytics />;
            case 'public-result':
                return selectedPublicResultElection ? (
                    <ResultCenterPage embedMode={true} electionIdProp={selectedPublicResultElection} />
                ) : (
                    renderPublicResultsGrid()
                );
            default:
                return <ElectionForm />;
        }
    };

    return (
        <div className="admin-dashboard-wrapper">
            <Header />

            <main className="admin-dashboard">
                <div className="dashboard-tabs">
                    {/* Top Navigation Bar */}
                    <div className="tabs-nav-top">
                        {tabs.map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`tab-btn-top ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    title={tab.label}
                                >
                                    <IconComponent size={20} />
                                    <span className="tab-label">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area - Full Width */}
                    <div className="tabs-content-full">
                        {renderTabContent()}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
