import React, { createContext, useContext, useState } from 'react';

const FloatingVideoContext = createContext();

export const useFloatingVideo = () => {
    const context = useContext(FloatingVideoContext);
    if (!context) {
        throw new Error('useFloatingVideo must be used within FloatingVideoProvider');
    }
    return context;
};

export const FloatingVideoProvider = ({ children }) => {
    const [videoState, setVideoState] = useState(null);

    const startFloatingVideo = (videoStream, electionId, pollingUnitId) => {
        setVideoState({
            stream: videoStream,
            electionId,
            pollingUnitId,
            isMinimized: false,
            streamTime: 0,
            isStreaming: true,
        });
    };

    const stopFloatingVideo = () => {
        if (videoState?.stream) {
            videoState.stream.getTracks().forEach(track => track.stop());
        }
        setVideoState(null);
    };

    const minimizeFloatingVideo = () => {
        setVideoState(prev => prev ? { ...prev, isMinimized: true } : null);
    };

    const maximizeFloatingVideo = () => {
        setVideoState(prev => prev ? { ...prev, isMinimized: false } : null);
    };

    const updateStreamTime = (time) => {
        setVideoState(prev => prev ? { ...prev, streamTime: time } : null);
    };

    const value = {
        videoState,
        startFloatingVideo,
        stopFloatingVideo,
        minimizeFloatingVideo,
        maximizeFloatingVideo,
        updateStreamTime,
        isVideoActive: !!videoState?.stream,
    };

    return (
        <FloatingVideoContext.Provider value={value}>
            {children}
        </FloatingVideoContext.Provider>
    );
};
