import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for segmented video recording
 * Automatically splits recordings into 5-10 minute chunks
 * Each chunk is stored with metadata for later upload
 * 
 * Features:
 * - Auto-segmentation every 5-10 minutes
 * - Battery warning
 * - Device wake-lock to prevent sleep
 * - Metadata tracking (polling_unit, timestamp, duration)
 * - Safe interruption handling
 */
export const useSegmentedRecorder = (options = {}) => {
    const {
        segmentDuration = 5 * 60 * 1000, // 5 minutes in ms
        maxSegmentDuration = 10 * 60 * 1000, // 10 minutes max
        bitrate = 2500000, // 2500 Kbps
        videoBitrate = 2500000,
        audioBitrate = 128000,
        width = 1280, // 720p
        height = 720,
        frameRate = 24,
        onSegmentComplete = null,
        onError = null,
    } = options;

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [segments, setSegments] = useState([]);
    const [currentSegmentDuration, setCurrentSegmentDuration] = useState(0);
    const [totalRecordingDuration, setTotalRecordingDuration] = useState(0);
    const [batteryLevel, setBatteryLevel] = useState(null);
    const [batteryWarning, setBatteryWarning] = useState(false);
    const [wakeLockSupported, setWakeLockSupported] = useState(false);
    const [recordingError, setRecordingError] = useState(null);

    // References
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const segmentTimerRef = useRef(null);
    const durationTimerRef = useRef(null);
    const wakeLockRef = useRef(null);
    const recordingStartTimeRef = useRef(null);
    const segmentStartTimeRef = useRef(null);

    // Check Wake Lock support
    useEffect(() => {
        setWakeLockSupported('wakeLock' in navigator);
    }, []);

    // Monitor battery
    useEffect(() => {
        const updateBattery = async () => {
            try {
                const battery = await navigator.getBattery?.();
                if (!battery) return;

                const updateStatus = () => {
                    setBatteryLevel(Math.round(battery.level * 100));
                    setBatteryWarning(battery.level < 0.15); // Warn if below 15%
                };

                updateStatus();
                battery.addEventListener('levelchange', updateStatus);
                battery.addEventListener('chargingchange', updateStatus);

                return () => {
                    battery.removeEventListener('levelchange', updateStatus);
                    battery.removeEventListener('chargingchange', updateStatus);
                };
            } catch (error) {
                console.warn('Battery API not available');
            }
        };

        updateBattery();
    }, []);

    // Request wake lock to prevent device sleep
    const requestWakeLock = useCallback(async () => {
        if (!wakeLockSupported) return;

        try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            console.log('✅ Wake Lock acquired - device will not sleep during recording');

            // Re-request wake lock if user switches tabs
            const handleVisibilityChange = async () => {
                if (document.hidden && wakeLockRef.current) {
                    wakeLockRef.current = null;
                } else if (!document.hidden && isRecording) {
                    try {
                        wakeLockRef.current = await navigator.wakeLock.request('screen');
                    } catch (error) {
                        console.error('Failed to re-acquire wake lock:', error);
                    }
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        } catch (error) {
            console.warn('Wake Lock request failed:', error);
        }
    }, [wakeLockSupported, isRecording]);

    // Release wake lock
    const releaseWakeLock = useCallback(() => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(error => {
                console.error('Failed to release wake lock:', error);
            });
            wakeLockRef.current = null;
        }
    }, []);

    // Create a segment from current chunks
    const createSegment = useCallback(async () => {
        if (chunksRef.current.length === 0) return null;

        const duration = Date.now() - (segmentStartTimeRef.current || recordingStartTimeRef.current);
        const mimeType = 'video/webm;codecs=vp9,opus';

        try {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            const timestamp = new Date().toISOString();
            const segmentId = `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const segment = {
                id: segmentId,
                blob,
                file: new File([blob], `${segmentId}.webm`, { type: mimeType }),
                duration,
                timestamp,
                metadata: {
                    startTime: segmentStartTimeRef.current || recordingStartTimeRef.current,
                    endTime: Date.now(),
                    durationMs: duration,
                    size: blob.size,
                    mimeType,
                },
            };

            chunksRef.current = []; // Reset chunks for next segment
            segmentStartTimeRef.current = Date.now();

            return segment;
        } catch (error) {
            console.error('❌ Error creating segment:', error);
            setRecordingError(`Failed to create segment: ${error.message}`);
            if (onError) onError(error);
            return null;
        }
    }, [onError]);

    // Handle segment completion
    const handleSegmentComplete = useCallback(async () => {
        if (!isRecording) return;

        const segment = await createSegment();
        if (segment) {
            setSegments(prev => [...prev, segment]);
            console.log(`✅ Segment completed: ${segment.id} (${(segment.duration / 1000).toFixed(1)}s)`);

            if (onSegmentComplete) {
                onSegmentComplete(segment);
            }

            // Reset segment duration timer
            setCurrentSegmentDuration(0);

            // Continue recording - start next segment
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                segmentTimerRef.current = setTimeout(handleSegmentComplete, segmentDuration);
            }
        }
    }, [isRecording, segmentDuration, createSegment, onSegmentComplete]);

    // Start recording
    const startRecording = useCallback(async (stream, metadata = {}) => {
        try {
            if (!stream) {
                throw new Error('No media stream provided');
            }

            setRecordingError(null);
            streamRef.current = stream;

            // Request wake lock
            await requestWakeLock();

            // Create MediaRecorder with optimized settings
            const mimeType = 'video/webm;codecs=vp9,opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.warn(`${mimeType} not supported, using default`);
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: videoBitrate,
                audioBitsPerSecond: audioBitrate,
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            recordingStartTimeRef.current = Date.now();
            segmentStartTimeRef.current = Date.now();

            // Handle data available
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = async () => {
                // Create final segment
                const finalSegment = await createSegment();
                if (finalSegment) {
                    setSegments(prev => [...prev, finalSegment]);
                    if (onSegmentComplete) {
                        onSegmentComplete(finalSegment);
                    }
                }
            };

            // Handle errors
            mediaRecorder.onerror = (event) => {
                const error = new Error(`MediaRecorder error: ${event.error}`);
                setRecordingError(error.message);
                if (onError) onError(error);
                console.error('❌ Recording error:', error);
            };

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setIsPaused(false);
            setCurrentSegmentDuration(0);
            setTotalRecordingDuration(0);

            // Start segment timer
            segmentTimerRef.current = setTimeout(handleSegmentComplete, segmentDuration);

            // Start duration counter
            durationTimerRef.current = setInterval(() => {
                setCurrentSegmentDuration(Date.now() - (segmentStartTimeRef.current || recordingStartTimeRef.current));
                setTotalRecordingDuration(Date.now() - recordingStartTimeRef.current);
            }, 1000);

            console.log('✅ Recording started with segmentation');

            return true;
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            setRecordingError(error.message);
            if (onError) onError(error);
            releaseWakeLock();
            return false;
        }
    }, [requestWakeLock, videoBitrate, audioBitrate, segmentDuration, handleSegmentComplete, onSegmentComplete, onError, releaseWakeLock]);

    // Pause recording
    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            clearInterval(durationTimerRef.current);
            clearTimeout(segmentTimerRef.current);
            console.log('⏸️ Recording paused');
        }
    }, []);

    // Resume recording
    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);

            // Restart timers
            segmentStartTimeRef.current = Date.now();
            durationTimerRef.current = setInterval(() => {
                setCurrentSegmentDuration(Date.now() - (segmentStartTimeRef.current || recordingStartTimeRef.current));
                setTotalRecordingDuration(Date.now() - recordingStartTimeRef.current);
            }, 1000);
            segmentTimerRef.current = setTimeout(handleSegmentComplete, segmentDuration);

            console.log('▶️ Recording resumed');
        }
    }, [segmentDuration, handleSegmentComplete]);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);

            // Clean up
            clearInterval(durationTimerRef.current);
            clearTimeout(segmentTimerRef.current);
            releaseWakeLock();

            // Stop all tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            console.log('⏹️ Recording stopped');
        }
    }, [releaseWakeLock]);

    // Clear all segments
    const clearSegments = useCallback(() => {
        setSegments([]);
        setCurrentSegmentDuration(0);
        setTotalRecordingDuration(0);
    }, []);

    // Download a segment for testing
    const downloadSegment = useCallback((segmentId) => {
        const segment = segments.find(s => s.id === segmentId);
        if (!segment) return;

        const url = URL.createObjectURL(segment.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${segmentId}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [segments]);

    return {
        // State
        isRecording,
        isPaused,
        segments,
        currentSegmentDuration,
        totalRecordingDuration,
        batteryLevel,
        batteryWarning,
        recordingError,

        // Methods
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        clearSegments,
        downloadSegment,

        // Utilities
        segmentCount: segments.length,
        totalSize: segments.reduce((sum, s) => sum + s.metadata.size, 0),
    };
};

export default useSegmentedRecorder;
