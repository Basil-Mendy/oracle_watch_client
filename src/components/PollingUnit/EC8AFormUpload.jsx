import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileImage } from 'lucide-react';
import '../../styles/pages/PollingUnitDashboard.css';

const EC8AFormUpload = ({ electionId, pollingUnitId, onSuccess }) => {
    const [ec8aImage, setEc8aImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            setEc8aImage(file);
            setError('');
            setSuccess(false);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            setError('Please select a valid image file');
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!ec8aImage) {
            setError('Please select an EC8A form image');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const password = sessionStorage.getItem('polling_unit_password');
            if (!password) {
                throw new Error('Session expired. Please log in again.');
            }

            const formData = new FormData();
            formData.append('unit_id', pollingUnitId);
            formData.append('password', password);
            formData.append('election_id', electionId);
            formData.append('ec8a_form_image', ec8aImage);

            // Empty vote data for now - admin will enter it in analytics
            formData.append('vote_data', JSON.stringify({}));

            const response = await fetch('/api/results/submit-with-ec8a/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit EC8A form');
            }

            setSuccess(true);
            setEc8aImage(null);
            setPreview(null);

            if (onSuccess) {
                onSuccess();
            }

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to submit EC8A form');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="ec8a-form-upload">
            <form onSubmit={handleSubmit}>
                {/* Upload Area */}
                <div
                    className={`upload-area ${dragActive ? 'active' : ''} ${preview ? 'has-preview' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {preview ? (
                        <div className="preview-container">
                            <img src={preview} alt="EC8A Form Preview" className="preview-image" />
                            <button
                                type="button"
                                className="btn-change"
                                onClick={() => {
                                    setEc8aImage(null);
                                    setPreview(null);
                                }}
                            >
                                Change Image
                            </button>
                        </div>
                    ) : (
                        <label className="upload-label">
                            <FileImage size={48} />
                            <span className="upload-text">Click to select or drag EC8A form image</span>
                            <span className="upload-subtext">PNG, JPG, JPEG (Max 10MB)</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        handleFileSelect(e.target.files[0]);
                                    }
                                }}
                                style={{ display: 'none' }}
                            />
                        </label>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="message-box error">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="message-box success">
                        <CheckCircle size={20} />
                        <span>EC8A form submitted successfully! Your submission is pending review.</span>
                    </div>
                )}

                {/* Submit Button */}
                {!success && (
                    <button
                        type="submit"
                        className="btn btn-primary btn-large"
                        disabled={!ec8aImage || uploading}
                    >
                        {uploading ? (
                            <>
                                <span className="spinner"></span>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Submit EC8A Form
                            </>
                        )}
                    </button>
                )}

                {/* Info Box */}
                <div className="info-box">
                    <h4>What is the EC8A Form?</h4>
                    <p>
                        The EC8A is the official result form from the polling unit. Please take a clear photo
                        of the signed EC8A form showing all vote counts. The admin team will review and verify
                        the results in the Analytics dashboard.
                    </p>
                </div>
            </form>
        </div>
    );
};

export default EC8AFormUpload;
