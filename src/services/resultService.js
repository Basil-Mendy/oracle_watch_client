/**
 * Result Services - APIs for submitting and retrieving election results
 */

import api from './api';

export const resultService = {
    // Polling Unit Result Submission
    submitResults: (unitId, password, electionId, results) =>
        api.post('/results/submit/', {
            unit_id: unitId,
            password,
            election_id: electionId,
            results, // Array of {party_id, vote_count}
        }),

    // Submit results with EC8A form image (approval workflow)
    submitWithEC8A: (unitId, password, electionId, voteData, ec8aImage) => {
        const formData = new FormData();
        formData.append('unit_id', unitId);
        formData.append('password', password);
        formData.append('election_id', electionId);
        formData.append('vote_data', JSON.stringify(voteData)); // {party_id: vote_count}
        if (ec8aImage) {
            formData.append('ec8a_form_image', ec8aImage);
        }

        return api.post('/results/submit-with-ec8a/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadMedia: (unitId, password, electionId, file, fileType) => {
        const formData = new FormData();
        formData.append('unit_id', unitId);
        formData.append('password', password);
        formData.append('election_id', electionId);
        formData.append('file', file);
        formData.append('file_type', fileType); // 'image' or 'video'

        return api.post('/results/upload-media/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    addComment: (unitId, password, electionId, commentText) =>
        api.post('/results/add-comment/', {
            unit_id: unitId,
            password,
            election_id: electionId,
            comment_text: commentText,
        }),

    // Get submission status for polling unit
    getSubmissionStatus: (unitId, password, electionId) =>
        api.post('/results/submission-status/', {
            unit_id: unitId,
            password,
            election_id: electionId,
        }),

    // Download individual image
    downloadImage: (imageId) =>
        api.get(`/results/download-image/${imageId}/`, {
            responseType: 'blob'
        }),

    // Download individual video
    downloadVideo: (videoId) =>
        api.get(`/results/download-video/${videoId}/`, {
            responseType: 'blob'
        }),

    // Bulk download all images from election
    bulkDownloadImages: (requestData) =>
        api.post('/results/bulk-download-images/', requestData, {
            responseType: 'blob'
        }),

    // Bulk download all videos from election
    bulkDownloadVideos: (requestData) =>
        api.post('/results/bulk-download-videos/', requestData, {
            responseType: 'blob'
        }),

    // Live Stream Session Management
    startLiveStream: (unitId, password, electionId) =>
        api.post('/results/start-live-stream/', {
            unit_id: unitId,
            password,
            election_id: electionId,
        }),

    endLiveStream: (unitId, password, streamId, durationSeconds) =>
        api.post('/results/end-live-stream/', {
            unit_id: unitId,
            password,
            stream_id: streamId,
            duration_seconds: durationSeconds,
        }),

    // Save video metadata after direct Cloudinary upload
    saveVideoMetadata: (unitId, password, electionId, cloudinaryUrl, duration, metadata = {}, segmentId = null, isLiveStream = false) =>
        api.post('/results/save-video-metadata/', {
            unit_id: unitId,
            password,
            election_id: electionId,
            cloudinary_url: cloudinaryUrl,
            duration,
            metadata,
            segment_id: segmentId,
            is_live_stream: isLiveStream,
        }),

    // Public Result Retrieval
    getPollingUnitResults: (unitId, electionId) =>
        api.get(`/results/polling-unit/${unitId}/${electionId}/`),

    getAggregateResults: (electionId, level = 'lga', lgaId = null, wardId = null) => {
        const params = {
            election_id: electionId,
            level,
        };
        if (lgaId) params.lga_id = lgaId;
        if (wardId) params.ward_id = wardId;
        return api.get('/results/aggregate/', { params });
    },
};

export default resultService;
