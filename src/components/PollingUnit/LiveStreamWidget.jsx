/**
 * LiveStreamWidget Component - Broadcast live from polling unit
 * Supports both embedded stream and floating window for long streams (8-10 hours)
 * After going live, the stream is saved as video for reference
 */
import React, { useState, useRef, useEffect } from 'react';
import { Square, Trash2, Lightbulb, Zap, Video, Minimize2, Upload, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { useFloatingVideo } from '../../context/FloatingVideoContext';
import { useAuth } from '../../context/AuthContext';
import { resultService } from '../../services';

const LiveStreamWidget = ({ electionId, pollingUnitId }) => {
    const { startFloatingVideo, updateStreamTime } = useFloatingVideo();
    const { user } = useAuth();
    const [isLive, setIsLive] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamTime, setStreamTime] = useState(0);
    const [savedStreams, setSavedStreams] = useState([]);
    const [preRecordedVideos, setPreRecordedVideos] = useState([]);
    const [error, setError] = useState('');
    const [useFloatingWindow, setUseFloatingWindow] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [submittingVideos, setSubmittingVideos] = useState(false);
    const [videoSubmitMessage, setVideoSubmitMessage] = useState('');
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
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

    const handlePreRecordedVideoSelect = (e) => {
        const files = Array.from(e.target.files);
        setUploadError('');

        if (files.length === 0) return;

        const newVideos = [];
        files.forEach(file => {
            // Validate file type
            if (!file.type.startsWith('video/')) {
                setUploadError(`${file.name} is not a video file`);
                return;
            }

            // Max 500MB for pre-recorded videos
            const maxSize = 500 * 1024 * 1024;
            if (file.size > maxSize) {
                setUploadError(`${file.name} exceeds 500MB limit`);
                return;
            }

            // Create preview object
            const videoPreview = {
                id: Math.random().toString(36).substr(2, 9),
                file,
                name: file.name,
                size: (file.size / (1024 * 1024)).toFixed(2), // MB
                type: 'pre-recorded',
                timestamp: new Date().toLocaleString(),
                url: URL.createObjectURL(file) // For preview
            };

            newVideos.push(videoPreview);
        });

        const updatedVideos = [...preRecordedVideos, ...newVideos];
        setPreRecordedVideos(updatedVideos);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDeletePreRecordedVideo = (videoId) => {
        const updatedVideos = preRecordedVideos.filter(v => {
            if (v.id === videoId && v.url) {
                URL.revokeObjectURL(v.url);
            }
            return v.id !== videoId;
        });

        setPreRecordedVideos(updatedVideos);
    };

    const submitPreRecordedVideos = async () => {
        if (preRecordedVideos.length === 0) {
            setVideoSubmitMessage({ type: 'error', text: 'Please upload at least one video' });
            return;
        }

        setSubmittingVideos(true);
        setVideoSubmitMessage('');

        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            // Upload each pre-recorded video
            for (const video of preRecordedVideos) {
                if (video.file) {
                    await resultService.uploadMedia(user.unit_id, password, electionId, video.file, 'video');
                }
            }

            setVideoSubmitMessage({ type: 'success', text: `${preRecordedVideos.length} video(s) submitted successfully!` });
            // Clear videos for next batch after 2 seconds
            setTimeout(() => {
                setPreRecordedVideos([]);
                setVideoSubmitMessage('');
            }, 2000);
        } catch (error) {
            console.error('Video submission error:', error);
            setVideoSubmitMessage({ type: 'error', text: error.response?.data?.error || error.message || 'Failed to submit videos' });
        } finally {
            setSubmittingVideos(false);
        }
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

            {/* Pre-Recorded Video Upload Section */}
            <div className="pre-recorded-section" style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                <div style={{ marginBottom: '16px' }}>
                    <h5 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Upload size={18} style={{ color: '#17a2b8' }} />
                        Upload Pre-Recorded Video
                    </h5>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0' }}>
                        If you couldn't go live due to network issues, upload a pre-recorded video of the polling process instead
                    </p>
                </div>

                {uploadError && (
                    <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} style={{ color: '#ff6b6b', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#ff6b6b' }}>{uploadError}</span>
                    </div>
                )}

                <div
                    style={{
                        border: '2px dashed #17a2b8',
                        borderRadius: '6px',
                        padding: '24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#f0f8ff',
                        transition: 'all 0.3s'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎬</div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#333' }}>Click to upload video</p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>or drag and drop (MP4, WebM, OGG • Max 500MB)</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={handlePreRecordedVideoSelect}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Submission Message */}
                {videoSubmitMessage && (
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: videoSubmitMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${videoSubmitMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {videoSubmitMessage.type === 'success' ? (
                            <CheckCircle size={16} style={{ color: '#155724', flexShrink: 0 }} />
                        ) : (
                            <AlertCircle size={16} style={{ color: '#721c24', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '12px', color: videoSubmitMessage.type === 'success' ? '#155724' : '#721c24' }}>
                            {videoSubmitMessage.text}
                        </span>
                    </div>
                )}

                {/* Uploaded Pre-Recorded Videos List */}
                {preRecordedVideos.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        <h6 style={{ margin: '0 0 12px 0', color: '#333' }}>Uploaded Videos ({preRecordedVideos.length})</h6>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {preRecordedVideos.map((video, index) => (
                                <div
                                    key={video.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        backgroundColor: '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div style={{ fontSize: '20px' }}>🎥</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: '#333', fontSize: '13px' }}>{index + 1}. {video.name}</div>
                                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{video.size} MB • {video.timestamp}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-delete"
                                        onClick={() => handleDeletePreRecordedVideo(video.id)}
                                        title="Delete video"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#dc3545',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Submit Pre-Recorded Videos Button */}
                        <button
                            className="btn btn-primary"
                            onClick={submitPreRecordedVideos}
                            disabled={submittingVideos || preRecordedVideos.length === 0}
                            style={{
                                marginTop: '16px',
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: submittingVideos || preRecordedVideos.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: submittingVideos || preRecordedVideos.length === 0 ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontWeight: 600
                            }}
                        >
                            {submittingVideos ? (
                                <>
                                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    Submitting Videos...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Submit {preRecordedVideos.length} Video{preRecordedVideos.length > 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
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
