/**
 * LiveStreamWall Component
 * Real-time CCTV-style wall showing all active polling unit broadcasts
 * Auto-plays video from each polling unit in a grid layout
 * Like TikTok/Facebook Live - video plays immediately when you open the tab
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, AlertCircle, Video } from 'lucide-react';
import { getApiUrl } from '../../../utils/apiUrl';

const LiveStreamCard = ({ stream, authToken, onError }) => {
    const videoRef = useRef(null);
    const viewerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Auto-start streaming when component mounts
    useEffect(() => {
        const startWatching = async () => {
            try {
                // Dynamic import to avoid circular dependencies
                const { AdminStreamViewer } = await import('../../../services/WebRTCStreamingService.js');

                const viewer = new AdminStreamViewer(authToken, {
                    onRemoteStream: (remoteStream) => {
                        if (videoRef.current) {
                            videoRef.current.srcObject = remoteStream;
                            videoRef.current.play().catch(err => {
                                // Auto-play may be blocked by browser policy
                            });
                            setIsPlaying(true);
                        }
                    },
                    onError: (err) => {
                        setHasError(true);
                        onError?.(stream.id, err);
                    },
                    onDisconnect: () => {
                        setIsPlaying(false);
                    },
                });

                viewerRef.current = viewer;
                await viewer.watchStream(stream.id, stream.polling_unit_name);

            } catch (err) {
                setHasError(true);
                onError?.(stream.id, err);
            }
        };

        startWatching();

        // Cleanup on unmount
        return () => {
            if (viewerRef.current) {
                try {
                    viewerRef.current.stopWatching();
                } catch (err) {
                }
            }
        };
    }, [stream, authToken, onError]);

    return (
        <div style={styles.card}>
            {/* Video Element */}
            <div style={styles.videoContainer}>
                <video
                    ref={videoRef}
                    style={styles.video}
                    muted
                    autoPlay
                    playsInline
                />

                {/* Loading State */}
                {!isPlaying && !hasError && (
                    <div style={styles.loadingOverlay}>
                        <div style={styles.spinner} />
                        <p style={styles.loadingText}>Connecting...</p>
                    </div>
                )}

                {/* Error State */}
                {hasError && (
                    <div style={styles.errorOverlay}>
                        <AlertCircle size={32} color="#fff" />
                        <p style={styles.errorText}>Connection Error</p>
                    </div>
                )}

                {/* Live Badge */}
                <div style={styles.liveBadge}>
                    <span style={styles.liveDot} />
                    LIVE
                </div>
            </div>

            {/* Info Section */}
            <div style={styles.infoContainer}>
                <h3 style={styles.unitName}>{stream.polling_unit_name}</h3>
                <p style={styles.location}>{stream.ward_name} • {stream.lga_name}</p>
                <code style={styles.unitId}>{stream.polling_unit_id}</code>
            </div>
        </div>
    );
};

export const LiveStreamWall = ({ electionId, selectedLga, selectedWard }) => {
    const token = localStorage.getItem('auth_token');
    const [liveStreams, setLiveStreams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const pollIntervalRef = useRef(null);

    /**
     * Fetch live streams from API
     */
    const fetchLiveStreams = useCallback(async () => {
        try {
            const response = await fetch(
                getApiUrl(`/results/admin/live-streams/?election_id=${electionId}`),
                {
                    headers: {
                        Authorization: `Token ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch live streams');
            }

            const data = await response.json();
            const streams = Array.isArray(data) ? data : data.results || [];

            // Filter by location if specified
            const filtered = streams.filter(stream => {
                if (selectedLga && stream.lga_name !== selectedLga) return false;
                if (selectedWard && stream.ward_name !== selectedWard) return false;
                return true;
            });

            setLiveStreams(filtered);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    }, [electionId, token, selectedLga, selectedWard]);

    /**
     * Initial load and polling
     */
    useEffect(() => {
        setLoading(true);
        fetchLiveStreams().then(() => setLoading(false));

        // Poll for new streams every 10 seconds
        pollIntervalRef.current = setInterval(fetchLiveStreams, 10000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [fetchLiveStreams]);

    const handleStreamError = useCallback((streamId, err) => {
        // Stream error handled - optionally re-fetch to detect if stream is still active
    }, []);

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <Video size={24} style={{ marginRight: '12px', color: '#dc3545' }} />
                    <h2>Live Broadcast Wall</h2>
                    {liveStreams.length > 0 && (
                        <span style={styles.liveCount}>{liveStreams.length} Active</span>
                    )}
                </div>

                <button
                    onClick={() => {
                        setLoading(true);
                        fetchLiveStreams().then(() => setLoading(false));
                    }}
                    style={styles.refreshButton}
                    disabled={loading}
                >
                    <RefreshCw size={18} style={{ marginRight: '8px' }} />
                    Refresh
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div style={styles.errorAlert}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Empty State */}
            {liveStreams.length === 0 && !loading && (
                <div style={styles.emptyState}>
                    <Video size={48} color="#ccc" />
                    <p>No active broadcasts</p>
                    <small>Polling units will appear here when they start streaming</small>
                </div>
            )}

            {/* Live Stream Grid (CCTV Wall) */}
            {liveStreams.length > 0 && (
                <div style={styles.wallGrid}>
                    {liveStreams.map((stream) => (
                        <LiveStreamCard
                            key={stream.id}
                            stream={stream}
                            authToken={token}
                            onError={handleStreamError}
                        />
                    ))}
                </div>
            )}

            {/* Loading Message */}
            {loading && liveStreams.length === 0 && (
                <div style={styles.loadingState}>
                    <div style={styles.spinner} />
                    <p>Loading broadcasts...</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e9ecef',
    },

    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },

    liveCount: {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#dc3545',
        color: '#fff',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        marginLeft: '8px',
    },

    refreshButton: {
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        transition: 'background-color 0.2s',
    },

    errorAlert: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '6px',
        marginBottom: '20px',
        border: '1px solid #f5c6cb',
    },

    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        color: '#6c757d',
    },

    loadingState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
    },

    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e9ecef',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px',
    },

    wallGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '16px',
        animation: 'fadeIn 0.3s ease-in',
    },

    card: {
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        border: '2px solid #e9ecef',
    },

    videoContainer: {
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%', // 16:9 ratio
        backgroundColor: '#000',
        overflow: 'hidden',
    },

    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },

    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },

    loadingText: {
        color: '#fff',
        marginTop: '12px',
        fontSize: '14px',
    },

    errorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(220, 53, 69, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },

    errorText: {
        color: '#fff',
        marginTop: '12px',
        fontSize: '14px',
        fontWeight: '500',
    },

    liveBadge: {
        position: 'absolute',
        top: '10px',
        left: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: 'rgba(220, 53, 69, 0.95)',
        color: '#fff',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 10,
    },

    liveDot: {
        display: 'inline-block',
        width: '8px',
        height: '8px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        animation: 'pulse 1.5s infinite',
    },

    infoContainer: {
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
    },

    unitName: {
        margin: '0 0 6px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#212529',
    },

    location: {
        margin: '0 0 6px 0',
        fontSize: '13px',
        color: '#6c757d',
    },

    unitId: {
        display: 'block',
        fontSize: '11px',
        color: '#6c757d',
        wordBreak: 'break-all',
    },
};

export default LiveStreamWall;
