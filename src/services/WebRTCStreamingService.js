/**
 * WebRTC Live Streaming Implementation
 * Real-time video streaming from polling unit to admin (like Facebook Live)
 * 
 * Architecture:
 * - Polling Unit: Captures camera → Creates RTCPeerConnection → Sends stream
 * - Signaling Server: Exchanges SDP offers/answers and ICE candidates via WebSocket
 * - Admin: Receives stream → Displays in video element
 */

/**
 * Get the correct WebSocket URL for the signaling server
 * Converts API base URL (http://localhost:8000/api) to WebSocket URL (ws://localhost:8000/ws/live-stream/)
 */
function getSignalingUrl() {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    // Extract host from API URL (e.g., localhost:8000)
    try {
        const url = new URL(apiBaseUrl);
        const host = url.host; // localhost:8000
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${host}/ws/live-stream/`;
    } catch (e) {
        // Fallback if URL parsing fails
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//localhost:8000/ws/live-stream/`;
    }
}

// ============================================================================
// 1. POLLING UNIT SIDE: Create and Stream
// ============================================================================

/**
 * LiveStreamManager - Handles WebRTC streaming from polling unit
 * 
 * Usage:
 * const stream = new LiveStreamManager('unit-123', 'pass', 'election-uuid', {
 *   onLocalStream: (stream) => videoRef.current.srcObject = stream,
 *   onStreamStart: () => console.log('Streaming!'),
 *   onError: (err) => console.error('Stream error:', err)
 * });
 * 
 * stream.startStreaming();  // Begin WebRTC streaming
 * stream.stopStreaming();   // End stream
 */
class LiveStreamManager {
    constructor(unitId, password, electionId, callbacks = {}) {
        this.unitId = unitId;
        this.password = password;
        this.electionId = electionId;

        // Callbacks
        this.onLocalStream = callbacks.onLocalStream || (() => { });
        this.onRemoteStream = callbacks.onRemoteStream || (() => { });
        this.onStreamStart = callbacks.onStreamStart || (() => { });
        this.onStreamEnd = callbacks.onStreamEnd || (() => { });
        this.onError = callbacks.onError || (() => { });
        this.onStats = callbacks.onStats || (() => { });

        // State
        this.peerConnection = null;
        this.localStream = null;
        this.signalingSocket = null;
        this.sessionId = null;
        this.isStreaming = false;
        this.statsInterval = null;
    }

    /**
     * Start streaming: Connect to signaling, get camera, create peer connection
     */
    async startStreaming() {
        try {

            // Step 1: Connect to signaling server
            await this.connectToSignaling();

            // Step 2: Request camera access
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.onLocalStream(this.localStream);

            // Step 3: Create peer connection and add stream
            this.createPeerConnection();
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Step 4: Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.signalingSocket.send(JSON.stringify({
                type: 'offer',
                sessionId: this.sessionId,
                sdp: offer.sdp
            }));

            // Step 5: Monitor stream quality
            this.startStatsMonitoring();

            this.isStreaming = true;
            this.onStreamStart();

        } catch (error) {
            this.onError(error);
            this.stopStreaming();
        }
    }

