/**
 * Cloudinary video upload service
 * Handles video uploads with error handling and retry logic
 */

export class CloudinaryUploadService {
  constructor(cloudName, uploadPreset) {
    this.cloudName = cloudName;
    this.uploadPreset = uploadPreset;
    this.uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
    this.pendingUploads = new Map(); // Track pending uploads
  }

  /**
   * Upload video blob to Cloudinary
   * @param {Blob} videoBlob - Video file blob
   * @param {Object} metadata - Video metadata
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  async uploadVideo(videoBlob, metadata = {}, onProgress = null) {
    const uploadId = this.generateUploadId(metadata);

    try {
      const formData = new FormData();
      formData.append('file', videoBlob);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', this.buildFolder(metadata));
      formData.append('resource_type', 'video');

      // Add tags for organization
      const tags = this.buildTags(metadata);
      formData.append('tags', tags);

      // Add context with polling unit metadata
      const context = this.buildContext(metadata);
      formData.append('context', JSON.stringify(context));

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.pendingUploads.set(uploadId, abortController);

      const response = await fetch(this.uploadUrl, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      this.pendingUploads.delete(uploadId);

      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
        duration: data.duration,
        size: data.bytes,
        metadata: context,
      };
    } catch (error) {
      this.pendingUploads.delete(uploadId);

      if (error.name === 'AbortError') {
        return { success: false, error: 'Upload cancelled' };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Build folder path for organizing videos
   */
  buildFolder(metadata) {
    const pollingUnitId = metadata.polling_unit_id || 'unknown';
    return `oracle-watch/live-recordings/${pollingUnitId}`;
  }

  /**
   * Build tags for video organization
   */
  buildTags(metadata) {
    const tags = [
      `polling_unit:${metadata.polling_unit_id || 'unknown'}`,
      `lga:${metadata.lga_name || 'unknown'}`,
      `ward:${metadata.ward_name || 'unknown'}`,
      `status:pending`,
      `recorded_at:${new Date().toISOString()}`,
    ];
    return tags.join(',');
  }

  /**
   * Build context metadata for video
   */
  buildContext(metadata) {
    return {
      polling_unit_name: metadata.polling_unit_name,
      polling_unit_id: metadata.polling_unit_id,
      lga_name: metadata.lga_name,
      lga_id: metadata.lga_id,
      ward_name: metadata.ward_name,
      ward_id: metadata.ward_id,
      duration: metadata.duration,
      recorded_at: new Date().toISOString(),
      recorded_by: metadata.recorded_by || 'polling_unit',
      network_status: metadata.network_status || 'unknown',
    };
  }

  /**
   * Generate unique upload ID for tracking
   */
  generateUploadId(metadata) {
    return `${metadata.polling_unit_id}_${Date.now()}`;
  }

  /**
   * Cancel specific upload
   */
  cancelUpload(uploadId) {
    const abortController = this.pendingUploads.get(uploadId);
    if (abortController) {
      abortController.abort();
      this.pendingUploads.delete(uploadId);
    }
  }

  /**
   * Cancel all pending uploads
   */
  cancelAllUploads() {
    this.pendingUploads.forEach((controller) => {
      controller.abort();
    });
    this.pendingUploads.clear();
  }

  /**
   * Get list of pending uploads
   */
  getPendingUploads() {
    return Array.from(this.pendingUploads.keys());
  }
}

export default CloudinaryUploadService;
