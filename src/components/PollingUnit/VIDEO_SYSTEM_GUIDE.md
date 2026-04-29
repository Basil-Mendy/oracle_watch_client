/**
 * VIDEO SYSTEM INTEGRATION GUIDE
 * 
 * This guide explains how to integrate the refactored video system
 * into your Oracle Watch application.
 */

// ============================================================================
// 1. COMPONENT STRUCTURE
// ============================================================================

/*
Frontend Components:
├── hooks/
│   ├── useNetworkStatus.js        - Monitor online/offline status
│   ├── useMediaRecorder.js        - Manage recording with MediaRecorder API
│   ├── useWebRTC.js               - Handle WebRTC peer connections
│   └── useVideoUpload.js           - Manage Cloudinary uploads
│
├── services/
│   └── CloudinaryUploadService.js - Cloudinary API integration
│
├── utils/
│   └── videoUtils.js              - Utilities (formatting, state machine, storage)
│
├── components/
│   ├── PollingUnit/
│   │   └── VideoRecorder.jsx      - Main recording component
│   │
│   └── Admin/ResultsTabs/
│       ├── AdminVideoManagement.jsx - Main admin dashboard
│       ├── LiveStreamCard.jsx       - Live stream grid card
│       └── SubmittedVideoCard.jsx   - Submitted video list item
*/

// ============================================================================
// 2. INTEGRATION STEPS
// ============================================================================

/*
STEP 1: INSTALL DEPENDENCIES
-----
npm install lucide-react

STEP 2: SET UP ENVIRONMENT VARIABLES
-----
Add to your .env file:
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

STEP 3: UPDATE POLLING UNIT DASHBOARD
-----
Replace your existing video submission component with:

import { VideoRecorder } from '../components/PollingUnit/VideoRecorder';

<VideoRecorder
  pollingUnitId={pollingUnitId}
  pollingUnitName={pollingUnitName}
  lgaId={lgaId}
  lgaName={lgaName}
  wardId={wardId}
  wardName={wardName}
  cloudinaryCloudName={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}
  cloudinaryUploadPreset={process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET}
  onUploadSuccess={(data) => {
    console.log('Video uploaded:', data);
    // Refresh polling unit data
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
  }}
/>

STEP 4: UPDATE ADMIN DASHBOARD
-----
Replace your existing LiveVideosTab with:

import { AdminVideoManagement } from '../components/Admin/ResultsTabs/AdminVideoManagement';

<AdminVideoManagement
  electionId={electionId}
  selectedLga={selectedLga}
  selectedWard={selectedWard}
/>
*/

// ============================================================================
// 3. STATE MACHINE FLOW
// ============================================================================

/*
IDLE
  ↓ (User clicks "Go Live")
LIVE (if online)
  or
RECORDING_OFFLINE (if offline)
  ↓ (User clicks "Stop Recording")
ENDED
  ↓ (Recording processed)
READY_TO_SUBMIT
  ↓ (User clicks "Submit to Admin")
UPLOADING
  ↓ (Upload completes or fails)
UPLOADED
  or
ERROR
  ↓ (User clicks "Try Again")
IDLE

Key Features:
- Automatic fallback from LIVE to RECORDING_OFFLINE if network drops
- Auto-upload when network is restored
- State validation prevents invalid transitions
- All states have error handling
*/

// ============================================================================
// 4. CUSTOM HOOKS USAGE
// ============================================================================

