/**
 * ImageUploadWidget Component - Upload images (max 3 per election)
 */
import React, { useState, useRef } from 'react';
import { Check, Upload, X } from 'lucide-react';

const ImageUploadWidget = ({ images, onImagesUpdate, maxImages = 3 }) => {
    const fileInputRef = useRef(null);
    const [error, setError] = useState('');

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setError('');

        // Check if adding files would exceed max
        if (images.length + files.length > maxImages) {
            setError(`Maximum ${maxImages} images allowed. You already have ${images.length}.`);
            return;
        }

        // Validate file types
        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                setError(`${file.name} is not an image file`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError(`${file.name} exceeds 5MB limit`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            // Create preview URLs
            const newImages = validFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                preview: URL.createObjectURL(file),
                name: file.name,
                size: (file.size / 1024).toFixed(2) // KB
            }));

            onImagesUpdate([...images, ...newImages]);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = (imageId) => {
        const updatedImages = images.filter(img => img.id !== imageId);
        onImagesUpdate(updatedImages);
    };

    return (
        <div className="image-upload-widget">
            <div className="upload-instructions">
                <p>📸 Upload photos from the polling unit (evidence of voting materials, setup, etc.)</p>
                <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px' }}>
                    <Check size={14} className="inline-icon" /> Max {maxImages} images | <Check size={14} className="inline-icon" /> PNG, JPG, GIF | <Check size={14} className="inline-icon" /> Up to 5MB each
                </p>
            </div>

            {error && (
                <div className="upload-error">
                    <p>{error}</p>
                </div>
            )}

            <div className="upload-area">
                {images.length < maxImages ? (
                    <div
                        className="upload-button-area"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="upload-icon">📸</div>
                        <div className="upload-text">
                            <p>Click to upload images</p>
                            <span>or drag and drop</span>
                        </div>
                    </div>
                ) : (
                    <div className="upload-full">
                        <p>✅ Maximum images uploaded ({maxImages}/{maxImages})</p>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={images.length >= maxImages}
                    style={{ display: 'none' }}
                />
            </div>

            {images.length > 0 && (
                <div className="image-preview-grid">
                    {images.map((image, index) => (
                        <div key={image.id} className="image-preview-card">
                            <div className="image-number">{index + 1}</div>
                            <img src={image.preview} alt={image.name} />
                            <div className="image-info">
                                <div className="image-name" title={image.name}>
                                    {image.name.substring(0, 20)}...
                                </div>
                                <div className="image-size">{image.size} KB</div>
                            </div>
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => handleRemoveImage(image.id)}
                                title="Remove image"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {images.length === 0 && (
                <div className="no-images">
                    <p>No images uploaded yet</p>
                </div>
            )}
        </div>
    );
};

export default ImageUploadWidget;
