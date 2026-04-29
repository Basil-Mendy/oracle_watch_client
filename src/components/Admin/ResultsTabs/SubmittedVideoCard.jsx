/**
 * SubmittedVideoCard Component
 * Displays submitted/recorded videos in a list format
 */
import React, { useState } from 'react';
import { Play, Download, Flag, CheckCircle, Clock, Eye } from 'lucide-react';
import { formatDuration, formatFileSize } from '../../../utils/videoUtils';

export const SubmittedVideoCard = ({
  videoId,
  pollingUnitName,
  pollingUnitId,
  lgaName,
  wardName,
  videoUrl,
  thumbnail,
  duration,
  fileSize,
  uploadedAt,
  status, // pending | approved | flagged
  metadata,
  onWatch,
  onDownload,
  onApprove,
  onFlag,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return '#28a745';
      case 'flagged':
        return '#dc3545';
      case 'pending':
      default:
        return '#ffc107';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} />;
      case 'flagged':
        return <Flag size={16} />;
      case 'pending':
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <div style={styles.card}>
      {/* Compact Row */}
      <div
        style={styles.cardHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Thumbnail */}
        <div style={styles.thumbnailContainer}>
          {thumbnail ? (
            <img src={thumbnail} alt={pollingUnitName} style={styles.thumbnail} />
          ) : (
            <div style={styles.placeholderThumbnail}>
              <Eye size={24} color="#999" />
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div style={styles.basicInfo}>
          <h4 style={styles.pollingUnitName}>{pollingUnitName}</h4>
          <p style={styles.locationText}>
            {wardName} • {lgaName}
          </p>
          <div style={styles.metadata}>
            <span style={styles.metadataItem}>
              {formatDuration(duration || 0)}
            </span>
            <span style={styles.metadataItem}>
              {formatFileSize(fileSize || 0)}
            </span>
            <span style={styles.metadataItem}>
              {new Date(uploadedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div style={styles.statusContainer}>
          <div
            style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(),
            }}
          >
            {getStatusIcon()}
            <span>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={styles.expandedDetails}>
          {/* Full Details */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Polling Unit ID:</span>
              <code style={styles.detailValue}>{pollingUnitId}</code>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Duration:</span>
              <span>{formatDuration(duration || 0)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>File Size:</span>
              <span>{formatFileSize(fileSize || 0)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Uploaded:</span>
              <span>
                {new Date(uploadedAt).toLocaleString()}
              </span>
            </div>

            {metadata?.network_status && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Network:</span>
                <span style={styles.networkBadge(metadata.network_status)}>
                  {metadata.network_status}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            {videoUrl && (
              <>
                <button
                  onClick={() => onWatch?.(videoId, videoUrl)}
                  style={styles.actionButton('primary')}
                >
                  <Play size={16} />
                  Watch
                </button>
                <button
                  onClick={() => onDownload?.(videoId, videoUrl)}
                  style={styles.actionButton('secondary')}
                >
                  <Download size={16} />
                  Download
                </button>
              </>
            )}

            {status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove?.(videoId)}
                  style={styles.actionButton('success')}
                >
                  <CheckCircle size={16} />
                  Approve
                </button>
                <button
                  onClick={() => onFlag?.(videoId)}
                  style={styles.actionButton('danger')}
                >
                  <Flag size={16} />
                  Flag
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '6px',
    borderLeft: '4px solid #007bff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    marginBottom: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },

  cardHeader: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    ':hover': {
      backgroundColor: '#f8f9fa',
    },
  },

  thumbnailContainer: {
    flex: '0 0 120px',
    position: 'relative',
  },

  thumbnail: {
    width: '100%',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '4px',
  },

  placeholderThumbnail: {
    width: '100%',
    height: '80px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  basicInfo: {
    flex: 1,
    minWidth: 0,
  },

  pollingUnitName: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: '#212529',
  },

  locationText: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    color: '#6c757d',
  },

  metadata: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#999',
  },

  metadataItem: {
    display: 'flex',
    alignItems: 'center',
  },

  statusContainer: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
  },

  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
  },

  expandedDetails: {
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
    padding: '16px',
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },

  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
  },

  detailValue: {
    fontSize: '14px',
    color: '#212529',
    wordBreak: 'break-all',
  },

  networkBadge: (status) => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: status === 'online' ? '#d4edda' : '#fff3cd',
    color: status === 'online' ? '#155724' : '#856404',
    fontSize: '12px',
    fontWeight: '600',
  }),

  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },

  actionButton: (variant) => {
    const variants = {
      primary: {
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background-color 0.3s ease',
      },
      secondary: {
        padding: '8px 16px',
        backgroundColor: '#6c757d',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background-color 0.3s ease',
      },
      success: {
        padding: '8px 16px',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background-color 0.3s ease',
      },
      danger: {
        padding: '8px 16px',
        backgroundColor: '#dc3545',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background-color 0.3s ease',
      },
    };
    return variants[variant] || variants.primary;
  },
};

export default SubmittedVideoCard;