/*
A. useNetworkStatus
---
const { isOnline, isOffline } = useNetworkStatus();

// isOnline: boolean - true if connected
// isOffline: boolean - true if disconnected

Use case: Detect network status for conditional rendering


B. useMediaRecorder
---
const {
  isRecording,
  recordingDuration,
  recordedChunks,
  error,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  getVideoBlob,
  reset
} = useMediaRecorder();

// startRecording(stream) - Start recording a MediaStream
// stopRecording() - Stop and finalize recording
// getVideoBlob() - Get final video as Blob
// recordingDuration - Seconds elapsed

Use case: Local video recording on polling unit dashboard


C. useWebRTC
---
const {
  isStreaming,
  connectionState,
  error,
  startStreaming,
  stopStreaming,
  sendAnswer,
  addIceCandidate
} = useWebRTC(signalingServerUrl);

// startStreaming(stream) - Start WebRTC broadcast
// connectionState: idle | connecting | connected | failed | closed
// Uses STUN servers for NAT traversal

Use case: Live streaming from polling units (requires WebRTC server)


D. useVideoUpload
---
const {
  isUploading,
  uploadProgress,
  uploadedUrl,
  error,
  uploadVideo,
  cancelUpload,
  reset
} = useVideoUpload(cloudName, uploadPreset);

// uploadVideo(blob, metadata, onProgress)
// uploadProgress: 0-100 percentage
// uploadedUrl: Final Cloudinary URL

Use case: Upload to Cloudinary from recorder or admin dashboard
*/

// ============================================================================
// 5. UTILITY FUNCTIONS
// ============================================================================

/*
formatDuration(seconds)
  - Input: 125
  - Output: "02:05"
  
formatFileSize(bytes)
  - Input: 10485760
  - Output: "10 MB"

getMediaStream(constraints)
  - Returns: { success, stream } or { success, error }
  - Handles permissions and device access

supportsUserMedia(), supportsMediaRecorder(), supportsWebRTC()
  - Check browser capabilities
  
createVideoThumbnail(blob)
  - Generate thumbnail image from video
  
VIDEO_STATES
  - Constants for state machine:
    IDLE, LIVE, RECORDING_OFFLINE, ENDED, 
    READY_TO_SUBMIT, UPLOADING, UPLOADED, ERROR

isValidTransition(from, to)
  - Validate state changes in reducer
*/

// ============================================================================
// 6. ADMIN DASHBOARD FEATURES
// ============================================================================

/*
AdminVideoManagement Component Features:

A. LIVE STREAMS TAB
  - Grid of all active live streams
  - 16:9 aspect ratio cards
  - Shows: Unit name, LGA, Ward, live indicator
  - Actions: Watch live, End stream
  - Refreshes every 30 seconds
  - Stats: Total active streams

B. SUBMITTED VIDEOS TAB
  - List of all submitted/recorded videos
  - Search by unit name or ID
  - Filter by LGA and Ward
  - Collapsible detailed view
  - Actions: Watch, Download, Approve, Flag
  - Shows: Status (pending/approved/flagged)
  - Stats: Total videos, approved count, pending count

C. BOTH TABS
  - Network status indicator
  - Error handling with alerts
  - Loading states
  - Empty state messages
  - Real-time refresh capability
  - Responsive design
*/

// ============================================================================
// 7. BACKEND API REQUIREMENTS
// ============================================================================

/*
Your Django backend needs these endpoints:

1. LIVE STREAMS
   GET /api/results/admin/live-streams/?election_id={id}
   
   Response:
   {
     "id": "uuid",
     "polling_unit_id": "AB/UMU/PU/0001",
     "polling_unit_name": "Polling Unit A",
     "lga_name": "Umuahia North",
     "ward_name": "Ward 1",
     "stream_url": "webrtc://...",
     "is_live": true,
     "duration": 125,
     "thumbnail": "url",
     "started_at": "2026-04-28T..."
   }

2. SUBMITTED VIDEOS
   GET /api/results/admin/videos/?election_id={id}
   
   Response:
   {
     "id": "uuid",
     "polling_unit_id": "AB/UMU/PU/0001",
     "polling_unit_name": "Polling Unit A",
     "lga_name": "Umuahia North",
     "ward_name": "Ward 1",
     "video_url": "https://cloudinary.com/...",
     "thumbnail": "url",
     "duration": 125,
     "file_size": 10485760,
     "uploaded_at": "2026-04-28T...",
     "status": "pending|approved|flagged",
     "metadata": { ... }
   }

3. VIDEO ACTIONS
   POST /api/results/admin/videos/{id}/approve/
   POST /api/results/admin/videos/{id}/flag/
   
4. STREAM ACTIONS
   POST /api/results/admin/live-streams/{id}/end/
*/

