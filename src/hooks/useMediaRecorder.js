/**
 * Hook to manage MediaRecorder API
 * Handles recording start/stop and chunk collection
 */
import { useState, useRef, useCallback } from 'react';

export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const startRecording = useCallback(async (stream) => {
    try {
      setError(null);
      setRecordedChunks([]);
      setRecordingDuration(0);

      streamRef.current = stream;

      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks([...chunks]);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect chunks every 1 second
      setIsRecording(true);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }

        // Stop all tracks in stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      }
    } catch (err) {
      setError(`Failed to stop recording: ${err.message}`);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.pause();
      }
    } catch (err) {
      setError(`Failed to pause recording: ${err.message}`);
    }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
    } catch (err) {
      setError(`Failed to resume recording: ${err.message}`);
    }
  }, []);

  const getVideoBlob = useCallback(() => {
    if (recordedChunks.length === 0) {
      return null;
    }
    return new Blob(recordedChunks, { type: 'video/webm' });
  }, [recordedChunks]);

  const reset = useCallback(() => {
    setIsRecording(false);
    setRecordedChunks([]);
    setRecordingDuration(0);
    setError(null);
    mediaRecorderRef.current = null;
    streamRef.current = null;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, []);

  return {
    isRecording,
    recordingDuration,
    recordedChunks,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getVideoBlob,
    reset,
  };
};