    /**
     * Connect to WebSocket signaling server
     */
    connectToSignaling() {
        return new Promise((resolve, reject) => {
            try {
                const signalingUrl = getSignalingUrl();

                this.signalingSocket = new WebSocket(signalingUrl);

                this.signalingSocket.onopen = async () => {

                    // Authenticate with polling unit credentials
                    this.signalingSocket.send(JSON.stringify({
                        type: 'auth',
                        unitId: this.unitId,
                        password: this.password,
                        electionId: this.electionId,
                        role: 'broadcaster'
                    }));
                };

                this.signalingSocket.onmessage = (event) => {
                    const message = JSON.parse(event.data);

                    if (message.type === 'auth_success') {
                        this.sessionId = message.sessionId;
                        resolve();
                    } else if (message.type === 'auth_error') {
                        reject(new Error(message.error));
                    } else if (message.type === 'answer') {
                        // Received answer from viewer
                        try {
                            const answer = {
                                type: 'answer',
                                sdp: message.sdp
                            };
                            this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
                                .catch(err => { /* connection update */ });
                        } catch (err) {
                            /* answer handling error */
                        }
                    } else if (message.type === 'ice_candidate') {
                        // Received ICE candidate from viewer
                        try {
                            if (message.candidate) {
                                this.peerConnection.addIceCandidate(
                                    new RTCIceCandidate(message.candidate)
                                );
                            }
                        } catch (err) {
                            /* ice candidate error */
                        }
                    }
                };

                this.signalingSocket.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Create RTCPeerConnection with STUN servers
     */
    createPeerConnection() {
        const config = {
            iceServers: [
                { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
            ]
        };

        this.peerConnection = new RTCPeerConnection(config);

        // Send ICE candidates to viewer
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.signalingSocket?.readyState === WebSocket.OPEN) {
                this.signalingSocket.send(JSON.stringify({
                    type: 'ice_candidate',
                    sessionId: this.sessionId,
                    candidate: event.candidate
                }));
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
        };
    }

    /**
     * Monitor streaming quality metrics
     */
    startStatsMonitoring() {
    this.statsInterval = setInterval(async () => {
        if (!this.peerConnection) return;

        const stats = await this.peerConnection.getStats();
        let videoBitrate = 0;
        let videoResolution = '0x0';
        let frameRate = 0;

        stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
                const bitrate = (report.bytesSent - (this.lastBytesSent || 0)) * 8 / 1000; // kbps
                videoBitrate = Math.round(bitrate);
                frameRate = report.framesPerSecond || 0;
                this.lastBytesSent = report.bytesSent;
            }
            if (report.type === 'outbound-rtp' && report.videoResolutionSent) {
                videoResolution = `${report.videoResolutionSent}`;
            }
        });

        this.onStats({ videoBitrate, videoResolution, frameRate });
    }, 1000);
    }

    /**
     * Stop streaming and clean up
     */
    stopStreaming() {
        if (this.statsInterval) clearInterval(this.statsInterval);
        if (this.localStream) this.localStream.getTracks().forEach(t => t.stop());
        if (this.peerConnection) this.peerConnection.close();
        if (this.signalingSocket) this.signalingSocket.close();

        this.isStreaming = false;
        this.onStreamEnd();
    }
}

// ============================================================================
// 2. ADMIN SIDE: View Live Stream
// ============================================================================

/**
 * AdminStreamViewer - Watch live stream in admin dashboard
 * 
 * Usage:
 * const viewer = new AdminStreamViewer('admin-token', {
 *   onRemoteStream: (stream) => videoRef.current.srcObject = stream,
 *   onStreamReceived: () => console.log('Receiving stream!'),
 *   onError: (err) => console.error('Viewer error:', err)
 * });
 * 
 * viewer.watchStream('session-uuid', 'Unit A');
 */
class AdminStreamViewer {
    constructor(authToken, callbacks = {}) {
        this.authToken = authToken;

        this.onRemoteStream = callbacks.onRemoteStream || (() => { });
        this.onStreamReceived = callbacks.onStreamReceived || (() => { });
        this.onError = callbacks.onError || (() => { });
        this.onStats = callbacks.onStats || (() => { });

        this.peerConnection = null;
        this.signalingSocket = null;
        this.sessionId = null;
        this.isWatching = false;
        this.statsInterval = null;
    }

    /**
     * Watch a live stream
     */
    async watchStream(sessionId, unitName) {
        try {

            // Connect to signaling server
            await this.connectToSignaling(sessionId);

            // Create peer connection
            this.createPeerConnection();

            // Receive remote stream
            this.peerConnection.ontrack = (event) => {
                this.onRemoteStream(event.streams[0]);
                this.onStreamReceived();
                this.startStatsMonitoring();
            };

            // Create answer to broadcaster's offer
            // (This is done automatically when we receive the offer from signaling)

            this.isWatching = true;

        } catch (error) {
            this.onError(error);
            this.stopWatching();
        }
    }

