/**
 * VideoUploadManager
 * Manages direct uploads to Cloudinary with:
 * - Chunked upload for reliability
 * - Progress tracking
 * - Auto-retry on failure
 * - Pending queue management
 * - Auto-upload on network restoration
 */

class VideoUploadManager {
    constructor(options = {}) {
        this.cloudinaryUploadUrl = options.cloudinaryUploadUrl ||
            'https://api.cloudinary.com/v1_1/{cloud_name}/video/upload';
        this.cloudName = options.cloudName;
        this.uploadPreset = options.uploadPreset;
        this.pollingUnitId = options.pollingUnitId;
        this.maxRetries = options.maxRetries || 3;
        this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB chunks
        this.timeout = options.timeout || 30000; // 30 second timeout per chunk

        this.pendingQueue = [];
        this.uploadingMap = new Map(); // Track ongoing uploads by segmentId
        this.uploadProgress = new Map(); // Track progress by segmentId
        this.completedUploads = new Map(); // Track completed uploads
        this.failedUploads = new Map(); // Track failed uploads with retry count

        this.onProgress = options.onProgress || (() => { });
        this.onComplete = options.onComplete || (() => { });
        this.onError = options.onError || (() => { });
        this.onQueueChange = options.onQueueChange || (() => { });

        this.isOnline = navigator.onLine;
        this.setupNetworkListener();
    }

    setupNetworkListener() {
        window.addEventListener('online', () => this.handleNetworkRestoration());
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Handle network restoration - auto-upload pending segments
     */
    async handleNetworkRestoration() {
        this.isOnline = true;
        console.log('🌐 Network restored - auto-uploading pending segments');

        const pendingSegments = [...this.pendingQueue];
        for (const segment of pendingSegments) {
            await this.uploadSegment(segment);
        }
    }

    /**
     * Add segment to upload queue
     */
    queueSegment(segment, metadata = {}) {
        const uploadItem = {
            id: segment.id,
            segment,
            metadata: {
                polling_unit_id: this.pollingUnitId,
                timestamp: segment.timestamp,
                duration: segment.duration,
                size: segment.metadata.size,
                ...metadata,
            },
            retryCount: 0,
            status: 'pending', // pending, uploading, completed, failed
            progress: 0,
            error: null,
            cloudinaryUrl: null,
        };

        // Add to queue if not already uploaded
        if (!this.completedUploads.has(segment.id)) {
            this.pendingQueue.push(uploadItem);
            this.uploadProgress.set(segment.id, 0);
            this.onQueueChange(this.getQueueStatus());
            console.log(`📝 Segment queued: ${segment.id}`);
        }

        return uploadItem;
    }

    /**
     * Upload a single segment with chunked upload
     */
    async uploadSegment(uploadItem) {
        if (this.uploadingMap.has(uploadItem.id)) {
            console.warn(`⚠️ Segment already uploading: ${uploadItem.id}`);
            return;
        }

        try {
            uploadItem.status = 'uploading';
            this.uploadingMap.set(uploadItem.id, true);
            this.onQueueChange(this.getQueueStatus());

            const { segment, metadata } = uploadItem;
            const file = segment.file;
            const chunks = Math.ceil(file.size / this.chunkSize);

            console.log(`📤 Uploading segment: ${segment.id} (${chunks} chunks)`);

            // Upload with chunked approach
            const cloudinaryUrl = await this.uploadChunked(
                file,
                metadata,
                uploadItem.id,
                chunks
            );

            // Mark as completed
            uploadItem.status = 'completed';
            uploadItem.cloudinaryUrl = cloudinaryUrl;
            this.completedUploads.set(segment.id, uploadItem);
            this.pendingQueue = this.pendingQueue.filter(item => item.id !== uploadItem.id);

            this.onComplete(uploadItem);
            this.onQueueChange(this.getQueueStatus());
            console.log(`✅ Segment uploaded: ${segment.id}`);

            return cloudinaryUrl;
        } catch (error) {
            uploadItem.error = error.message;
            uploadItem.retryCount++;

            if (uploadItem.retryCount >= this.maxRetries) {
                uploadItem.status = 'failed';
                this.failedUploads.set(uploadItem.id, uploadItem);
                console.error(`❌ Upload failed permanently: ${uploadItem.id}`, error);
                this.onError(uploadItem);
            } else {
                // Retry after delay (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, uploadItem.retryCount - 1), 10000);
                console.warn(`⚠️ Upload failed, retrying in ${delay}ms: ${uploadItem.id}`);

                uploadItem.status = 'pending';
                setTimeout(() => this.uploadSegment(uploadItem), delay);
            }

            this.onQueueChange(this.getQueueStatus());
        } finally {
            this.uploadingMap.delete(uploadItem.id);
        }
    }

    /**
     * Upload file in chunks using FormData
     */
    async uploadChunked(file, metadata, segmentId, totalChunks) {
        const chunkPromises = [];
        let chunkIndex = 0;

        for (let start = 0; start < file.size; start += this.chunkSize) {
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);
            chunkIndex++;

            const chunkPromise = this.uploadChunk(
                chunk,
                metadata,
                chunkIndex,
                totalChunks,
                segmentId
            ).then(response => {
                // Update progress
                const progress = Math.round((chunkIndex / totalChunks) * 100);
                this.uploadProgress.set(segmentId, progress);
                this.onProgress({
                    segmentId,
                    progress,
                    chunk: chunkIndex,
                    totalChunks,
                });
                return response;
            });

            chunkPromises.push(chunkPromise);

            // Limit concurrent chunk uploads to 3
            if (chunkPromises.length >= 3) {
                await Promise.race(chunkPromises);
            }
        }

        // Wait for all chunks
        const responses = await Promise.all(chunkPromises);

        // Return the final successful response (which should contain the video URL)
        const successResponse = responses[responses.length - 1];
        return successResponse.secure_url || successResponse.url;
    }

