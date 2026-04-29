/**
 * Video system utilities
 */

/**
 * Format duration in seconds to HH:MM:SS
 */
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(String(hours).padStart(2, '0'));
  }
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(secs).padStart(2, '0'));

  return parts.join(':');
};

/**
 * Format bytes to human readable size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if browser supports getUserMedia
 */
export const supportsUserMedia = () => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof window !== 'undefined'
  );
};

/**
 * Check if browser supports MediaRecorder
 */
export const supportsMediaRecorder = () => {
  return typeof MediaRecorder !== 'undefined';
};

/**
 * Check if browser supports WebRTC
 */
export const supportsWebRTC = () => {
  return !!(
    window.RTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection
  );
};

/**
 * Video recorder state machine
 */
export const VIDEO_STATES = {
  IDLE: 'IDLE',
  LIVE: 'LIVE',
  RECORDING_OFFLINE: 'RECORDING_OFFLINE',
  ENDED: 'ENDED',
  READY_TO_SUBMIT: 'READY_TO_SUBMIT',
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  ERROR: 'ERROR',
};

/**
 * Get next valid state transitions
 */
export const getValidNextStates = (currentState) => {
  const transitions = {
    [VIDEO_STATES.IDLE]: [VIDEO_STATES.LIVE, VIDEO_STATES.RECORDING_OFFLINE],
    [VIDEO_STATES.LIVE]: [VIDEO_STATES.ENDED],
    [VIDEO_STATES.RECORDING_OFFLINE]: [VIDEO_STATES.ENDED],
    [VIDEO_STATES.ENDED]: [VIDEO_STATES.READY_TO_SUBMIT],
    [VIDEO_STATES.READY_TO_SUBMIT]: [VIDEO_STATES.UPLOADING, VIDEO_STATES.IDLE],
    [VIDEO_STATES.UPLOADING]: [VIDEO_STATES.UPLOADED, VIDEO_STATES.ERROR],
    [VIDEO_STATES.UPLOADED]: [VIDEO_STATES.IDLE],
    [VIDEO_STATES.ERROR]: [VIDEO_STATES.IDLE, VIDEO_STATES.UPLOADING],
  };

  return transitions[currentState] || [];
};

/**
 * Validate state transition
 */
export const isValidTransition = (from, to) => {
  const validStates = getValidNextStates(from);
  return validStates.includes(to);
};

/**
 * Get camera and microphone permissions
 */
export const getMediaStream = async (constraints = {}) => {
  try {
    if (!supportsUserMedia()) {
      throw new Error('getUserMedia is not supported in this browser');
    }

    const defaultConstraints = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      ...constraints,
    };

    const stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
    return { success: true, stream };
  } catch (error) {
    let message = 'Unknown error accessing media devices';

    if (error.name === 'NotAllowedError') {
      message = 'Permission denied to access camera/microphone';
    } else if (error.name === 'NotFoundError') {
      message = 'No camera or microphone found';
    } else if (error.name === 'NotReadableError') {
      message = 'Camera or microphone is already in use';
    } else if (error.name === 'SecurityError') {
      message = 'Security error - this page must be served over HTTPS';
    }

    return { success: false, error: message };
  }
};

/**
 * Create video thumbnail from blob
 */
export const createVideoThumbnail = async (videoBlob) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const url = URL.createObjectURL(videoBlob);
    video.src = url;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.oncanplay = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/jpeg');
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to create thumbnail'));
    };
  });
};

/**
 * Store offline video in IndexedDB for later upload
 */
export const storeOfflineVideo = async (db, video) => {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(['offlineVideos'], 'readwrite')
      .objectStore('offlineVideos')
      .add(video);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get stored offline videos
 */
export const getOfflineVideos = async (db) => {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(['offlineVideos'], 'readonly')
      .objectStore('offlineVideos')
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete stored offline video
 */
export const deleteOfflineVideo = async (db, id) => {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(['offlineVideos'], 'readwrite')
      .objectStore('offlineVideos')
      .delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