    /**
     * Connect as viewer to signaling server
     */
    connectToSignaling(sessionId) {
        return new Promise((resolve, reject) => {
            try {
                const signalingUrl = getSignalingUrl();

                this.signalingSocket = new WebSocket(signalingUrl);
                this.sessionId = sessionId;

                this.signalingSocket.onopen = () => {
                    console.log('✅ Connected to signaling server as viewer');

                    // Authenticate as viewer
                    this.signalingSocket.send(JSON.stringify({
                        type: 'auth',
                        sessionId: sessionId,
                        token: this.authToken,
                        role: 'viewer'
                    }));
                };

                this.signalingSocket.onmessage = async (event) => {
                    const message = JSON.parse(event.data);

                    if (message.type === 'auth_success') {
                        console.log('✅ Viewer authentication successful');
                        resolve();
                    } else if (message.type === 'auth_error') {
                        reject(new Error(message.error));
                    } else if (message.type === 'offer') {
                        // Received offer from broadcaster
                        try {
                            const offer = {
                                type: 'offer',
                                sdp: message.sdp
                            };

                            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

                            const answer = await this.peerConnection.createAnswer();

                            await this.peerConnection.setLocalDescription(answer);

                            // Send answer back to broadcaster
                            this.signalingSocket.send(JSON.stringify({
                                type: 'answer',
                                sessionId: this.sessionId,
                                sdp: answer.sdp
                            }));
                        } catch (err) {
                            this.onError(err);
                        }
                    } else if (message.type === 'ice_candidate') {
                    // Received ICE candidate from broadcaster
                    try {
                        if (message.candidate) {
                            await this.peerConnection.addIceCandidate(
                                new RTCIceCandidate(message.candidate)
                            );
                        }
                    } catch (err) {
                    }
                }
            };

            this.signalingSocket.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            };

        } catch (error) {
            reject(error);
        }
    });
}

    /**
     * Create peer connection for viewing
     */
    createPeerConnection() {
        const config = {
            iceServers: [
                { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
            ]
        };

        this.peerConnection = new RTCPeerConnection(config);

        // Send ICE candidates to broadcaster
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.signalingSocket?.readyState === WebSocket.OPEN) {
                this.signalingSocket.send(JSON.stringify({
                    type: 'ice_candidate',
                    sessionId: this.sessionId,
                    candidate: event.candidate
                }));
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
            console.log('📡 Viewer connection state:', this.peerConnection.connectionState);
        };
    }

    /**
     * Monitor stream quality
     */
    startStatsMonitoring() {
        this.statsInterval = setInterval(async () => {
            if (!this.peerConnection) return;

            const stats = await this.peerConnection.getStats();
            let videoBitrate = 0;
            let videoResolution = '0x0';
            let frameRate = 0;
            let latency = 0;

            stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                    const bitrate = (report.bytesReceived - (this.lastBytesReceived || 0)) * 8 / 1000;
                    videoBitrate = Math.round(bitrate);
                    frameRate = report.framesDecoded ? Math.round(report.framesDecoded / 30) : 0;
                    videoResolution = `${report.frameWidth}x${report.frameHeight}`;
                    this.lastBytesReceived = report.bytesReceived;
                }
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    latency = Math.round(report.currentRoundTripTime * 1000);
                }
            });

            this.onStats({ videoBitrate, videoResolution, frameRate, latency });
        }, 1000);
    }

    /**
     * Stop watching stream
     */
    stopWatching() {
        console.log('🛑 Stopping viewer...');

        if (this.statsInterval) clearInterval(this.statsInterval);
        if (this.peerConnection) this.peerConnection.close();
        if (this.signalingSocket) this.signalingSocket.close();

        this.isWatching = false;
    }
}

export { LiveStreamManager, AdminStreamViewer };
