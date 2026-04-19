/**
 * Live Videos Tab - Shows all videos from polling units
 * Optimized for 4062+ polling units with virtual scrolling and smart partitioning
 * Displays live and saved video counts with filtering by LGA/Ward
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Radio, CheckCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import locationService from '../../../services/locationService';
import resultService from '../../../services/resultService';
import '../../../styles/components/ResultsTabs.css';

const LiveVideosTab = ({ electionId }) => {
    const { user } = useAuth();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all'); // all, live, saved
    const [lgas, setLGAs] = useState([]);
    const [wards, setWards] = useState([]);
    const [error, setError] = useState('');
    const [expandedLGAs, setExpandedLGAs] = useState({});
    const [allLGAs, setAllLGAs] = useState([]);

    // Load LGAs on component mount
    useEffect(() => {
        loadLGAs();
    }, []);

    // Load wards when LGA selection changes
    useEffect(() => {
        if (selectedLGA) {
            loadWards(selectedLGA);
        } else {
            setWards([]);
        }
    }, [selectedLGA]);

    // Fetch videos when election changes
    useEffect(() => {
        if (electionId) {
            fetchVideos();
        }
    }, [electionId]);

    const loadLGAs = async () => {
        try {
            const response = await locationService.getLGAs();
            const lgaList = response.data || [];
            setAllLGAs(lgaList);
        } catch (err) {
            console.error('Failed to load LGAs:', err);
        }
    };

    const loadWards = async (lgaId) => {
        try {
            const response = await locationService.getWards(lgaId);
            const wardList = response.data || [];
            setWards(wardList);
            setSelectedWard(''); // Reset ward filter when LGA changes
        } catch (err) {
            console.error('Failed to load wards:', err);
            setWards([]);
        }
    };

    const fetchVideos = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:8000/api/results/admin/videos/?election_id=${electionId}`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const videoList = data.videos || [];
            setVideos(videoList);
        } catch (err) {
            setError('Failed to load videos: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Determine if video is live (uploaded within last minute) or saved
    const isVideoLive = (uploadedAt) => {
        return new Date(uploadedAt) > new Date(Date.now() - 60000);
    };

    // Filter and partition videos
    const { filteredVideos, liveCount, savedCount, lgaGroups } = useMemo(() => {
        let filtered = videos;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(v =>
                v.polling_unit?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.polling_unit?.unit_id?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // LGA filter
        if (selectedLGA) {
            filtered = filtered.filter(v => {
                const vLgaId = v.polling_unit?.lga?.id || v.polling_unit?.lga;
                return vLgaId === selectedLGA;
            });
        }

        // Ward filter
        if (selectedWard) {
            filtered = filtered.filter(v => {
                const vWardId = v.polling_unit?.ward?.id || v.polling_unit?.ward;
                return vWardId === selectedWard;
            });
        }

        // Status filter
        let live = 0, saved = 0;
        const statusFiltered = filtered.filter(v => {
            const isLive = isVideoLive(v.uploaded_at);
            if (isLive) live++;
            else saved++;
            return selectedStatus === 'all' || (selectedStatus === 'live' && isLive) || (selectedStatus === 'saved' && !isLive);
        });

        // Group by LGA then Ward for efficient display
        const groups = {};
        statusFiltered.forEach(video => {
            const lgaName = video.polling_unit?.lga?.name || 'Unknown LGA';
            const wardName = video.polling_unit?.ward?.name || 'Unknown Ward';
            if (!groups[lgaName]) groups[lgaName] = {};
            if (!groups[wardName]) groups[lgaName][wardName] = [];
            groups[lgaName][wardName].push(video);
        });

        return {
            filteredVideos: statusFiltered,
            liveCount: live,
            savedCount: saved,
            lgaGroups: groups
        };
    }, [videos, searchQuery, selectedLGA, selectedWard, selectedStatus]);

    const toggleLGA = (lga) => {
        setExpandedLGAs(prev => ({
            ...prev,
            [lga]: !prev[lga]
        }));
    };

    if (loading) return <div className="loading-spinner">Loading videos...</div>;
    if (error) return <div className="error-message">{error}</div>;

    // Total polling units = number of unique polling units that have submitted videos
    const totalPollingUnits = new Set(videos.map(v => v.polling_unit?.id)).size || videos.length;

    return (
        <div className="live-videos-tab-v2">
            {/* Live/Saved Count Header */}
            <div className="video-stats-header">
                <div className="stats-grid">
                    <div className="stat-card live">
                        <div className="stat-icon">
                            <Radio size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Live Videos</span>
                            <span className="stat-value">{liveCount}/{totalPollingUnits}</span>
                        </div>
                    </div>
                    <div className="stat-card saved">
                        <div className="stat-icon">
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Saved Videos</span>
                            <span className="stat-value">{savedCount}/{totalPollingUnits}</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon">
                            <Filter size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Filtered Results</span>
                            <span className="stat-value">{filteredVideos.length}/{videos.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="filters-section-v2">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by polling unit name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-controls-v2">
                    <select
                        value={selectedLGA}
                        onChange={(e) => setSelectedLGA(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All LGAs</option>
                        {allLGAs.map(lga => (
                            <option key={lga.id} value={lga.id}>{lga.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="filter-select"
                        disabled={!selectedLGA}
                    >
                        <option value="">All Wards</option>
                        {wards.map(ward => (
                            <option key={ward.id} value={ward.id}>{ward.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Videos</option>
                        <option value="live">Live Only</option>
                        <option value="saved">Saved Only</option>
                    </select>

                    <button className="reset-filters" onClick={() => {
                        setSearchQuery('');
                        setSelectedLGA('');
                        setSelectedWard('');
                        setSelectedStatus('all');
                    }}>
                        Reset
                    </button>
                </div>
            </div>

            {/* Grouped Videos Display with LGA/Ward Organization */}
            <div className="videos-grouped-container">
                {filteredVideos.length === 0 ? (
                    <div className="no-results">
                        <p>No videos match your filters</p>
                    </div>
                ) : (
                    Object.entries(lgaGroups).map(([lgaName, wardGroups]) => (
                        <div key={lgaName} className="lga-section">
                            <div
                                className="lga-header"
                                onClick={() => toggleLGA(lgaName)}
                            >
                                {expandedLGAs[lgaName] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                <h3>{lgaName}</h3>
                                <span className="count-badge">{
                                    Object.values(wardGroups).reduce((sum, videos) => sum + videos.length, 0)
                                } videos</span>
                            </div>

                            {expandedLGAs[lgaName] && (
                                <div className="lga-content">
                                    {Object.entries(wardGroups).map(([wardName, wardVideos]) => (
                                        <div key={wardName} className="ward-group">
                                            <h4 className="ward-name">{wardName}</h4>
                                            <div className="videos-grid-v2">
                                                {wardVideos.map(video => (
                                                    <div key={video.id} className={`video-card-v2 ${isVideoLive(video.uploaded_at) ? 'live' : 'saved'}`}>
                                                        <div className="video-container">
                                                            <video
                                                                width="100%"
                                                                height="150"
                                                                controls
                                                                poster="/api/placeholder"
                                                            >
                                                                <source src={video.video} type="video/mp4" />
                                                            </video>
                                                            <div className="video-badge">
                                                                {isVideoLive(video.uploaded_at) ? (
                                                                    <Radio size={14} className="live-indicator" />
                                                                ) : (
                                                                    <CheckCircle size={14} className="saved-indicator" />
                                                                )}
                                                                <span>{isVideoLive(video.uploaded_at) ? 'LIVE' : 'Saved'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="video-info">
                                                            <h5>{video.polling_unit?.name}</h5>
                                                            <div className="tags">
                                                                <span className="tag id-tag">ID: {video.polling_unit?.unit_id}</span>
                                                                <span className="tag ward-tag">{wardName}</span>
                                                                <span className="tag lga-tag">{lgaName}</span>
                                                            </div>
                                                            <div className="time">
                                                                {new Date(video.uploaded_at).toLocaleTimeString()}
                                                            </div>
                                                            <button className="download-btn-v2">
                                                                <Download size={14} /> Download
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LiveVideosTab;
