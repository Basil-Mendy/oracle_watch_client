/**
 * AdminVideoManagement Component
 * Main admin dashboard for monitoring live streams and managing submitted videos
 * Replaces the previous LiveVideosTab with enhanced functionality
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  Video,
  Eye,
  Download,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import LiveStreamCard from './LiveStreamCard';
import SubmittedVideoCard from './SubmittedVideoCard';
import { getApiUrl } from '../../../utils/apiUrl';
import { formatDuration } from '../../../utils/videoUtils';

export const AdminVideoManagement = ({ electionId, selectedLga, selectedWard }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token');

  // State Management
  const [liveStreams, setLiveStreams] = useState([]);
  const [submittedVideos, setSubmittedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLga, setFilterLga] = useState(selectedLga || '');
  const [filterWard, setFilterWard] = useState(selectedWard || '');
  const [activeTab, setActiveTab] = useState('live'); // live | submitted

  /**
   * Fetch live streams
   */
  const fetchLiveStreams = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        getApiUrl(`/results/admin/live-streams/?election_id=${electionId}`),
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch live streams');
      }

      const data = await response.json();
      setLiveStreams(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching live streams:', err);
      setError(err.message);
    }
  }, [electionId, token]);

  /**
   * Fetch submitted videos
   */
  const fetchSubmittedVideos = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        getApiUrl(`/results/admin/videos/?election_id=${electionId}`),
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch submitted videos');
      }

      const data = await response.json();
      setSubmittedVideos(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching submitted videos:', err);
      setError(err.message);
    }
  }, [electionId, token]);

  /**
   * Load both streams and videos
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLiveStreams(), fetchSubmittedVideos()]);
    setLoading(false);
  }, [fetchLiveStreams, fetchSubmittedVideos]);

  // Initial load and polling
  useEffect(() => {
    loadData();

    // Poll for new videos every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  /**
   * Filter and search videos
   */
  const filteredSubmittedVideos = useMemo(() => {
    return submittedVideos.filter((video) => {
      const matchesSearch = !searchTerm || 
        video.polling_unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.polling_unit_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.ward_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLga = !filterLga || video.lga_name === filterLga;
      const matchesWard = !filterWard || video.ward_name === filterWard;

      return matchesSearch && matchesLga && matchesWard;
    });
  }, [submittedVideos, searchTerm, filterLga, filterWard]);

  /**
   * Watch video in modal
   */
  const handleWatchVideo = useCallback((videoId, videoUrl) => {
    // Implement modal with video player
    window.open(videoUrl, '_blank');
  }, []);

  /**
   * Download video
   */
  const handleDownloadVideo = useCallback((videoId, videoUrl) => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `video-${videoId}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  /**
   * Approve video
   */
  const handleApproveVideo = useCallback(async (videoId) => {
    try {
      const response = await fetch(
        getApiUrl(`/results/admin/videos/${videoId}/approve/`),
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve video');
      }

      // Refresh videos
      await fetchSubmittedVideos();
    } catch (err) {
      console.error('Error approving video:', err);
      alert(err.message);
    }
  }, [token, fetchSubmittedVideos]);

  /**
   * Flag video
   */
  const handleFlagVideo = useCallback(async (videoId) => {
    try {
      const response = await fetch(
        getApiUrl(`/results/admin/videos/${videoId}/flag/`),
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to flag video');
      }

      // Refresh videos
      await fetchSubmittedVideos();
    } catch (err) {
      console.error('Error flagging video:', err);
      alert(err.message);
    }
  }, [token, fetchSubmittedVideos]);

  /**
   * End live stream
   */
  const handleEndStream = useCallback(async (streamId) => {
    try {
      const response = await fetch(
        getApiUrl(`/results/admin/live-streams/${streamId}/end/`),
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to end stream');
      }

      // Refresh streams
      await fetchLiveStreams();
    } catch (err) {
      console.error('Error ending stream:', err);
      alert(err.message);
    }
  }, [token, fetchLiveStreams]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Video size={24} style={{ marginRight: '12px' }} />
          <h2>Video Management</h2>
        </div>

        <button
          onClick={loadData}
          style={styles.refreshButton}
          disabled={loading}
        >
          <RefreshCw size={18} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard('live')}>
          <div style={styles.statValue}>{liveStreams.length}</div>
          <div style={styles.statLabel}>Live Streams</div>
        </div>
        <div style={styles.statCard('video')}>
          <div style={styles.statValue}>{submittedVideos.length}</div>
          <div style={styles.statLabel}>Submitted Videos</div>
        </div>
        <div style={styles.statCard('approved')}>
          <div style={styles.statValue}>
            {submittedVideos.filter((v) => v.status === 'approved').length}
          </div>
          <div style={styles.statLabel}>Approved</div>
        </div>
        <div style={styles.statCard('pending')}>
          <div style={styles.statValue}>
            {submittedVideos.filter((v) => v.status === 'pending').length}
          </div>
          <div style={styles.statLabel}>Pending Review</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={styles.errorAlert}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.closeButton}>
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          style={styles.tab(activeTab === 'live')}
          onClick={() => setActiveTab('live')}
        >
          <Video size={18} style={{ marginRight: '8px' }} />
          Live Streams ({liveStreams.length})
        </button>
        <button
          style={styles.tab(activeTab === 'submitted')}
          onClick={() => setActiveTab('submitted')}
        >
          <Eye size={18} style={{ marginRight: '8px' }} />
          Submitted Videos ({submittedVideos.length})
        </button>
      </div>

      {/* Live Streams Tab */}
      {activeTab === 'live' && (
        <div style={styles.tabContent}>
          {liveStreams.length === 0 ? (
            <div style={styles.emptyState}>
              <Video size={48} color="#ccc" />
              <p>No active live streams</p>
            </div>
          ) : (
            <div style={styles.liveStreamGrid}>
              {liveStreams.map((stream) => (
                <LiveStreamCard
                  key={stream.id}
                  pollingUnitId={stream.polling_unit_id}
                  pollingUnitName={stream.polling_unit_name}
                  lgaName={stream.lga_name}
                  wardName={stream.ward_name}
                  streamUrl={stream.stream_url}
                  isLive={stream.is_live}
                  duration={stream.duration}
                  thumbnail={stream.thumbnail}
                  onWatch={handleWatchVideo}
                  onEnd={handleEndStream}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submitted Videos Tab */}
      {activeTab === 'submitted' && (
        <div style={styles.tabContent}>
          {/* Filters */}
          <div style={styles.filtersContainer}>
            <div style={styles.filterGroup}>
              <Search size={18} color="#6c757d" />
              <input
                type="text"
                placeholder="Search by unit name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <select
              value={filterLga}
              onChange={(e) => setFilterLga(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All LGAs</option>
              {[...new Set(submittedVideos.map((v) => v.lga_name))].map((lga) => (
                <option key={lga} value={lga}>
                  {lga}
                </option>
              ))}
            </select>

            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Wards</option>
              {[...new Set(submittedVideos.map((v) => v.ward_name))].map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilterLga('');
                setFilterWard('');
              }}
              style={styles.resetButton}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          {/* Videos List */}
          {filteredSubmittedVideos.length === 0 ? (
            <div style={styles.emptyState}>
              <Eye size={48} color="#ccc" />
              <p>No videos submitted yet</p>
            </div>
          ) : (
            <div style={styles.videosList}>
              {filteredSubmittedVideos.map((video) => (
                <SubmittedVideoCard
                  key={video.id}
                  videoId={video.id}
                  pollingUnitName={video.polling_unit_name}
                  pollingUnitId={video.polling_unit_id}
                  lgaName={video.lga_name}
                  wardName={video.ward_name}
                  videoUrl={video.video_url}
                  thumbnail={video.thumbnail}
                  duration={video.duration}
                  fileSize={video.file_size}
                  uploadedAt={video.uploaded_at}
                  status={video.status}
                  metadata={video.metadata}
                  onWatch={handleWatchVideo}
                  onDownload={handleDownloadVideo}
                  onApprove={handleApproveVideo}
                  onFlag={handleFlagVideo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },

  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '24px',
    fontWeight: '700',
  },

  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
  },

  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },

  statCard: (type) => {
    const colors = {
      live: { border: '#dc3545', bg: '#fff5f5' },
      video: { border: '#007bff', bg: '#f0f7ff' },
      approved: { border: '#28a745', bg: '#f0fdf4' },
      pending: { border: '#ffc107', bg: '#fffbf0' },
    };
    const color = colors[type] || colors.live;

    return {
      padding: '16px',
      borderLeft: `4px solid ${color.border}`,
      backgroundColor: color.bg,
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    };
  },

  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px',
  },

  statLabel: {
    fontSize: '13px',
    color: '#6c757d',
    fontWeight: '600',
  },

  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '6px',
    marginBottom: '20px',
  },

  closeButton: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#721c24',
  },

  tabContainer: {
    display: 'flex',
    gap: '12px',
    borderBottom: '2px solid #e9ecef',
    marginBottom: '20px',
  },

  tab: (isActive) => ({
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #007bff' : '3px solid transparent',
    color: isActive ? '#007bff' : '#6c757d',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s ease',
  }),

  tabContent: {
    minHeight: '300px',
  },

  liveStreamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },

  filtersContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  filterGroup: {
    flex: 1,
    minWidth: '250px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  filterInput: {
    width: '100%',
    padding: '10px 16px 10px 40px',
    border: '2px solid #e9ecef',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.3s ease',
  },

  filterSelect: {
    padding: '10px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
    cursor: 'pointer',
  },

  resetButton: {
    padding: '10px 16px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  videosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#999',
  },
};

export default AdminVideoManagement;
