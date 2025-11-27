import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const AnalyticsAPI = {
  syncProgress: async (payload) => {
    await api.post('/analytics/sync', payload);
  },
  sendBeacon: (payload) => {
    const token = localStorage.getItem('token');
    const body = JSON.stringify({ ...payload, token });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE_URL}/analytics/beacon`, blob);
    } else {
      fetch(`${API_BASE_URL}/analytics/beacon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body
      }).catch(() => {});
    }
  }
};

export const useMediaTracker = ({
  resourceId,
  resourceType,
  batchTime = 10000,
  idleTimeout = 60000
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const unsavedSeconds = useRef(0);
  const intervalRef = useRef(null);
  const idleTimerRef = useRef(null);

  const syncToBackend = useCallback(
    (isClosing = false) => {
      if (!resourceId || !resourceType) return;
      if (unsavedSeconds.current <= 0) return;

      const payload = {
        resourceId,
        resourceType,
        seconds: unsavedSeconds.current,
        timestamp: new Date().toISOString()
      };

      if (isClosing) {
        AnalyticsAPI.sendBeacon(payload);
      } else {
        AnalyticsAPI.syncProgress(payload).catch(() => {});
      }

      unsavedSeconds.current = 0;
    },
    [resourceId, resourceType]
  );

  useEffect(() => {
    unsavedSeconds.current = 0;
    setIsTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [resourceId, resourceType]);

  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => {
        unsavedSeconds.current += 1;
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncToBackend(false);
    }, batchTime);

    return () => {
      clearInterval(syncInterval);
      syncToBackend(true);
    };
  }, [batchTime, syncToBackend]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTracking(false);
        syncToBackend(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncToBackend]);

  const startTracking = useCallback(() => {
    if (!resourceId) return;
    setIsTracking(true);
  }, [resourceId]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const reportActivity = useCallback(() => {
    if (!isTracking) setIsTracking(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setIsTracking(false);
      syncToBackend(false);
    }, idleTimeout);
  }, [idleTimeout, isTracking, syncToBackend]);

  return {
    startTracking,
    stopTracking,
    reportActivity,
    isTracking
  };
};

