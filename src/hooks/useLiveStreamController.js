import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * LiveStreamController Hook
 * Manages live streaming with local recording fallback
 * Features:
 * - WebRTC live streaming to backend
 * - Simultaneous local recording (hybrid mode)
 * - Automatic fallback to offline recording on network issues
 * - Camera switching (front/back)
 * - Stream statistics
 */
export const useLiveStreamController = (options = {}) => {
    const {
        backendUrl = 'http://localhost:8000',
        onStreamStart = null,
        onStreamStop = null,
        onError = null,
        isNetworkGood = true,
    } = options;

    // Live streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecordingLocally, setIsRecordingLocally] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [currentCamera, setCurrentCamera] = useState('user'); // 'user' for front, 'environment' for back
    const [availableCameras, setAvailableCameras] = useState([]);
    const [streamStats, setStreamStats] = useState({
        videoBitrate: 0,
        audioBitrate: 0,
        latency: 0,
        packetLoss: 0,
        resolution: '0x0',
    });
    const [streamError, setStreamError] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    // References
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const videoElementRef = useRef(null);
    const statsIntervalRef = useRef(null);
    const sessionIdRef = useRef(null);

    // Enumerate cameras
    useEffect(() => {
        const enumerateCameras = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter(device => device.kind === 'videoinput');
                setAvailableCameras(cameras);
                console.log(`📷 Found ${cameras.length} camera(s)`);
            } catch (error) {
                console.warn('Failed to enumerate cameras:', error);
            }
        };

        enumerateCameras();
    }, []);

    /**
     * Initialize peer connection and start streaming
     */
    const startStreaming = useCallback(async () => {
        try {
            setStreamError(null);

            // Get user media with selected camera
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: currentCamera,
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;

            // If network is not good, skip WebRTC streaming
            if (!isNetworkGood) {
                console.log('⚠️ Network not good - using offline recording mode');
                setIsOfflineMode(true);
                setIsRecordingLocally(true);
                return stream;
            }

            // Setup WebRTC peer connection
            const configuration = {
                iceServers: [
                    { urls: ['stun:stun.l.google.com:19302'] },
                    { urls: ['stun:stun1.l.google.com:19302'] },
                ],
            };

            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;

            // Add local stream tracks
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    // Send ICE candidate to backend
                    sendICECandidate(event.candidate);
                }
            };

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log(`📡 Connection state: ${peerConnection.connectionState}`);
                if (peerConnection.connectionState === 'failed') {
                    setIsOfflineMode(true);
                    console.warn('⚠️ Peer connection failed - switching to offline mode');
                }
            };

            // Create and send offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send offer to backend
            const sessionResponse = await initializeStreamSession(offer);
            if (!sessionResponse) {
                throw new Error('Failed to initialize stream session');
            }

            setSessionId(sessionResponse.session_id);
            sessionIdRef.current = sessionResponse.session_id;

            // Handle answer from backend
            if (sessionResponse.answer) {
                const answer = new RTCSessionDescription(sessionResponse.answer);
                await peerConnection.setRemoteDescription(answer);
            }

            // Start monitoring stream statistics
            startStatsMonitoring(peerConnection);

            setIsStreaming(true);
            setIsRecordingLocally(true);
            setIsOfflineMode(false);

            if (onStreamStart) {
                onStreamStart({
                    stream,
                    sessionId: sessionResponse.session_id,
                    isOfflineMode: false,
                });
            }

            console.log('✅ Live streaming started');

            return stream;
        } catch (error) {
            console.error('❌ Failed to start streaming:', error);
            setStreamError(error.message);
            setIsOfflineMode(true);
            setIsRecordingLocally(true);

            if (onError) {
                onError(error);
            }

            // Still return the stream for offline recording
            if (localStreamRef.current) {
                return localStreamRef.current;
            }

            throw error;
        }
    }, [currentCamera, isNetworkGood, onStreamStart, onError]);

    /**
     * Initialize stream session on backend
     */
    const initializeStreamSession = useCallback(async (offer) => {
        try {
            const response = await fetch(`${backendUrl}/api/results/start-live-stream/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('polling_unit_token')}`,
                },
                body: JSON.stringify({
                    offer: offer,
                    polling_unit_id: sessionStorage.getItem('polling_unit_id'),
                }),
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to initialize stream session:', error);
            return null;
        }
    }, [backendUrl]);

    /**
     * Send ICE candidate to backend
     */
    const sendICECandidate = useCallback(async (candidate) => {
        try {
            await fetch(`${backendUrl}/api/results/add-ice-candidate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('polling_unit_token')}`,
                },
                body: JSON.stringify({
                    candidate: candidate,
                    session_id: sessionIdRef.current,
                }),
            });
        } catch (error) {
            console.warn('Failed to send ICE candidate:', error);
        }
    }, [backendUrl]);

    /**
     * Monitor stream statistics
     */
    const startStatsMonitoring = useCallback((peerConnection) => {
        if (!peerConnection) return;

        const monitor = async () => {
            try {
                const stats = await peerConnection.getStats();
                let videoBitrate = 0;
                let audioBitrate = 0;
                let latency = 0;
                let resolution = '0x0';

                stats.forEach(report => {
                    if (report.type === 'outbound-rtp') {
                        if (report.mediaType === 'video') {
                            videoBitrate = Math.round((report.bytesSent * 8) / 1000); // kbps
                            resolution = `${report.frameWidth}x${report.frameHeight}`;
                        }
                        if (report.mediaType === 'audio') {
                            audioBitrate = Math.round((report.bytesSent * 8) / 1000);
                        }
                    }
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        latency = report.currentRoundTripTime * 1000; // Convert to ms
                    }
                });

                setStreamStats({
                    videoBitrate,
                    audioBitrate,
                    latency: Math.round(latency),
                    resolution,
                });
            } catch (error) {
                console.warn('Failed to get stream stats:', error);
            }
        };

        statsIntervalRef.current = setInterval(monitor, 1000);
    }, []);

    /**
     * Stop monitoring statistics
     */
    const stopStatsMonitoring = useCallback(() => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
        }
    }, []);

    /**
     * Switch camera (front/back)
     */
    const switchCamera = useCallback(async () => {
        try {
            const newFacingMode = currentCamera === 'user' ? 'environment' : 'user';

            // Get new stream with different camera
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: newFacingMode,
                },
                audio: false, // Keep existing audio
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const videoTrack = newStream.getVideoTracks()[0];

            // Replace video track in peer connection
            if (peerConnectionRef.current && isStreaming) {
                const sender = peerConnectionRef.current
                    .getSenders()
                    .find(s => s.track?.kind === 'video');

                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }

            // Stop old video track
            if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach(track => track.stop());
            }

            // Add new video track to local stream
            if (localStreamRef.current) {
                localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                localStreamRef.current.addTrack(videoTrack);
            }

            setCurrentCamera(newFacingMode);
            console.log(`📷 Switched to ${newFacingMode} camera`);
        } catch (error) {
            console.error('Failed to switch camera:', error);
            setStreamError(error.message);
        }
    }, [currentCamera, isStreaming]);

    /**
     * Stop streaming
     */
    const stopStreaming = useCallback(async () => {
        try {
            // Notify backend
            if (sessionIdRef.current) {
                await fetch(`${backendUrl}/api/results/end-live-stream/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('polling_unit_token')}`,
                    },
                    body: JSON.stringify({
                        session_id: sessionIdRef.current,
                    }),
                }).catch(error => console.warn('Failed to notify backend of stream stop:', error));
            }

            // Clean up peer connection
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }

            // Stop all tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }

            // Stop stats monitoring
            stopStatsMonitoring();

            setIsStreaming(false);
            setIsRecordingLocally(false);
            setIsOfflineMode(false);
            setSessionId(null);
            sessionIdRef.current = null;

            if (onStreamStop) {
                onStreamStop();
            }

            console.log('⏹️ Live streaming stopped');
        } catch (error) {
            console.error('Error stopping stream:', error);
            if (onError) {
                onError(error);
            }
        }
    }, [backendUrl, stopStatsMonitoring, onStreamStop, onError]);

    /**
     * Get local stream for recording
     */
    const getLocalStream = useCallback(() => {
        return localStreamRef.current;
    }, []);

    return {
        // State
        isStreaming,
        isRecordingLocally,
        isOfflineMode,
        currentCamera,
        availableCameras,
        streamStats,
        streamError,
        sessionId,

        // Methods
        startStreaming,
        stopStreaming,
        switchCamera,
        getLocalStream,

        // Utilities
        isVideoTrackActive: localStreamRef.current?.getVideoTracks()[0]?.enabled || false,
        isAudioTrackActive: localStreamRef.current?.getAudioTracks()[0]?.enabled || false,
    };
};

export default useLiveStreamController;
