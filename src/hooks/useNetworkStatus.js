/**
 * Hook to monitor network status and connection quality
 * Provides real-time feedback on:
 * - Online/offline status
 * - Network speed/quality
 * - Connection type (4g, wifi, etc)
 * - Effective connection type
 * - Bandwidth estimation
 */
import { useState, useEffect, useCallback } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [networkType, setNetworkType] = useState('unknown');
  const [effectiveType, setEffectiveType] = useState('4g');
  const [downlink, setDownlink] = useState(null);
  const [rtt, setRtt] = useState(null);
  const [saveData, setSaveData] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good'); // 'good', 'fair', 'poor'

  const handleOnline = useCallback(() => {
    setIsOnline(true);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  // Monitor Network Information API
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkType(connection.type);
        setEffectiveType(connection.effectiveType);
        setDownlink(connection.downlink);
        setRtt(connection.rtt);
        setSaveData(connection.saveData);

        // Determine connection quality
        let quality = 'good';
        let slow = false;

        if (connection.effectiveType === '2g') {
          quality = 'poor';
          slow = true;
        } else if (connection.effectiveType === '3g') {
          quality = 'fair';
          slow = true;
        } else if (connection.effectiveType === '4g' || connection.effectiveType === '5g') {
          if (connection.rtt && connection.rtt > 500) {
            quality = 'fair';
            slow = true;
          } else if (connection.downlink && connection.downlink < 1) {
            quality = 'fair';
            slow = true;
          } else {
            quality = 'good';
            slow = false;
          }
        }

        setConnectionQuality(quality);
        setIsSlowConnection(slow);
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  // Handle online/offline events
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
    networkType,
    effectiveType,
    downlink,
    rtt,
    saveData,
    isSlowConnection,
    connectionQuality,
    isGoodConnection: isOnline && !isSlowConnection,
  };
};

export default useNetworkStatus;
