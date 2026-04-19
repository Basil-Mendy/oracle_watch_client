/**
 * FloatingVideoPlayer - Picture-in-Picture style video player
 * Can be minimized/maximized and dragged around the screen
 * Persists over page navigation
 */
import React, { useRef, useEffect, useState } from 'react';
import { Minimize2, Maximize2, X } from 'lucide-react';
import { useFloatingVideo } from '../../context/FloatingVideoContext';
import '../../styles/components/FloatingVideoPlayer.css';

const FloatingVideoPlayer = () => {
    const { videoState, stopFloatingVideo, minimizeFloatingVideo, maximizeFloatingVideo } = useFloatingVideo();
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Set video stream
    useEffect(() => {
        if (videoState?.stream && videoRef.current) {
            videoRef.current.srcObject = videoState.stream;
        }
    }, [videoState?.stream]);

    // Handle dragging
    const handleMouseDown = (e) => {
        if (e.target.closest('.floating-video-controls')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    if (!videoState || !videoState.stream) return null;

    const isMinimized = videoState.isMinimized;

    return (
        <div
            ref={containerRef}
            className={`floating-video-player ${isMinimized ? 'minimized' : 'maximized'}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            {/* Header - Draggable */}
            <div
                className="floating-video-header"
                onMouseDown={handleMouseDown}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div className="header-info">
                    <span className="live-badge">● LIVE</span>
                    <span className="polling-unit-id">Polling Unit: {videoState.pollingUnitId}</span>
                </div>
                <div className="floating-video-controls">
                    <button
                        className="control-btn"
                        onClick={() => isMinimized ? maximizeFloatingVideo() : minimizeFloatingVideo()}
                        title={isMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button
                        className="control-btn close-btn"
                        onClick={stopFloatingVideo}
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Video Content */}
            {!isMinimized && (
                <div className="floating-video-content">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="floating-video"
                    />
                </div>
            )}
        </div>
    );
};

export default FloatingVideoPlayer;
