/**
 * Results Center - Comprehensive admin dashboard for monitoring polling unit submissions
 * Tabs: Live Videos, Vote Counts, Pictures & Comments
 */
import React, { useState, useEffect } from 'react';
import { Video, BarChart3, ImageIcon } from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import LiveVideosTab from './ResultsTabs/LiveVideosTab';
import VoteCountsTab from './ResultsTabs/VoteCountsTab';
import MediaTab from './ResultsTabs/MediaTab';
import '../../styles/components/ResultsCenter.css';

const ResultsCenter = () => {
    const { elections, loadElections } = useElection();
    const [activeSubTab, setActiveSubTab] = useState('live-videos');
    const [selectedElectionId, setSelectedElectionId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (elections.length === 0) {
            setLoading(true);
            loadElections().finally(() => setLoading(false));
        }
    }, []);

    const subTabs = [
        { id: 'live-videos', label: 'Live Videos', icon: Video },
        { id: 'vote-counts', label: 'Vote Counts', icon: BarChart3 },
        { id: 'media-comments', label: 'Pictures & Comments', icon: ImageIcon },
    ];

    const renderTabContent = () => {
        if (!selectedElectionId) {
            return (
                <div className="empty-state">
                    <p>Please select an election to view results</p>
                </div>
            );
        }

        switch (activeSubTab) {
            case 'live-videos':
                return <LiveVideosTab electionId={selectedElectionId} />;
            case 'vote-counts':
                return <VoteCountsTab electionId={selectedElectionId} />;
            case 'media-comments':
                return <MediaTab electionId={selectedElectionId} />;
            default:
                return null;
        }
    };

    return (
        <div className="results-center">
            {/* Election Selector */}
            <div className="results-header">
                <h2>Results Management Center</h2>
                <div className="election-selector">
                    <label htmlFor="election-select">Select Election:</label>
                    <select
                        id="election-select"
                        value={selectedElectionId}
                        onChange={(e) => setSelectedElectionId(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">-- Choose an Election --</option>
                        {elections.map(election => (
                            <option key={election.id} value={election.id}>
                                {election.name} ({election.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="results-subtabs">
                <div className="subtabs-nav">
                    {subTabs.map((tab) => {
                        const IconComponent = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`subtab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveSubTab(tab.id)}
                                disabled={!selectedElectionId}
                            >
                                <IconComponent size={18} className="tab-icon" />
                                <span className="tab-label">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="results-content">
                {loading ? <LoadingSpinner /> : renderTabContent()}
            </div>
        </div>
    );
};

export default ResultsCenter;
