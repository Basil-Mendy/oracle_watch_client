/**
 * AdminVideoManagement Component
 * Admin dashboard with live CCTV wall and submitted videos management
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  Video,
  Eye,
  Download,
  AlertCircle,
  Search,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import SubmittedVideoCard from './SubmittedVideoCard';
import LiveStreamWall from './LiveStreamWall';
import { getApiUrl } from '../../../utils/apiUrl';

export const AdminVideoManagement = ({ electionId, selectedLga, selectedWard }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token');

  // State Management
  const [submittedVideos, setSubmittedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLga, setFilterLga] = useState(selectedLga || '');
  const [filterWard, setFilterWard] = useState(selectedWard || '');
  const [activeTab, setActiveTab] = useState('live'); // live | submitted

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
   * Load submitted videos
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchSubmittedVideos();
    setLoading(false);
  }, [fetchSubmittedVideos]);

  // Initial load and polling
  useEffect(() => {
    if (activeTab === 'submitted') {
      loadData();

      // Poll for new videos every 30 seconds
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [loadData, activeTab]);

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
   * Watch video
   */
  const handleWatchVideo = useCallback((videoId, videoUrl) => {
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

      await fetchSubmittedVideos();
    } catch (err) {
      console.error('Error flagging video:', err);
      alert(err.message);
    }
  }, [token, fetchSubmittedVideos]);

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          style={styles.tab(activeTab === 'live')}
          onClick={() => setActiveTab('live')}
        >
          <Video size={18} style={{ marginRight: '8px' }} />
          📡 Live Broadcasts
        </button>
        <button
          style={styles.tab(activeTab === 'submitted')}
          onClick={() => setActiveTab('submitted')}
        >
          <Eye size={18} style={{ marginRight: '8px' }} />
          Submitted Videos ({submittedVideos.length})
        </button>
      </div>

      {/* Live Broadcasts Tab */}
      {activeTab === 'live' && (
        <LiveStreamWall
          electionId={electionId}
          selectedLga={selectedLga}
          selectedWard={selectedWard}
        />
      )}

      {/* Submitted Videos Tab */}
      {activeTab === 'submitted' && (
        <div style={styles.submittedVideosContainer}>
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
              Reset Filters
            </button>

            <button
              onClick={loadData}
              style={styles.refreshButton}
              disabled={loading}
            >
              <RefreshCw size={16} style={{ marginRight: '8px' }} />
              Refresh
            </button>
          </div>

          {/* Videos Grid */}
          {filteredSubmittedVideos.length === 0 ? (
            <div style={styles.emptyState}>
              <Video size={48} color="#ccc" />
              <p>No submitted videos</p>
            </div>
          ) : (
            <div style={styles.videosGrid}>
              {filteredSubmittedVideos.map((video) => (
                <SubmittedVideoCard
                  key={video.id}
                  videoId={video.id}
                  pollingUnitName={video.polling_unit_name}
                  pollingUnitId={video.polling_unit_id}
                  lgaName={video.lga_name}
                  wardName={video.ward_name}
                  videoUrl={video.video_url}
                  thumbnailUrl={video.thumbnail_url}
                  status={video.status}
                  submittedAt={video.submitted_at}
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
    padding: '0',
  },

  tabContainer: {
    display: 'flex',
    gap: '0',
    borderBottom: '2px solid #e9ecef',
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },

  tab: (isActive) => ({
    flex: 1,
    padding: '16px 20px',
    backgroundColor: isActive ? '#fff' : '#f8f9fa',
    border: 'none',
    borderBottom: isActive ? '3px solid #007bff' : '3px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
    color: isActive ? '#007bff' : '#6c757d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  }),

  submittedVideosContainer: {
    padding: '20px',
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
    border: '1px solid #f5c6cb',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#721c24',
    marginLeft: 'auto',
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
    minWidth: '200px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },

  filterInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
  },

  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },

  resetButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s',
  },

  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#6c757d',
  },

  videosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
};

export default AdminVideoManagement;
