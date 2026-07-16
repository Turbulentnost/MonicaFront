import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../api/client';
import { WS_URL } from '../config';

/** Presence + realtime in-app notifications on the same WS. */
export function usePresence(enabled, { onNotification, onChatPreview } = {}) {
  const wsRef = useRef(null);
  const [onlineIds, setOnlineIds] = useState(() => new Set());
  const [lastSeenByUser, setLastSeenByUser] = useState(() => ({}));
  const [ready, setReady] = useState(false);
  const pingRef = useRef(null);
  const retryRef = useRef(0);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;
  const onChatPreviewRef = useRef(onChatPreview);
  onChatPreviewRef.current = onChatPreview;

  useEffect(() => {
    if (!enabled) {
      setOnlineIds(new Set());
      setReady(false);
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;

    const clearPing = () => {
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
    };

    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token || cancelled) return;

      const ws = new WebSocket(`${WS_URL}/ws/presence/?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.action === 'presence.snapshot') {
          setOnlineIds(new Set((data.online_user_ids || []).map(String)));
          setReady(true);
        }
        if (data.action === 'presence.update') {
          const uid = String(data.user_id);
          setOnlineIds((prev) => {
            const next = new Set(prev);
            if (data.is_online) next.add(uid);
            else next.delete(uid);
            return next;
          });
          if (!data.is_online && data.last_seen_at) {
            setLastSeenByUser((prev) => ({ ...prev, [uid]: data.last_seen_at }));
          }
        }
        if (data.action === 'notification.new' && onNotificationRef.current) {
          onNotificationRef.current(data.notification);
        }

        if (data.action === 'chat.preview' && data.message && onChatPreviewRef.current) {
          onChatPreviewRef.current(data.message);
        }
      };

      ws.onopen = () => {
        if (cancelled) return;
        retryRef.current = 0;
        const ping = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'presence.ping' }));
          }
        };
        ping();
        clearPing();
        pingRef.current = setInterval(ping, 20000);
      };

      ws.onclose = () => {
        clearPing();
        wsRef.current = null;
        setReady(false);
        if (cancelled) return;
        if (retryRef.current < 12) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
          retryRef.current += 1;
          retryTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // onclose сделает reconnect
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearPing();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  const isOnline = useCallback(
    (userId, fallback = false) => {
      if (!userId) return false;
      // До snapshot не показываем «зелёный» из устаревшего API — только realtime
      if (!ready) return false;
      return onlineIds.has(String(userId));
    },
    [onlineIds, ready]
  );

  const getLastSeen = useCallback(
    (userId, fallback = null) => {
      if (!userId) return fallback;
      const uid = String(userId);
      return lastSeenByUser[uid] || fallback || null;
    },
    [lastSeenByUser]
  );

  return { onlineIds, isOnline, getLastSeen, ready };
}

export function useNotifications(enabled) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data } = await notificationsApi.list();
      setItems(data);
    } catch {
      // ignore
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const pushNotification = useCallback((notification) => {
    setItems((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      return [notification, ...prev].slice(0, 50);
    });
  }, []);

  const updateNotification = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, payload: { ...n.payload, ...patch.payload } } : n))
    );
  }, []);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const clearAll = async () => {
    try {
      await notificationsApi.clear();
      setItems([]);
    } catch {
      // ignore
    }
  };

  const resolveInvitesBySession = useCallback((sessionId, resolved) => {
    if (!sessionId) return;
    const sid = String(sessionId);
    setItems((prev) =>
      prev.map((n) => {
        if (n.notification_type !== 'private_invite') return n;
        if (String(n.payload?.session_id) !== sid) return n;
        if (n.payload?.resolved) return n;
        return {
          ...n,
          is_read: true,
          payload: { ...n.payload, resolved },
        };
      })
    );
  }, []);

  return {
    items,
    open,
    setOpen,
    unreadCount,
    pushNotification,
    updateNotification,
    resolveInvitesBySession,
    markRead,
    markAllRead,
    clearAll,
    reload: load,
  };
}
