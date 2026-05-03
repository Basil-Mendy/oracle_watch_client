import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCw, Send, Battery, Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSegmentedRecorder } from '../hooks/useSegmentedRecorder';
import { useLiveStreamController } from '../hooks/useLiveStreamController';
import VideoUploadManager from '../services/VideoUploadManager';
import resultService from '../services/resultService';
import styles from './LiveStreamWidget.module.css';

/**
 * Refactored LiveStreamWidget with:
 * - Segmented recording (5-10 minute chunks)
 * - Network resilience (live + offline fallback)
 * - Direct Cloudinary upload with progress tracking
 * - Auto-upload on network restoration
 * - Comprehensive UI with stats and warnings
 */
const LiveStreamWidget = ({ electionId, unitId, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [timer, setTimer] = useState('00:00:00');
    const [pendingSegments, setPendingSegments] = useState([]);
    const [videoSubmitMessage, setVideoSubmitMessage] = useState('');
    const [showUploadQueue, setShowUploadQueue] = useState(false);
    const [uploadStats, setUploadStats] = useState(null);

    // Use custom hooks
    const networkStatus = useNetworkStatus();
    const recorder = useSegmentedRecorder({
        segmentDuration: 5 * 60 * 1000, // 5 minutes
        maxSegmentDuration: 10 * 60 * 1000,
        videoBitrate: 2500000,
        audioBitrate: 128000,
        onSegmentComplete: handleSegmentReady,
        onError: (error) => {
            console.error('Recording error:', error);
            setVideoSubmitMessage({ type: 'error', text: `Recording error: ${error.message}` });
        },
    });

    const liveStream = useLiveStreamController({
        isNetworkGood: networkStatus.isGoodConnection,
        onStreamStart: ({ stream, isOfflineMode }) => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setVideoSubmitMessage({
                type: 'info',
                text: isOfflineMode ? '🔴 Recording in offline mode (network unavailable)' : '🟢 Live streaming started',
            });
        },
        onStreamStop: () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        },
        onError: (error) => {
            console.error('Streaming error:', error);
            setVideoSubmitMessage({ type: 'warning', text: `Streaming issue: ${error.message}` });
        },
    });

    // Initialize upload manager
    const uploadManagerRef = useRef(null);
    useEffect(() => {
        uploadManagerRef.current = new VideoUploadManager({
            cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
            uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
            pollingUnitId: unitId,
            onProgress: ({ segmentId, progress, chunk, totalChunks }) => {
                console.log(`📤 ${segmentId}: ${progress}% (chunk ${chunk}/${totalChunks})`);
                setUploadStats(prev => ({
                    ...prev,
                    [segmentId]: { progress, chunk, totalChunks },
                }));
            },
            onComplete: (uploadItem) => {
                console.log(`✅ Upload complete: ${uploadItem.id}`);
                setPendingSegments(prev => prev.filter(s => s.id !== uploadItem.id));
                setVideoSubmitMessage({
                    type: 'success',
                    text: `✅ Segment uploaded successfully`,
                });
            },
            onError: (uploadItem) => {
                console.error(`❌ Upload failed: ${uploadItem.id}`);
                setVideoSubmitMessage({
                    type: 'error',
                    text: `❌ Failed to upload segment: ${uploadItem.error}`,
                });
            },
            onQueueChange: (status) => {
                console.log('📋 Queue status:', status);
            },
        });

        return () => {
            // Cleanup
        };
    }, [unitId]);

    // Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const totalSeconds = Math.floor(recorder.totalRecordingDuration / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            setTimer(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [recorder.totalRecordingDuration]);

    /**
     * Handle segment completion - queue for upload
     */
    function handleSegmentReady(segment) {
        console.log(`📝 Segment ready: ${segment.id} (${(segment.duration / 1000).toFixed(1)}s)`);

        // Queue segment for upload
        const uploadItem = uploadManagerRef.current.queueSegment(segment, {
            election_id: electionId,
            unit_id: unitId,
        });

        setPendingSegments(prev => [...prev, segment]);

        // Auto-start upload if network is good
        if (networkStatus.isGoodConnection) {
            uploadManagerRef.current.uploadSegment(uploadItem);
        }
    }

    /**
     * Start live stream + local recording
     */
    const handleStartLive = async () => {
        try {
            const stream = await liveStream.startStreaming();

            if (stream) {
                // Start recording
                const startSuccess = await recorder.startRecording(stream, {
                    electionId,
                    unitId,
                });

                if (!startSuccess) {
                    throw new Error('Failed to start recording');
                }
            }
        } catch (error) {
            console.error('Failed to start streaming:', error);
            setVideoSubmitMessage({ type: 'error', text: `Failed to start: ${error.message}` });
        }
    };

    /**
     * Stop live stream + recording
     */
    const handleStopLive = async () => {
        recorder.stopRecording();
        await liveStream.stopStreaming();
    };

    /**
     * Submit all pending segments
     */
    const handleSubmitAll = async () => {
        if (pendingSegments.length === 0) {
            setVideoSubmitMessage({ type: 'warning', text: 'No segments to submit' });
            return;
        }

        try {
            await uploadManagerRef.current.uploadAll();
        } catch (error) {
            console.error('Error submitting segments:', error);
            setVideoSubmitMessage({ type: 'error', text: `Submission failed: ${error.message}` });
        }
    };

    /**
     * Retry failed uploads
     */
    const handleRetryFailed = async () => {
        const status = uploadManagerRef.current.getQueueStatus();
        if (status.failed === 0) {
            setVideoSubmitMessage({ type: 'info', text: 'No failed uploads to retry' });
            return;
        }

        for (const [segmentId] of uploadManagerRef.current.failedUploads) {
            await uploadManagerRef.current.retryFailed(segmentId);
        }
    };

    const queueStatus = uploadManagerRef.current?.getQueueStatus() || {
        pending: 0,
        uploading: 0,
        completed: 0,
        failed: 0,
    };

    return (
        <div className={styles.liveStreamContainer}>
            {/* Header */}
            <div className={styles.header}>
                <h2>Live Stream & Record</h2>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </div>

            {/* Video Display */}
            <div className={styles.videoContainer}>
                <video
                    ref={videoRef}
                    className={styles.videoElement}
                    autoPlay
                    playsInline
                    muted
                />
                {recorder.isRecording && (
                    <div className={styles.recordingIndicator}>
                        <div className={styles.recordingDot}></div>
                        RECORDING
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className={styles.statusBar}>
                <div className={styles.statusItem}>
                    <span className={styles.label}>Duration:</span>
                    <span className={styles.value}>{timer}</span>
                </div>

                <div className={styles.statusItem}>
                    <span className={styles.label}>Segments:</span>
                    <span className={styles.value}>{recorder.segmentCount}</span>
                </div>

                <div className={styles.statusItem}>
                    {networkStatus.isOnline ? (
                        <Wifi size={18} className={styles.iconGood} />
                    ) : (
                        <WifiOff size={18} className={styles.iconBad} />
                    )}
                    <span className={styles.label}>{networkStatus.effectiveType || 'unknown'}</span>
                </div>

                {recorder.batteryWarning && (
                    <div className={styles.statusItem}>
                        <Battery size={18} className={styles.iconWarning} />
                        <span className={styles.label}>Battery: {recorder.batteryLevel}%</span>
                    </div>
                )}

                {liveStream.isOfflineMode && (
                    <div className={styles.statusItem}>
                        <span className={styles.badge}>OFFLINE MODE</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                {!recorder.isRecording ? (
                    <button
                        className={`${styles.btn} ${styles.startBtn}`}
                        onClick={handleStartLive}
                        disabled={liveStream.isStreaming}
                    >
                        <Play size={18} /> Start Live Stream
                    </button>
                ) : (
                    <>
                        {!recorder.isPaused ? (
                            <button className={`${styles.btn} ${styles.pauseBtn}`} onClick={recorder.pauseRecording}>
                                <Pause size={18} /> Pause
                            </button>
                        ) : (
                            <button className={`${styles.btn} ${styles.playBtn}`} onClick={recorder.resumeRecording}>
                                <Play size={18} /> Resume
                            </button>
                        )}
                        <button className={`${styles.btn} ${styles.stopBtn}`} onClick={handleStopLive}>
                            <Square size={18} /> Stop
                        </button>
                    </>
                )}

                {recorder.isRecording && availableCameras.length > 1 && (
                    <button className={`${styles.btn} ${styles.cameraBtn}`} onClick={liveStream.switchCamera}>
                        <RotateCw size={18} /> Switch Camera
                    </button>
                )}
            </div>

            {/* Stream Statistics */}
            {liveStream.isStreaming && (
                <div className={styles.statsPanel}>
                    <div className={styles.statRow}>
                        <span>Video Bitrate:</span>
                        <span className={styles.value}>{liveStream.streamStats.videoBitrate} kbps</span>
                    </div>
                    <div className={styles.statRow}>
                        <span>Resolution:</span>
                        <span className={styles.value}>{liveStream.streamStats.resolution}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span>Latency:</span>
                        <span className={styles.value}>{liveStream.streamStats.latency} ms</span>
                    </div>
                </div>
            )}

            {/* Upload Queue */}
            <div className={styles.uploadQueueSection}>
                <button
                    className={styles.queueToggle}
                    onClick={() => setShowUploadQueue(!showUploadQueue)}
                >
                    📋 Upload Queue ({queueStatus.pending} pending, {queueStatus.uploading} uploading)
                </button>

                {showUploadQueue && (
                    <div className={styles.queuePanel}>
                        <div className={styles.queueStats}>
                            <div>✅ Completed: {queueStatus.completed}</div>
                            <div>⏳ Pending: {queueStatus.pending}</div>
                            <div>📤 Uploading: {queueStatus.uploading}</div>
                            <div>❌ Failed: {queueStatus.failed}</div>
                        </div>

                        <div className={styles.queueActions}>
                            <button
                                className={`${styles.btn} ${styles.uploadBtn}`}
                                onClick={handleSubmitAll}
                                disabled={queueStatus.pending === 0}
                            >
                                <Send size={16} /> Submit All
                            </button>
                            {queueStatus.failed > 0 && (
                                <button
                                    className={`${styles.btn} ${styles.retryBtn}`}
                                    onClick={handleRetryFailed}
                                >
                                    Retry Failed
                                </button>
                            )}
                        </div>

                        {pendingSegments.length > 0 && (
                            <div className={styles.segmentList}>
                                {pendingSegments.map(segment => (
                                    <div key={segment.id} className={styles.segmentItem}>
                                        <div className={styles.segmentName}>{segment.id}</div>
                                        <div className={styles.segmentInfo}>
                                            {(uploadStats?.[segment.id]?.progress || 0)}% | {(segment.metadata.size / 1024 / 1024).toFixed(1)}MB
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Messages */}
            {videoSubmitMessage && (
                <div className={`${styles.message} ${styles[videoSubmitMessage.type]}`}>
                    {videoSubmitMessage.text}
                </div>
            )}

            {/* Error Display */}
            {(recorder.recordingError || liveStream.streamError) && (
                <div className={styles.errorPanel}>
                    <strong>⚠️ Error:</strong>
                    <p>{recorder.recordingError || liveStream.streamError}</p>
                </div>
            )}
        </div>
    );
};

export default LiveStreamWidget;