// ============================================================================
// 8. CLOUDINARY SETUP
// ============================================================================

/*
1. Create Cloudinary account at https://cloudinary.com
2. Get your credentials:
   - Cloud Name
   - Upload Preset (create in dashboard)
3. Add to environment:
   REACT_APP_CLOUDINARY_CLOUD_NAME=abc123
   REACT_APP_CLOUDINARY_UPLOAD_PRESET=my_preset
4. Videos are uploaded to: oracle-watch/live-recordings/{polling_unit_id}/

Videos include context metadata:
{
  "polling_unit_name": "Polling Unit A",
  "polling_unit_id": "AB/UMU/PU/0001",
  "lga_name": "Umuahia North",
  "duration": 125,
  "recorded_at": "2026-04-28T...",
  "network_status": "online|offline"
}
*/

// ============================================================================
// 9. OFFLINE SUPPORT
// ============================================================================

/*
When network is unavailable:

1. Recording continues with MediaRecorder only
2. State shows: "Recording Offline ⚠️"
3. Video is stored in browser memory
4. When network returns:
   - Window 'online' event fires
   - Auto-upload to Cloudinary
   - Notification sent to admin

To implement persistent offline storage:
- Use IndexedDB via storeOfflineVideo()
- Retrieve with getOfflineVideos()
- Implement retry mechanism on reconnect
*/

// ============================================================================
// 10. TROUBLESHOOTING
// ============================================================================

/*
ISSUE: "Camera permission denied"
SOLUTION: 
  - Check browser permissions
  - Must use HTTPS in production
  - Not available in insecure contexts

ISSUE: "MediaRecorder not supported"
SOLUTION:
  - Check supportsMediaRecorder()
  - Firefox/Chrome fully support it
  - Safari needs webkit prefix

ISSUE: "WebRTC connection failed"
SOLUTION:
  - Check STUN server connectivity
  - May need TURN server for some networks
  - Fallback to recording-only mode

ISSUE: "Cloudinary upload timeout"
SOLUTION:
  - Check file size < 100MB
  - Check upload preset permissions
  - Implement retry with exponential backoff

ISSUE: "Video not appearing in admin dashboard"
SOLUTION:
  - Check backend API endpoints
  - Verify token authentication
  - Check CORS headers
  - Look for 404/403 responses
*/

// ============================================================================
// 11. PERFORMANCE OPTIMIZATION
// ============================================================================

/*
1. LAZY LOADING
   - Don't autoplay all live streams
   - Load thumbnails, play on click
   - Implemented in LiveStreamCard

2. VIDEO COMPRESSION
   - Use VP9 codec (better compression)
   - Set 2.5 Mbps bitrate
   - Auto-adjust for weak networks

3. CHUNKED UPLOAD
   - Split large videos into chunks
   - Resume on network failure
   - Cloudinary SDK handles this

4. THUMBNAIL GENERATION
   - Server-side preferred
   - Client-side fallback (createVideoThumbnail)
   - Lazy load in lists

5. POLLING vs WEBSOCKET
   - Polls every 30 seconds for videos
   - Can upgrade to WebSocket for real-time
   - Consider server load
*/

// ============================================================================
// 12. SECURITY CONSIDERATIONS
// ============================================================================

/*
1. AUTHENTICATION
   - All API calls require token
   - Token stored in localStorage
   - Sent in Authorization header

2. FILE VALIDATION
   - Check file type (video/*)
   - Enforce size limits (500MB)
   - Validate MIME type on backend

3. CLOUDINARY SECURITY
   - Use upload presets (not full credentials)
   - Set upload preset restrictions
   - Sign URLs for downloads

4. CORS
   - Cloudinary domain must be whitelisted
   - Django CORS headers configured
   - Same-origin policy for API calls

5. DATA VALIDATION
   - Validate polling unit exists
   - Check election is active
   - Verify user has permissions
*/

export default {
  title: 'Video System Integration Guide',
  version: '1.0.0',
  author: 'Oracle Watch Team'
};
