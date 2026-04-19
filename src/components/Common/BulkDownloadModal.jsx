import React, { useState } from 'react';
import { X, Download, Loader, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { resultService } from '../../services';
import '../../styles/components/BulkDownloadModal.css';

const BulkDownloadModal = ({
    isOpen,
    onClose,
    election,
    pollingUnitId,
    counts = { images: 0, videos: 0 }
}) => {
    const [downloadType, setDownloadType] = useState('both'); // 'images', 'videos', 'both'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const handleBulkDownload = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        setProgress(0);

        try {
            const password = sessionStorage.getItem('polling_unit_password');

            // Prepare request data
            const requestData = {
                unit_id: pollingUnitId,
                election_id: election,
            };

            if (password) {
                requestData.password = password;
            }

            // Download images
            if (downloadType === 'images' || downloadType === 'both') {
                setProgress(33);
                const imagesResponse = await resultService.bulkDownloadImages(requestData);

                const blob = new Blob([imagesResponse.data], { type: 'application/zip' });
                downloadZip(blob, `${election}_images.zip`);
            }

            // Download videos
            if (downloadType === 'videos' || downloadType === 'both') {
                setProgress(66);
                const videosResponse = await resultService.bulkDownloadVideos(requestData);

                const blob = new Blob([videosResponse.data], { type: 'application/zip' });
                downloadZip(blob, `${election}_videos.zip`);
            }

            setProgress(100);
            setSuccess(true);

            // Close after 2 seconds
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);

        } catch (err) {
            console.error('Bulk download error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to download files');
        } finally {
            setLoading(false);
        }
    };

    const downloadZip = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const getDownloadSummary = () => {
        const items = [];
        if (downloadType === 'images' || downloadType === 'both') {
            items.push(`${counts.images} image${counts.images !== 1 ? 's' : ''}`);
        }
        if (downloadType === 'videos' || downloadType === 'both') {
            items.push(`${counts.videos} video${counts.videos !== 1 ? 's' : ''}`);
        }
        return items.join(' + ');
    };

    return (
        <div className="bulk-download-modal-overlay">
            <div className="bulk-download-modal">
                {/* Header */}
                <div className="modal-header">
                    <div className="header-content">
                        <Package size={24} />
                        <h2>Download Evidence</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    <p className="modal-subtitle">
                        Select what you want to download from this election
                    </p>

                    {/* Download type options */}
                    <div className="download-options">
                        <label className={`option ${downloadType === 'images' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="downloadType"
                                value="images"
                                checked={downloadType === 'images'}
                                onChange={(e) => setDownloadType(e.target.value)}
                                disabled={counts.images === 0}
                            />
                            <div className="option-content">
                                <span className="option-title">📷 Photos Only</span>
                                <span className="option-count">
                                    {counts.images > 0 ? `${counts.images} image${counts.images !== 1 ? 's' : ''}` : 'No photos'}
                                </span>
                            </div>
                        </label>

                        <label className={`option ${downloadType === 'videos' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="downloadType"
                                value="videos"
                                checked={downloadType === 'videos'}
                                onChange={(e) => setDownloadType(e.target.value)}
                                disabled={counts.videos === 0}
                            />
                            <div className="option-content">
                                <span className="option-title">🎥 Videos Only</span>
                                <span className="option-count">
                                    {counts.videos > 0 ? `${counts.videos} video${counts.videos !== 1 ? 's' : ''}` : 'No videos'}
                                </span>
                            </div>
                        </label>

                        <label className={`option ${downloadType === 'both' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="downloadType"
                                value="both"
                                checked={downloadType === 'both'}
                                onChange={(e) => setDownloadType(e.target.value)}
                                disabled={counts.images === 0 && counts.videos === 0}
                            />
                            <div className="option-content">
                                <span className="option-title">📦 Both Photos & Videos</span>
                                <span className="option-count">
                                    {counts.images + counts.videos > 0
                                        ? `${counts.images + counts.videos} total items`
                                        : 'No items'}
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="error-box">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Progress bar */}
                    {loading && (
                        <div className="progress-container">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <span className="progress-text">{progress}% Complete</span>
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="success-box">
                            <CheckCircle size={18} />
                            <span>Download started! Check your downloads folder.</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleBulkDownload}
                        disabled={loading || counts.images === 0 && counts.videos === 0}
                    >
                        {loading ? (
                            <>
                                <Loader size={16} className="spinning" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Download {getDownloadSummary()}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadModal;
