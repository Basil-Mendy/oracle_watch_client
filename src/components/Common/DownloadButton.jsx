import React, { useState } from 'react';
import { Download, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import '../../styles/components/DownloadButton.css';

const DownloadButton = ({
    item, // { id, type: 'image' | 'video', filename }
    compact = false,
    onDownload = null
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Build download URL
            const endpoint = item.type === 'image'
                ? `/results/download-image/${item.id}/`
                : `/results/download-video/${item.id}/`;

            // Fetch the file
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${endpoint}`);

            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            // Get the filename from response headers or use default
            const contentDisposition = response.headers.get('content-disposition');
            let filename = item.filename || `${item.type}_${item.id}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSuccess(true);
            if (onDownload) onDownload(item);

            // Reset success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Download error:', err);
            setError(err.message || 'Failed to download file');
        } finally {
            setLoading(false);
        }
    };

    if (compact) {
        return (
            <button
                className="download-button compact"
                onClick={handleDownload}
                disabled={loading}
                title={`Download ${item.type}`}
            >
                {loading ? <Loader size={16} className="spinning" /> : <Download size={16} />}
            </button>
        );
    }

    return (
        <div className="download-button-container">
            <button
                className="download-button"
                onClick={handleDownload}
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader size={18} className="spinning" />
                        Downloading...
                    </>
                ) : success ? (
                    <>
                        <CheckCircle size={18} />
                        Downloaded!
                    </>
                ) : error ? (
                    <>
                        <AlertCircle size={18} />
                        Retry
                    </>
                ) : (
                    <>
                        <Download size={18} />
                        Download
                    </>
                )}
            </button>

            {error && <span className="download-error">{error}</span>}
        </div>
    );
};

export default DownloadButton;
