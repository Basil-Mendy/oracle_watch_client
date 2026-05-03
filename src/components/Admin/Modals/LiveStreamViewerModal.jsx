/**
 * LiveStreamViewerModal Component
 * Displays live WebRTC stream from polling unit to admin
 * Shows real-time video with quality statistics
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Loader } from 'lucide-react';

export const LiveStreamViewerModal = ({
    isOpen,
    pollingUnitId,
    pollingUnitName,
    sessionId,
    authToken,
    onClose,
}) => {
    const videoRef = useRef(null);
    const viewerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        const startWatching = async () => {
            try {
                setIsLoading(true);
                setError('');

                // Dynamic import to avoid circular dependencies
                const { AdminStreamViewer } = await import('../../../services/WebRTCStreamingService.js');

                const viewer = new AdminStreamViewer(authToken, {
                    onRemoteStream: (stream) => {
                        console.log('✅ Received live stream from broadcaster');
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            videoRef.current.play().catch(err => {
                                console.warn('Auto-play blocked:', err);
                            });
                        }
                        setIsLoading(false);
                    },
                    onStats: (streamStats) => {
                        setStats(streamStats);
                    },
                    onError: (err) => {
                        console.error('❌ Viewer error:', err.message);
                        setError(err.message || 'Connection failed');
                        setIsLoading(false);
                    },
                    onDisconnect: () => {
                        console.log('📡 Broadcaster disconnected');
                        setError('Broadcaster ended the stream');
                    },
                });

                viewerRef.current = viewer;

                console.log('📡 Connecting to stream:', { sessionId, pollingUnitName });
                await viewer.watchStream(sessionId, pollingUnitName);

            } catch (err) {
                console.error('❌ Failed to connect to stream:', err);
                setError(err.message || 'Failed to connect');
                setIsLoading(false);
            }
        };

        startWatching();

        return () => {
            if (viewerRef.current) {
                try {
                    viewerRef.current.stopWatching();
                    console.log('✅ Stopped watching stream');
                } catch (err) {
                    console.warn('Error stopping viewer:', err);
                }
            }
        };
    }, [isOpen, sessionId, authToken, pollingUnitName]);

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>
                        🎬 LIVE: {pollingUnitName}
                    </h2>
                    <button
                        onClick={onClose}
                        style={styles.closeButton}
                        aria-label="Close"
                    >
                        <X size={24} color="#999" />
                    </button>
                </div>

                {/* Video Container */}
                <div style={styles.videoContainer}>
                    {isLoading && (
                        <div style={styles.loadingOverlay}>
                            <Loader size={40} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                            <p style={{ marginTop: '16px', color: '#fff' }}>Connecting to stream...</p>
                        </div>
                    )}

                    {error && (
                        <div style={styles.errorOverlay}>
                            <p style={{ fontSize: '16px', marginBottom: '16px' }}>❌ {error}</p>
                            <button onClick={onClose} style={styles.retryButton}>
                                Close
                            </button>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        style={{ ...styles.video, display: isLoading || error ? 'none' : 'block' }}
                        autoPlay
                        playsInline
                        controls
                    />
                </div>

                {/* Stats Display */}
                {stats && !error && (
                    <div style={styles.stats}>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>📊 Quality:</span>
                            <span>{stats.bitrate} kbps</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>🎬 Resolution:</span>
                            <span>{stats.resolution}</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>📹 FPS:</span>
                            <span>{stats.fps}</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>⏱️ Latency:</span>
                            <span>{stats.latency}ms</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        width: '90vw',
        maxWidth: '1100px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #333',
        backgroundColor: '#111',
    },
    title: {
        margin: 0,
        color: '#fff',
        fontSize: '18px',
        fontWeight: '600',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#999',
        cursor: 'pointer',
        fontSize: '24px',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
    },
    videoContainer: {
        position: 'relative',
        flex: 1,
        backgroundColor: '#000',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    loadingOverlay: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        color: '#fff',
    },
    errorOverlay: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        color: '#fff',
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '32px',
        borderRadius: '8px',
    },
    stats: {
        padding: '12px 20px',
        backgroundColor: '#111',
        borderTop: '1px solid #333',
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        fontSize: '12px',
        color: '#888',
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    statLabel: {
        fontWeight: '600',
        color: '#aaa',
    },
    retryButton: {
        padding: '10px 20px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
    },
};

export default LiveStreamViewerModal;
