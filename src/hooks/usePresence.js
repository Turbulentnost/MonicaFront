import { useCallback, useEffect, useRef, useState } from 'react';

function resolveWsUrl() {
  const envUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5612';
  if (typeof window === 'undefined') return envUrl;
  try {
    const url = new URL(envUrl);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = window.location.hostname;
    }
    return url.origin;
  } catch {
    return envUrl;
  }
}

/** Глобальный presence: пользователь online, пока открыт сайт (WS /ws/presence/). */
export function usePresence(enabled) {
  const wsRef = useRef(null);
  const [onlineIds, setOnlineIds] = useState(() => new Set());
  const [ready, setReady] = useState(false);
  const pingRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setOnlineIds(new Set());
      setReady(false);
      return undefined;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    const ws = new WebSocket(`${resolveWsUrl()}/ws/presence/?token=${token}`);
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
      }
    };

    ws.onopen = () => {
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'presence.ping' }));
        }
      }, 30000);
    };

    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  const isOnline = useCallback(
    (userId, fallback = false) => {
      if (!userId) return false;
      if (!ready) return Boolean(fallback);
      return onlineIds.has(String(userId));
    },
    [onlineIds, ready]
  );

  return { onlineIds, isOnline, ready };
}
