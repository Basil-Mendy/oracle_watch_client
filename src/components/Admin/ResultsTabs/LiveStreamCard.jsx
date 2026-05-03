/**
 * LiveStreamCard Component
 * Displays a single live stream in a CCTV-style grid card
 */
import React, { useState } from 'react';
import { Play, AlertCircle } from 'lucide-react';

export const LiveStreamCard = ({
  pollingUnitId,
  pollingUnitName,
  lgaName,
  wardName,
  streamUrl,
  isLive,
  duration,
  onWatch,
  thumbnail,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showError, setShowError] = useState(false);

  return (
    <div
      style={styles.card}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail/Stream Container */}
      <div style={styles.streamContainer}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={pollingUnitName}
            style={styles.thumbnail}
          />
        ) : (
          <div style={styles.placeholderThumbnail}>
            {/* Show fallback message when no stream URL available */}
            <div style={styles.placeholderContent}>
              <div style={styles.recordingDot} />
              <p style={{ color: '#fff', fontSize: '13px', marginTop: '12px', fontWeight: '600' }}>
                📹 RECORDING
              </p>
              <p style={{ color: '#aaa', fontSize: '11px', marginTop: '6px' }}>
                Video available after recording ends
              </p>
            </div>
          </div>
        )}

        {/* Live Badge */}
        {isLive && (
          <div style={styles.liveBadgeContainer}>
            <div style={styles.liveBadge}>
              <div style={styles.liveDot} />
              LIVE
            </div>
          </div>
        )}

        {/* Overlay on Hover */}
        {isHovering && isLive && (
          <div style={styles.overlay}>
            <button
              onClick={() => onWatch?.(pollingUnitId)}
              style={styles.watchButton}
            >
              <Play size={24} style={{ marginRight: '8px' }} />
              Watch Live
            </button>
          </div>
        )}

        {/* Duration */}
        {duration && (
          <div style={styles.durationBadge}>
            {typeof duration === 'number'
              ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
              : duration}
          </div>
        )}
      </div>

      {/* Polling Unit Info */}
      <div style={styles.infoContainer}>
        <h4 style={styles.pollingUnitName}>{pollingUnitName}</h4>

        <div style={styles.locationInfo}>
          <p style={styles.locationText}>{wardName}</p>
          <p style={styles.locationText}>{lgaName}</p>
        </div>

        <div style={styles.pollingUnitId}>
          ID: <code>{pollingUnitId}</code>
        </div>

        {/* Status Indicator */}
        <div style={styles.statusIndicator}>
          {isLive ? (
            <span style={styles.statusBadge('live')}>● Active Stream</span>
          ) : (
            <span style={styles.statusBadge('offline')}>● Offline</span>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '2px solid transparent',
    ':hover': {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    },
  },

  streamContainer: {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // 16:9 aspect ratio
    backgroundColor: '#000',
  },

  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  placeholderThumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#2c3e50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  recordingDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#dc3545',
    animation: 'pulse 1.5s infinite',
  },

  liveBadgeContainer: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 10,
  },

  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },

  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    animation: 'pulse 1.5s infinite',
  },

  durationBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    padding: '4px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  watchButton: {
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.3s ease',
  },

  infoContainer: {
    padding: '16px',
  },

  pollingUnitName: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#212529',
  },

  locationInfo: {
    marginBottom: '12px',
  },

  locationText: {
    margin: '2px 0',
    fontSize: '13px',
    color: '#6c757d',
  },

  pollingUnitId: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '12px',
    wordBreak: 'break-all',
  },

  statusIndicator: {
    marginBottom: '12px',
  },

  statusBadge: (status) => ({
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    backgroundColor: status === 'live' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(108, 117, 125, 0.1)',
    color: status === 'live' ? '#dc3545' : '#6c757d',
    fontWeight: '600',
  }),
};

export default LiveStreamCard;
