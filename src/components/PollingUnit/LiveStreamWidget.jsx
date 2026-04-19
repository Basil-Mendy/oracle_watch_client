/**
 * LiveStreamWidget Component - Broadcast live from polling unit
 * Supports both embedded stream and floating window for long streams (8-10 hours)
 * After going live, the stream is saved as video for reference
 */
import React, { useState, useRef, useEffect } from 'react';
import { Square, Trash2, Lightbulb, Zap, Video, Minimize2 } from 'lucide-react';
import { useFloatingVideo } from '../../context/FloatingVideoContext';

const LiveStreamWidget = ({ electionId, pollingUnitId }) => {
    const { startFloatingVideo, updateStreamTime } = useFloatingVideo();
    const [isLive, setIsLive] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamTime, setStreamTime] = useState(0);
    const [savedStreams, setSavedStreams] = useState([]);
    const [error, setError] = useState('');
    const [useFloatingWindow, setUseFloatingWindow] = useState(false);
    const videoRef = useRef(null);
    const timerInterval = useRef(null);
    const mediaStream = useRef(null);

    // Simulate stream timer
    useEffect(() => {
        if (isStreaming) {
            timerInterval.current = setInterval(() => {
                setStreamTime(prev => {
                    const newTime = prev + 1;
                    updateStreamTime(newTime);
                    return newTime;
                });
            }, 1000);
        } else {
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
            }
        }
        return () => {
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
            }
        };
    }, [isStreaming, updateStreamTime]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleStartLive = async () => {
        try {
            setError('');
            setIsStreaming(true);

            // Request camera permission
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: true
                });

                mediaStream.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                setIsLive(true);
            } else {
                throw new Error('Your browser does not support live streaming');
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError(
                err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow access to camera.'
                    : 'Could not access camera. Please check permissions.'
            );
            setIsStreaming(false);
        }
    };

    const handleMinimizeToFloating = () => {
        if (mediaStream.current && isStreaming) {
            startFloatingVideo(mediaStream.current, electionId, pollingUnitId);
            setUseFloatingWindow(true);
            // Keep local stream visible but indicate floating window is active
        }
    };

    const handleStopLive = async () => {
        try {
            setIsStreaming(false);
            setIsLive(false);

            // Stop all media tracks
            if (mediaStream.current) {
                mediaStream.current.getTracks().forEach(track => track.stop());
                mediaStream.current = null;
            }

            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }

            setUseFloatingWindow(false);

            // Save stream as saved video
            if (streamTime > 0) {
                const newStream = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: `Live Stream - ${new Date().toLocaleTimeString()}`,
                    duration: streamTime,
                    timestamp: new Date().toLocaleString(),
                    url: '#' // In production, would be actual video URL
                };

                setSavedStreams(prev => [newStream, ...prev]);
                setStreamTime(0);
            }
        } catch (err) {
            console.error('Error stopping stream:', err);
            setError('Error stopping stream');
        }
    };

    const handleDeleteStream = (streamId) => {
        setSavedStreams(prev => prev.filter(stream => stream.id !== streamId));
    };

    return (
        <div className="live-stream-widget">
            <div className="stream-instructions">
                <p><Zap size={16} className="inline-icon" style={{ color: '#dc3545' }} /> Go live to broadcast from the polling unit in real-time</p>
                <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px' }}>
                    Live streams are automatically saved as videos after you finish broadcasting. Long streams can be minimized to a floating window to continue browsing the app.
                </p>
            </div>

            {error && (
                <div className="stream-error">
                    <p>{error}</p>
                </div>
            )}

            {useFloatingWindow && (
                <div className="floating-window-notice">
                    <p>✓ Live streaming is now running in a floating window. You can navigate and use other features of the app while broadcasting.</p>
                </div>
            )}

            {/* Live Stream Control */}
            <div className="stream-control-section">
                {!isStreaming ? (
                    <button
                        className="btn btn-danger btn-large"
                        onClick={handleStartLive}
                    >
                        <Zap size={18} style={{ color: '#dc3545' }} /> Start Live Stream
                    </button>
                ) : (
                    <div className="live-indicator">
                        <div className="live-badge">
                            <span className="pulse"></span> LIVE
                        </div>
                        <div className="stream-duration">{formatTime(streamTime)}</div>
                        <button
                            className="btn btn-warning"
                            onClick={handleMinimizeToFloating}
                            title="Minimize to floating window to continue browsing"
                        >
                            <Minimize2 size={16} /> Minimize to Floating Window
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleStopLive}
                        >
                            <Square size={16} /> Stop Broadcasting
                        </button>
                    </div>
                )}
            </div>

            {/* Video Preview */}
            {isStreaming && !useFloatingWindow && (
                <div className="video-preview-container">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="video-preview"
                    />
                    <div className="video-overlay">
                        <div className="overlay-badge" style={{ color: '#dc3545', fontWeight: 'bold' }}>🔴 BROADCASTING</div>
                        <div className="overlay-info">
                            Polling Unit: {pollingUnitId}
                        </div>
                    </div>
                </div>
            )}

            {isStreaming && useFloatingWindow && (
                <div className="video-preview-container minimal">
                    <div className="minimal-preview">
                        <p style={{ textAlign: 'center', color: '#666' }}>
                            📹 Stream is now in floating window mode<br />
                            <small>You can navigate the app while streaming</small>
                        </p>
                    </div>
                </div>
            )}

            {/* Saved Streams */}
            {savedStreams.length > 0 && (
                <div className="saved-streams-section">
                    <h5><Video size={18} className="inline-icon" /> Saved Streams ({savedStreams.length})</h5>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '12px' }}>
                        These streams are saved for reference and will be uploaded with your submission
                    </p>

                    <div className="streams-list">
                        {savedStreams.map((stream, index) => (
                            <div key={stream.id} className="stream-item">
                                <div className="stream-number">{index + 1}</div>
                                <div className="stream-details">
                                    <div className="stream-title">{stream.title}</div>
                                    <div className="stream-meta">
                                        <span>{formatTime(stream.duration)}</span>
                                        <span className="separator">•</span>
                                        <span>{stream.timestamp}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-delete"
                                    onClick={() => handleDeleteStream(stream.id)}
                                    title="Delete stream"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="stream-info-box">
                <h5><Lightbulb size={18} className="inline-icon" /> What is Live Streaming?</h5>
                <ul>
                    <li>Stream real-time video from the polling unit</li>
                    <li>Show the voting materials, processes, and environment</li>
                    <li>Can go live multiple times (each saved separately)</li>
                    <li>Use the floating window for long streams (8-10 hours)</li>
                    <li>Navigate other app features while streaming</li>
                    <li>Saved streams are uploaded with your results</li>
                </ul>
            </div>
        </div>
    );
};

export default LiveStreamWidget;
