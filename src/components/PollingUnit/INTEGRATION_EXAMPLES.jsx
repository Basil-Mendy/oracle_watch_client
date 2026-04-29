/**
 * Example Integration: Updated PollingUnitDashboard with VideoRecorder
 * 
 * Shows how to integrate the new VideoRecorder component into your
 * existing PollingUnitDashboard component.
 */

import React, { useState, useContext } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useElection } from '../../context/ElectionContext';
import { VideoRecorder } from './VideoRecorder';
import { resultService } from '../../services';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';

/**
 * OPTION 1: MINIMAL INTEGRATION
 * Just replace your existing video submission component
 */
export const PollingUnitDashboard_Option1 = () => {
  const { user } = useAuth();
  const { selectedElection, pollingUnit } = useElection();
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleVideoUploadSuccess = (data) => {
    setUploadMessage('Video submitted successfully! ✅');
    setUploadError('');

    // Optional: Refresh polling unit data or update parent
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const handleVideoUploadError = (error) => {
    setUploadError(error);
    setUploadMessage('');
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Existing polling unit info */}
      <h2>{pollingUnit?.name}</h2>
      <p>{pollingUnit?.ward_name} • {pollingUnit?.lga_name}</p>

      {/* Messages */}
      {uploadMessage && (
        <div style={styles.successMessage}>
          <CheckCircle size={20} />
          {uploadMessage}
        </div>
      )}
      {uploadError && (
        <div style={styles.errorMessage}>
          <AlertCircle size={20} />
          {uploadError}
        </div>
      )}

      {/* NEW: VideoRecorder Component */}
      <VideoRecorder
        pollingUnitId={pollingUnit?.unit_id}
        pollingUnitName={pollingUnit?.name}
        lgaId={pollingUnit?.lga_id}
        lgaName={pollingUnit?.lga_name}
        wardId={pollingUnit?.ward_id}
        wardName={pollingUnit?.ward_name}
        cloudinaryCloudName={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}
        cloudinaryUploadPreset={process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET}
        onUploadSuccess={handleVideoUploadSuccess}
        onUploadError={handleVideoUploadError}
      />

      {/* Existing comment submission (if any) */}
      {/* <CommentSubmission /> */}
    </div>
  );
};

/**
 * OPTION 2: ADVANCED INTEGRATION
 * More control with custom state management and error handling
 */
export const PollingUnitDashboard_Option2 = () => {
  const { user, token } = useAuth();
  const { selectedElection, pollingUnit } = useElection();
  const [videoStats, setVideoStats] = useState({
    submittedCount: 0,
    totalDuration: 0,
    lastUploadTime: null,
  });
  const [isRecording, setIsRecording] = useState(false);

  const handleVideoUploadSuccess = async (data) => {
    // Update backend with video metadata
    try {
      const response = await fetch(
        `/api/results/polling-units/${pollingUnit.id}/videos/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cloudinary_url: data.url,
            metadata: data.metadata,
          }),
        }
      );

      if (response.ok) {
        // Update stats
        setVideoStats((prev) => ({
          submittedCount: prev.submittedCount + 1,
          totalDuration: prev.totalDuration + (data.metadata.duration || 0),
          lastUploadTime: new Date().toISOString(),
        }));

        // Show success notification
        console.log('Video metadata saved to backend');
      }
    } catch (error) {
      console.error('Failed to save video metadata:', error);
    }
  };

  return (
    <div>
      {/* Stats Section */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div>{videoStats.submittedCount}</div>
          <div>Videos Submitted</div>
        </div>
        <div style={styles.statCard}>
          <div>{Math.floor(videoStats.totalDuration / 60)}:
            {(videoStats.totalDuration % 60).toString().padStart(2, '0')}
          </div>
          <div>Total Duration</div>
        </div>
        {videoStats.lastUploadTime && (
          <div style={styles.statCard}>
            <div>✅</div>
            <div>Last: {new Date(videoStats.lastUploadTime).toLocaleTimeString()}</div>
          </div>
        )}
      </div>

      {/* Video Recorder */}
      <VideoRecorder
        pollingUnitId={pollingUnit?.unit_id}
        pollingUnitName={pollingUnit?.name}
        lgaId={pollingUnit?.lga_id}
        lgaName={pollingUnit?.lga_name}
        wardId={pollingUnit?.ward_id}
        wardName={pollingUnit?.ward_name}
        cloudinaryCloudName={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}
        cloudinaryUploadPreset={process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET}
        onUploadSuccess={handleVideoUploadSuccess}
      />
    </div>
  );
};

/**
 * OPTION 3: TABS LAYOUT
 * VideoRecorder as a tab alongside other submissions (comments, images)
 */
export const PollingUnitDashboard_Option3 = () => {
  const { user } = useAuth();
  const { pollingUnit } = useElection();
  const [activeTab, setActiveTab] = useState('video'); // video | comments | images

  return (
    <div>
      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button
          style={styles.tabButton(activeTab === 'video')}
          onClick={() => setActiveTab('video')}
        >
          📹 Live/Record Video
        </button>
        <button
          style={styles.tabButton(activeTab === 'comments')}
          onClick={() => setActiveTab('comments')}
        >
          💬 Add Comments
        </button>
        <button
          style={styles.tabButton(activeTab === 'images')}
          onClick={() => setActiveTab('images')}
        >
          📸 Upload Images
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'video' && (
        <VideoRecorder
          pollingUnitId={pollingUnit?.unit_id}
          pollingUnitName={pollingUnit?.name}
          lgaId={pollingUnit?.lga_id}
          lgaName={pollingUnit?.lga_name}
          wardId={pollingUnit?.ward_id}
          wardName={pollingUnit?.ward_name}
          cloudinaryCloudName={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}
          cloudinaryUploadPreset={process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET}
        />
      )}

      {activeTab === 'comments' && (
        <div>
          {/* Your existing comment submission component */}
          <p>Comment submission component here</p>
        </div>
      )}

      {activeTab === 'images' && (
        <div>
          {/* Your existing image upload component */}
          <p>Image upload component here</p>
        </div>
      )}
    </div>
  );
};

/**
 * Styling
 */
const styles = {
  successMessage: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '6px',
    marginBottom: '16px',
    alignItems: 'center',
  },

  errorMessage: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '6px',
    marginBottom: '16px',
    alignItems: 'center',
  },

  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },

  statCard: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    textAlign: 'center',
    borderLeft: '4px solid #007bff',
  },

  tabNav: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    borderBottom: '2px solid #e9ecef',
  },

  tabButton: (isActive) => ({
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #007bff' : '3px solid transparent',
    color: isActive ? '#007bff' : '#6c757d',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  }),
};

/**
 * MIGRATION CHECKLIST
 * 
 * ✅ Backup existing video submission component
 * ✅ Set CLOUDINARY_CLOUD_NAME and UPLOAD_PRESET in .env
 * ✅ Install lucide-react if not already installed
 * ✅ Import VideoRecorder component
 * ✅ Update PollingUnitDashboard with VideoRecorder
 * ✅ Test recording locally
 * ✅ Test offline fallback (disable network in DevTools)
 * ✅ Test upload to Cloudinary
 * ✅ Update admin dashboard with AdminVideoManagement
 * ✅ Test admin features (approve, flag, download)
 * ✅ Update Django backend API endpoints (if needed)
 * ✅ Set up WebRTC signaling server (if implementing live streaming)
 */

export default {
  Option1: PollingUnitDashboard_Option1,
  Option2: PollingUnitDashboard_Option2,
  Option3: PollingUnitDashboard_Option3,
};
