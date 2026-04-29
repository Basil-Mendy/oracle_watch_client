/**
 * Hook to manage WebRTC streaming
 * Handles peer connection, stream negotiation
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useWebRTC = (signalingServerUrl) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('idle'); // idle | connecting | connected | failed | closed

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const initializePeerConnection = useCallback(() => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      peerConnection.onconnectionstatechange = () => {
        setConnectionState(peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          setError('WebRTC connection failed');
        }
      };

      peerConnection.onicecandidateerror = (event) => {
        console.warn('ICE candidate error:', event);
      };

      peerConnectionRef.current = peerConnection;
      return peerConnection;
    } catch (err) {
      setError(`Failed to initialize peer connection: ${err.message}`);
      return null;
    }
  }, []);

  const startStreaming = useCallback(
    async (stream) => {
      try {
        setError(null);
        setConnectionState('connecting');

        if (!peerConnectionRef.current) {
          initializePeerConnection();
        }

        const peerConnection = peerConnectionRef.current;
        localStreamRef.current = stream;

        // Add all tracks from local stream
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Create offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });

        await peerConnection.setLocalDescription(offer);

        // Send offer to signaling server
        // This is where you'd integrate with your signaling server
        // For now, we'll assume the server handles this
        setIsStreaming(true);
      } catch (err) {
        setError(`Failed to start streaming: ${err.message}`);
        setIsStreaming(false);
      }
    },
    [initializePeerConnection]
  );

  const stopStreaming = useCallback(() => {
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      setIsStreaming(false);
      setConnectionState('closed');
    } catch (err) {
      setError(`Failed to stop streaming: ${err.message}`);
    }
  }, []);

  const sendAnswer = useCallback(async (offer) => {
    try {
      if (!peerConnectionRef.current) {
        return;
      }

      const peerConnection = peerConnectionRef.current;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      return answer;
    } catch (err) {
      setError(`Failed to send answer: ${err.message}`);
      return null;
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    try {
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isStreaming,
    connectionState,
    error,
    peerConnectionRef,
    localStreamRef,
    startStreaming,
    stopStreaming,
    sendAnswer,
    addIceCandidate,
    initializePeerConnection,
  };
};
