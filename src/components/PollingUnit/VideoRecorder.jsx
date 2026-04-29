/**
 * VideoRecorder Component
 * Main component managing the complete video recording and submission workflow
 * States: IDLE → LIVE/RECORDING_OFFLINE → ENDED → READY_TO_SUBMIT → UPLOADING → UPLOADED
 */
import React, { useState, useCallback, useReducer, useEffect } from 'react';
import {
  useNetworkStatus,
  useMediaRecorder,
  useWebRTC,
  useVideoUpload,
} from '../../hooks';
import {
  VIDEO_STATES,
  formatDuration,
  formatFileSize,
  getMediaStream,
  createVideoThumbnail,
  isValidTransition,
} from '../../utils/videoUtils';
import { Camera, Wifi, WifiOff, Square, Play, Upload, Check, X } from 'lucide-react';

const videoRecorderReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        state: action.payload,
        error: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        state: VIDEO_STATES.ERROR,
      };

    case 'SET_METADATA':
      return {
        ...state,
        metadata: { ...state.metadata, ...action.payload },
      };

    case 'SET_VIDEO_PREVIEW':
      return {
        ...state,
        videoPreview: action.payload,
      };

    case 'RESET':
      return {
        state: VIDEO_STATES.IDLE,
        metadata: {},
        videoPreview: null,
        error: null,
        videoBlob: null,
      };

    default:
      return state;
  }
};

