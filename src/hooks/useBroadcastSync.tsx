import { useEffect, useCallback, useRef } from 'react';

const CHANNEL_NAME = 'educreator_sync';

interface SyncMessage {
  type: 'institution_name' | 'activity_update';
  value: string;
  timestamp: number;
  tabId: string;
}

const TAB_ID = Math.random().toString(36).slice(2);

/**
 * Synchronizes state across browser tabs using BroadcastChannel.
 * Falls back gracefully if BroadcastChannel is not supported.
 */
export function useBroadcastSync(
  key: string,
  currentValue: string,
  onRemoteUpdate: (value: string) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSentRef = useRef<string>('');

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;
      if (msg.tabId === TAB_ID) return; // Ignore own messages
      if (msg.type === key) {
        onRemoteUpdate(msg.value);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [key, onRemoteUpdate]);

  const broadcast = useCallback((value: string) => {
    if (!channelRef.current) return;
    if (value === lastSentRef.current) return;
    lastSentRef.current = value;

    const msg: SyncMessage = {
      type: key as SyncMessage['type'],
      value,
      timestamp: Date.now(),
      tabId: TAB_ID,
    };
    channelRef.current.postMessage(msg);
  }, [key]);

  // Auto-broadcast on value change
  useEffect(() => {
    broadcast(currentValue);
  }, [currentValue, broadcast]);

  return { broadcast };
}
