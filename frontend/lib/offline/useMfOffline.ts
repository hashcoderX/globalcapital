'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPendingMfCollectionCount, syncPendingMfCollections, type MfOfflineHeaders } from '@/lib/offline/mfOfflineSync';

export function useMfOffline(token: string, headers: MfOfflineHeaders, onSyncComplete?: () => void) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState('');
  const onSyncCompleteRef = useRef(onSyncComplete);
  const syncingRef = useRef(false);

  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
  }, [onSyncComplete]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingMfCollectionCount();
      setPendingCount(count);
      return count;
    } catch {
      setPendingCount(0);
      return 0;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!token || syncingRef.current) return { synced: 0, failed: 0 };

    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingMfCollections(token, headers);
      await refreshPendingCount();

      if (result.synced > 0) {
        setLastSyncMessage(`Synced ${result.synced} offline collection${result.synced === 1 ? '' : 's'}.`);
        onSyncCompleteRef.current?.();
      } else if (result.failed > 0) {
        setLastSyncMessage(result.errors[0] || 'Some collections failed to sync.');
      } else {
        setLastSyncMessage('');
      }

      return result;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [token, headers, refreshPendingCount]);

  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    void refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      if (token) {
        void syncNowRef.current();
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, refreshPendingCount]);

  useEffect(() => {
    if (!token) return;
    void refreshPendingCount().then((count) => {
      if (count > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
        void syncNowRef.current();
      }
    });
  }, [token, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncMessage,
    syncNow,
    refreshPendingCount,
  };
}