export const VideoRecorder = ({
  pollingUnitId,
  pollingUnitName,
  lgaId,
  lgaName,
  wardId,
  wardName,
  cloudinaryCloudName,
  cloudinaryUploadPreset,
  onUploadSuccess,
  onUploadError,
}) => {
  const [recorderState, dispatch] = useReducer(videoRecorderReducer, {
    state: VIDEO_STATES.IDLE,
    metadata: {
      polling_unit_id: pollingUnitId,
      polling_unit_name: pollingUnitName,
      lga_id: lgaId,
      lga_name: lgaName,
      ward_id: wardId,
      ward_name: wardName,
    },
    videoPreview: null,
    error: null,
    videoBlob: null,
  });

  const { isOnline } = useNetworkStatus();
  const mediaRecorder = useMediaRecorder();
  const webRTC = useWebRTC();
  const videoUpload = useVideoUpload(cloudinaryCloudName, cloudinaryUploadPreset);
  const [localStream, setLocalStream] = useState(null);
  const [videoPreviewing, setVideoPreviewing] = useState(false);

  /**
   * Start recording (live if online, offline if no network)
   */
  const handleStartRecording = useCallback(async () => {
    try {
      const mediaResult = await getMediaStream();
      if (!mediaResult.success) {
        dispatch({
          type: 'SET_ERROR',
          payload: mediaResult.error,
        });
        return;
      }

      setLocalStream(mediaResult.stream);
      mediaRecorder.startRecording(mediaResult.stream);

      if (isOnline) {
        // Try to start WebRTC streaming
        try {
          await webRTC.startStreaming(mediaResult.stream);
          dispatch({
            type: 'SET_STATE',
            payload: VIDEO_STATES.LIVE,
          });
        } catch (err) {
          // Fall back to recording only
          dispatch({
            type: 'SET_STATE',
            payload: VIDEO_STATES.RECORDING_OFFLINE,
          });
        }
      } else {
        // No network, record offline
        dispatch({
          type: 'SET_STATE',
          payload: VIDEO_STATES.RECORDING_OFFLINE,
        });
      }

      dispatch({
        type: 'SET_METADATA',
        payload: {
          network_status: isOnline ? 'online' : 'offline',
          started_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.message,
      });
    }
  }, [isOnline, mediaRecorder, webRTC]);

  /**
   * Stop recording and prepare for submission
   */
  const handleStopRecording = useCallback(async () => {
    try {
      mediaRecorder.stopRecording();
      webRTC.stopStreaming();

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      const videoBlob = mediaRecorder.getVideoBlob();
      if (!videoBlob) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'No video was recorded',
        });
        return;
      }

      // Create thumbnail
      const thumbnail = await createVideoThumbnail(videoBlob);
      const thumbnailUrl = URL.createObjectURL(thumbnail);

      dispatch({
        type: 'SET_VIDEO_PREVIEW',
        payload: {
          blob: videoBlob,
          thumbnail: thumbnailUrl,
          size: videoBlob.size,
        },
      });

      dispatch({
        type: 'SET_METADATA',
        payload: {
          ended_at: new Date().toISOString(),
          duration: mediaRecorder.recordingDuration,
          size: videoBlob.size,
        },
      });

      dispatch({
        type: 'SET_STATE',
        payload: VIDEO_STATES.READY_TO_SUBMIT,
      });

      setVideoPreviewing(true);
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.message,
      });
    }
  }, [mediaRecorder, webRTC, localStream]);

  /**
   * Submit video for upload
   */
  const handleSubmitVideo = useCallback(async () => {
    if (!recorderState.videoPreview) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'No video to submit',
      });
      return;
    }

    dispatch({
      type: 'SET_STATE',
      payload: VIDEO_STATES.UPLOADING,
    });

    const result = await videoUpload.uploadVideo(
      recorderState.videoPreview.blob,
      recorderState.metadata
    );

    if (result && !result.error) {
      dispatch({
        type: 'SET_STATE',
        payload: VIDEO_STATES.UPLOADED,
      });

      if (onUploadSuccess) {
        onUploadSuccess({
          url: result.url,
          metadata: recorderState.metadata,
        });
      }
    } else {
      dispatch({
        type: 'SET_ERROR',
        payload: result?.error || 'Upload failed',
      });

      if (onUploadError) {
        onUploadError(result?.error);
      }
    }
  }, [recorderState, videoUpload, onUploadSuccess, onUploadError]);

  /**
   * Reset for new recording
   */
  const handleReset = useCallback(() => {
    mediaRecorder.reset();
    videoUpload.reset();
    dispatch({ type: 'RESET' });
    setVideoPreviewing(false);
    setLocalStream(null);
  }, [mediaRecorder, videoUpload]);

  const isRecording = mediaRecorder.isRecording;
  const isBusyState =
    recorderState.state === VIDEO_STATES.UPLOADING ||
    recorderState.state === VIDEO_STATES.ERROR;

  return (
    <div className="video-recorder" style={styles.container}>
      {/* Status Indicator */}
      <div style={styles.statusBar}>
        <div style={styles.statusContent}>
          <div style={styles.statusLeft}>
            {isOnline ? (
              <>
                <Wifi size={16} style={{ color: '#28a745', marginRight: '8px' }} />
                <span>Online - Live streaming available</span>
              </>
            ) : (
              <>
                <WifiOff size={16} style={{ color: '#dc3545', marginRight: '8px' }} />
                <span>Offline - Recording locally</span>
              </>
            )}
          </div>

          <div style={styles.stateIndicator}>
            <span style={styles.stateBadge(recorderState.state)}>
              {recorderState.state}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {recorderState.state === VIDEO_STATES.IDLE && (
        <div style={styles.idleState}>
          <Camera size={48} style={{ color: '#6c757d', marginBottom: '16px' }} />
          <h3>Ready to record</h3>
          <p>
            {pollingUnitName} • {wardName} • {lgaName}
          </p>
          <button
            onClick={handleStartRecording}
            style={styles.button('primary')}
            disabled={isRecording}
          >
            <Play size={18} style={{ marginRight: '8px' }} />
            Go Live
          </button>
        </div>
      )}

      {/* Live / Recording State */}
      {(recorderState.state === VIDEO_STATES.LIVE ||
        recorderState.state === VIDEO_STATES.RECORDING_OFFLINE) && (
        <div style={styles.recordingState}>
          {/* Duration Timer */}
          <div style={styles.timerContainer}>
            <div style={styles.timer}>
              {recorderState.state === VIDEO_STATES.LIVE && (
                <div style={styles.liveBadge}>
                  <div style={styles.liveDot} />
                  LIVE
                </div>
              )}
              {recorderState.state === VIDEO_STATES.RECORDING_OFFLINE && (
                <div style={styles.recordingBadge}>
                  <div style={styles.recordingDot} />
                  Recording Offline
                </div>
              )}
              <div style={styles.duration}>
                {formatDuration(mediaRecorder.recordingDuration)}
              </div>
            </div>
          </div>

          {/* Video Preview */}
          <div style={styles.videoPreviewArea}>
            <div style={styles.videoPlaceholder}>
              <Camera size={32} style={{ color: '#ccc' }} />
              <p>Live Stream</p>
            </div>
          </div>

          {/* Recording Controls */}
          <div style={styles.recordingControls}>
            <button
              onClick={handleStopRecording}
              style={styles.button('danger')}
              disabled={!isRecording}
            >
              <Square size={18} style={{ marginRight: '8px' }} />
              Stop Recording
            </button>
          </div>
        </div>
      )}

      {/* Preview State */}
      {recorderState.state === VIDEO_STATES.READY_TO_SUBMIT && videoPreviewing && (
        <div style={styles.previewState}>
          {recorderState.videoPreview?.thumbnail && (
            <img
              src={recorderState.videoPreview.thumbnail}
              alt="Video thumbnail"
              style={styles.thumbnailImage}
            />
          )}

          {/* Video Info */}
          <div style={styles.videoInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Unit:</span>
              <span>{pollingUnitName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Duration:</span>
              <span>{formatDuration(recorderState.metadata.duration)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Size:</span>
              <span>{formatFileSize(recorderState.videoPreview.size)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Recorded:</span>
              <span>
                {new Date(recorderState.metadata.started_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              onClick={handleSubmitVideo}
              style={styles.button('primary')}
              disabled={videoUpload.isUploading}
            >
              <Upload size={18} style={{ marginRight: '8px' }} />
              Submit to Admin
            </button>
            <button
              onClick={handleReset}
              style={styles.button('secondary')}
              disabled={videoUpload.isUploading}
            >
              Record Again
            </button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {recorderState.state === VIDEO_STATES.UPLOADING && (
        <div style={styles.uploadingState}>
          <div style={styles.uploadProgressContainer}>
            <div style={styles.uploadProgressBar}>
              <div
                style={{
                  ...styles.uploadProgressFill,
                  width: `${videoUpload.uploadProgress}%`,
                }}
              />
            </div>
            <p>{videoUpload.uploadProgress}%</p>
          </div>
        </div>
      )}

      {/* Uploaded State */}
      {recorderState.state === VIDEO_STATES.UPLOADED && (
        <div style={styles.uploadedState}>
          <Check size={48} style={{ color: '#28a745', marginBottom: '16px' }} />
          <h3>Submitted Successfully ✅</h3>
          <p>Your video has been uploaded and is being reviewed.</p>
          <button
            onClick={handleReset}
            style={styles.button('primary')}
          >
            Record New Video
          </button>
        </div>
      )}

      {/* Error State */}
      {recorderState.state === VIDEO_STATES.ERROR && (
        <div style={styles.errorState}>
          <X size={48} style={{ color: '#dc3545', marginBottom: '16px' }} />
          <h3>Error</h3>
          <p>{recorderState.error}</p>
          <div style={styles.actionButtons}>
            <button
              onClick={handleReset}
              style={styles.button('primary')}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },

  statusBar: {
    marginBottom: '20px',
    padding: '12px 16px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    borderLeft: '4px solid #007bff',
  },

  statusContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#495057',
  },

  stateIndicator: {
    display: 'flex',
    gap: '8px',
  },

  stateBadge: (state) => ({
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    backgroundColor: state === VIDEO_STATES.LIVE ? '#dc3545' : '#007bff',
    color: '#fff',
  }),

  // State-specific styles
  idleState: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '6px',
  },

  recordingState: {
    backgroundColor: '#fff',
    borderRadius: '6px',
    overflow: 'hidden',
  },

  timerContainer: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
  },

  timer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#dc3545',
  },

  recordingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffc107',
  },

  liveDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#dc3545',
    animation: 'pulse 1.5s infinite',
  },

  recordingDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#ffc107',
    animation: 'pulse 1.5s infinite',
  },

  duration: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'monospace',
  },

  videoPreviewArea: {
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },

  videoPlaceholder: {
    textAlign: 'center',
    color: '#999',
  },

  previewState: {
    backgroundColor: '#fff',
    borderRadius: '6px',
    overflow: 'hidden',
  },

  thumbnailImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
    maxHeight: '400px',
    objectFit: 'cover',
  },

  videoInfo: {
    padding: '20px',
    borderBottom: '1px solid #e9ecef',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },

  infoLabel: {
    fontWeight: '600',
    color: '#495057',
  },

  actionButtons: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
  },

  recordingControls: {
    padding: '20px',
    display: 'flex',
    gap: '12px',
  },

  uploadingState: {
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    textAlign: 'center',
  },

  uploadProgressContainer: {
    marginBottom: '20px',
  },

  uploadProgressBar: {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },

  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    transition: 'width 0.3s ease',
  },

  uploadedState: {
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    textAlign: 'center',
  },

  errorState: {
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    textAlign: 'center',
  },

  button: (variant) => {
    const variants = {
      primary: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: '#007bff',
        color: '#fff',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
      },
      secondary: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
        border: '2px solid #6c757d',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        color: '#6c757d',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
      },
      danger: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: '#dc3545',
        color: '#fff',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
      },
    };

    return variants[variant] || variants.primary;
  },
};

export default VideoRecorder;