    /**
     * Upload a single chunk to Cloudinary
     */
    async uploadChunk(chunk, metadata, chunkIndex, totalChunks, segmentId) {
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('upload_preset', this.uploadPreset);
        formData.append('folder', `oracle-watch/${metadata.polling_unit_id}`);
        formData.append('context', JSON.stringify({
            polling_unit: metadata.polling_unit_id,
            timestamp: metadata.timestamp,
            duration: metadata.duration,
            segment_id: segmentId,
        }));

        // For chunked uploads, add resource_type and other context
        formData.append('resource_type', 'video');
        formData.append('eager', 'c_fill,w_640,h_480,q_auto');
        formData.append('eager_async', 'true');

        const uploadUrl = this.cloudinaryUploadUrl.replace('{cloud_name}', this.cloudName);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Upload failed: ${response.status} - ${error}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`Upload timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Get current queue status
     */
    getQueueStatus() {
        return {
            pending: this.pendingQueue.length,
            uploading: this.uploadingMap.size,
            completed: this.completedUploads.size,
            failed: this.failedUploads.size,
            queue: this.pendingQueue.map(item => ({
                id: item.id,
                status: item.status,
                progress: this.uploadProgress.get(item.id) || 0,
                error: item.error,
            })),
            progress: this.uploadProgress,
        };
    }

    /**
     * Retry a failed upload
     */
    async retryFailed(segmentId) {
        const failed = this.failedUploads.get(segmentId);
        if (!failed) return;

        failed.retryCount = 0; // Reset retry count
        failed.status = 'pending';
        failed.error = null;
        this.failedUploads.delete(segmentId);
        this.pendingQueue.push(failed);
        this.onQueueChange(this.getQueueStatus());

        return this.uploadSegment(failed);
    }

    /**
     * Start uploading all pending segments
     */
    async uploadAll() {
        if (!this.isOnline) {
            console.warn('⚠️ Not online - queuing uploads for when connection is restored');
            return;
        }

        const segments = [...this.pendingQueue];
        console.log(`📤 Starting upload of ${segments.length} segments`);

        for (const segment of segments) {
            if (this.isOnline) {
                await this.uploadSegment(segment);
            }
        }
    }

    /**
     * Get completed upload info
     */
    getCompletedUpload(segmentId) {
        return this.completedUploads.get(segmentId);
    }

    /**
     * Get all completed uploads
     */
    getAllCompleted() {
        return Array.from(this.completedUploads.values());
    }

    /**
     * Clear completed uploads
     */
    clearCompleted() {
        this.completedUploads.clear();
    }
}

export default VideoUploadManager;
