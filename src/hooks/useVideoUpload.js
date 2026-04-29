/**
 * Hook to manage video upload to Cloudinary
 * Handles chunked uploads, progress tracking, and error handling
 */
import { useState, useRef, useCallback } from 'react';

export const useVideoUpload = (cloudinaryCloudName, cloudinaryUploadPreset) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const uploadVideo = useCallback(
    async (videoBlob, metadata = {}) => {
      try {
        setError(null);
        setIsUploading(true);
        setUploadProgress(0);

        if (!videoBlob) {
          throw new Error('No video blob provided');
        }

        const formData = new FormData();
        formData.append('file', videoBlob);
        formData.append('upload_preset', cloudinaryUploadPreset);

        // Add metadata as tags
        const tags = [
          `polling_unit:${metadata.polling_unit_id || 'unknown'}`,
          `lga:${metadata.lga_name || 'unknown'}`,
          `ward:${metadata.ward_name || 'unknown'}`,
          `timestamp:${new Date().toISOString()}`,
        ];
        formData.append('tags', tags.join(','));

        // Add context with metadata
        formData.append(
          'context',
          JSON.stringify({
            polling_unit_name: metadata.polling_unit_name,
            polling_unit_id: metadata.polling_unit_id,
            lga_name: metadata.lga_name,
            ward_name: metadata.ward_name,
            duration: metadata.duration,
            recorded_at: new Date().toISOString(),
          })
        );

        // Create abort controller for this upload
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/video/upload`,
          {
            method: 'POST',
            body: formData,
            signal: abortControllerRef.current.signal,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.lengthComputable) {
                const percentComplete = Math.round(
                  (progressEvent.loaded / progressEvent.total) * 100
                );
                setUploadProgress(percentComplete);
              }
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = await response.json();

        setUploadedUrl(data.secure_url);
        setUploadProgress(100);
        setIsUploading(false);

        return {
          url: data.secure_url,
          publicId: data.public_id,
          duration: data.duration,
          size: data.bytes,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Upload cancelled');
        } else {
          setError(`Upload failed: ${err.message}`);
        }
        setIsUploading(false);
        setUploadProgress(0);
        return null;
      }
    },
    [cloudinaryCloudName, cloudinaryUploadPreset]
  );

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedUrl(null);
    setError(null);
  }, []);

  return {
    isUploading,
    uploadProgress,
    uploadedUrl,
    error,
    uploadVideo,
    cancelUpload,
    reset,
  };
};
