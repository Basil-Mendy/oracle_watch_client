/**
 * Live Videos Tab - CCTV-style grid showing live, saved, and pre-recorded videos
 * Displays live polling unit streams in a grid, saved videos below, pre-recorded videos at bottom
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Radio, CheckCircle, Upload, Maximize2, Loader } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getApiUrl } from '../../../utils/apiUrl';
import locationService from '../../../services/locationService';
import '../../../styles/components/ResultsTabs.css';

const LiveVideosTab = ({ electionId }) => {
    const { user } = useAuth();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [error, setError] = useState('');
    const [allLGAs, setAllLGAs] = useState([]);
    const [wards, setWards] = useState([]);
    const [expandedVideo, setExpandedVideo] = useState(null);

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
            setSelectedWard('');
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
            console.log('🎥 Fetching videos for election:', electionId);

            const response = await fetch(getApiUrl(`/results/admin/videos/?election_id=${electionId}`), {
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
            console.log(`✅ Fetched ${videoList.length} videos`);
            setVideos(videoList);
        } catch (err) {
            setError('Failed to load videos: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Determine video age and type
    const getVideoType = (uploadedAt) => {
        const uploadTime = new Date(uploadedAt);
        const now = new Date();
        const diffMinutes = (now - uploadTime) / (1000 * 60);

        // Consider "live" if uploaded within last 2 minutes
        if (diffMinutes < 2) return 'live';

        // Consider "saved" if uploaded within last day
        if (diffMinutes < 1440) return 'saved';

        // Otherwise pre-recorded
        return 'prerecorded';
    };

    // Filter videos
    const { liveVideos, savedVideos, prerecordedVideos } = useMemo(() => {
        let filtered = videos;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(v =>
                v.polling_unit?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.polling_unit?.unit_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.polling_unit?.lga?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.polling_unit?.ward?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // LGA filter
        if (selectedLGA) {
            filtered = filtered.filter(v => {
                const vLgaId = v.polling_unit?.lga?.id || v.polling_unit?.lga;
                return String(vLgaId) === String(selectedLGA);
            });
        }

        // Ward filter
        if (selectedWard) {
            filtered = filtered.filter(v => {
                const vWardId = v.polling_unit?.ward?.id || v.polling_unit?.ward;
                return String(vWardId) === String(selectedWard);
            });
        }

        // Categorize videos
        const live = filtered.filter(v => getVideoType(v.uploaded_at) === 'live');
        const saved = filtered.filter(v => getVideoType(v.uploaded_at) === 'saved');
        const prerecorded = filtered.filter(v => getVideoType(v.uploaded_at) === 'prerecorded');

        return {
            liveVideos: live.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)),
            savedVideos: saved.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)),
            prerecordedVideos: prerecorded.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
        };
    }, [videos, searchQuery, selectedLGA, selectedWard]);

    // Video card component
    const VideoCard = ({ video, type }) => {
        const isLive = type === 'live';
        const isPre = type === 'prerecorded';

        return (
            <div style={{
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s',
                border: isLive ? '2px solid #dc3545' : '1px solid #ddd'
            }}>
                {/* Video Container */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '56.25%', // 16:9 aspect ratio
                    backgroundColor: '#000',
                    overflow: 'hidden'
                }}>
                    <video
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        controls
                        poster="/api/placeholder"
                    >
                        <source src={video.video} type="video/mp4" />
                        Your browser doesn't support HTML5 video.
                    </video>

                    {/* Live Badge */}
                    {isLive && (
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            animation: 'pulse 1s infinite'
                        }}>
                            <Radio size={12} />
                            LIVE
                        </div>
                    )}

                    {/* Saved Badge */}
                    {!isLive && !isPre && (
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <CheckCircle size={12} />
                            SAVED
                        </div>
                    )}

                    {/* Pre-recorded Badge */}
                    {isPre && (
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#17a2b8',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <Upload size={12} />
                            PRE-RECORDED
                        </div>
                    )}
                </div>

                {/* Video Info */}
                <div style={{ padding: '12px' }}>
                    <h5 style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#222'
                    }}>
                        {video.polling_unit?.name || 'Unknown PU'}
                    </h5>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        marginBottom: '10px',
                        fontSize: '11px'
                    }}>
                        <div style={{ backgroundColor: '#f0f0f0', padding: '6px', borderRadius: '4px', fontWeight: '600' }}>
                            ID: {video.polling_unit?.unit_id || 'N/A'}
                        </div>
                        <div style={{ backgroundColor: '#f0f0f0', padding: '6px', borderRadius: '4px' }}>
                            {video.polling_unit?.ward?.name || 'N/A'}
                        </div>
                        <div style={{ backgroundColor: '#f0f0f0', padding: '6px', borderRadius: '4px' }}>
                            {video.polling_unit?.lga?.name || 'N/A'}
                        </div>
                        <div style={{ backgroundColor: '#f0f0f0', padding: '6px', borderRadius: '4px' }}>
                            {new Date(video.uploaded_at).toLocaleTimeString()}
                        </div>
                    </div>

                    {/* Download Button */}
                    <button
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = video.video;
                            link.download = `${video.polling_unit?.name || 'video'}.mp4`;
                            link.click();
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <Download size={14} /> Download
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                color: '#888'
            }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px' }}>Loading videos...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: '16px' }}>
            {/* Filters & Search */}
            <div style={{
                marginBottom: '24px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{
                    flex: '1 1 250px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: '#fff'
                }}>
                    <Search size={18} style={{ color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Search by PU name, ID, ward, or LGA..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px'
                        }}
                    />
                </div>

                <select
                    value={selectedLGA}
                    onChange={(e) => setSelectedLGA(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '13px'
                    }}
                >
                    <option value="">All LGAs</option>
                    {allLGAs.map(lga => (
                        <option key={lga.id} value={lga.id}>{lga.name}</option>
                    ))}
                </select>

                <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    disabled={!selectedLGA}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '13px',
                        opacity: !selectedLGA ? 0.6 : 1
                    }}
                >
                    <option value="">All Wards</option>
                    {wards.map(ward => (
                        <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                </select>

                <button
                    onClick={() => {
                        setSearchQuery('');
                        setSelectedLGA('');
                        setSelectedWard('');
                    }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}
                >
                    Reset
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    borderRadius: '6px',
                    marginBottom: '24px',
                    border: '1px solid #f5c6cb'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Live Videos Section */}
            {liveVideos.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '3px solid #dc3545'
                    }}>
                        <Radio size={24} style={{ color: '#dc3545' }} />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#222' }}>
                            Live Videos
                        </h2>
                        <span style={{
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {liveVideos.length}
                        </span>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {liveVideos.map(video => (
                            <VideoCard key={video.id} video={video} type="live" />
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Videos Section */}
            {savedVideos.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '3px solid #28a745'
                    }}>
                        <CheckCircle size={24} style={{ color: '#28a745' }} />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#222' }}>
                            Saved Videos
                        </h2>
                        <span style={{
                            backgroundColor: '#28a745',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {savedVideos.length}
                        </span>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {savedVideos.map(video => (
                            <VideoCard key={video.id} video={video} type="saved" />
                        ))}
                    </div>
                </div>
            )}

            {/* Pre-recorded Videos Section */}
            {prerecordedVideos.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '3px solid #17a2b8'
                    }}>
                        <Upload size={24} style={{ color: '#17a2b8' }} />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#222' }}>
                            Pre-Recorded Videos
                        </h2>
                        <span style={{
                            backgroundColor: '#17a2b8',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {prerecordedVideos.length}
                        </span>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {prerecordedVideos.map(video => (
                            <VideoCard key={video.id} video={video} type="prerecorded" />
                        ))}
                    </div>
                </div>
            )}

            {/* No Videos Message */}
            {liveVideos.length === 0 && savedVideos.length === 0 && prerecordedVideos.length === 0 && (
                <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#888'
                }}>
                    <p style={{ fontSize: '16px' }}>No videos found</p>
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>Videos will appear here as polling units submit them</p>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LiveVideosTab;
