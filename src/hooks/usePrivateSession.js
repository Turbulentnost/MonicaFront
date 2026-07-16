import { useCallback, useEffect, useRef, useState } from 'react';
import { chatsApi } from '../api/client';
import { WS_URL } from '../config';

export function usePrivateSession(sessionId, { onClosed } = {}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [myText, setMyText] = useState('');
  const [peerText, setPeerText] = useState('');
  const myTextRef = useRef('');
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const syncTimer = useRef(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return undefined;

    let cancelled = false;
    let retryTimer = null;

    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token || cancelled) return;

      const ws = new WebSocket(`${WS_URL}/ws/private/${sessionId}/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        retryRef.current = 0;
        // сразу отправим текущий текст после reconnect
        if (myTextRef.current) {
          ws.send(JSON.stringify({ action: 'private.sync', text: myTextRef.current }));
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        wsRef.current = null;
        if (retryRef.current < 8) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
          retryRef.current += 1;
          retryTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // onclose сделает reconnect
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.action === 'private.peer_text') {
          setPeerText(data.text || '');
        }
        if (data.action === 'private.closed') {
          onClosedRef.current?.();
        }
        if (data.action === 'private.ready') {
          setConnected(true);
        }
      };
    };

    setMyText('');
    setPeerText('');
    myTextRef.current = '';
    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (syncTimer.current) clearTimeout(syncTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId]);

  const flushSync = useCallback((value) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'private.sync', text: value }));
    }
  }, []);

  const updateMyText = useCallback((value) => {
    setMyText(value);
    myTextRef.current = value;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    // почти сразу — собеседник видит набор посимвольно
    syncTimer.current = setTimeout(() => flushSync(value), 40);
  }, [flushSync]);

  const closeSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await chatsApi.closePrivate(sessionId);
    } catch {
      // ignore
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'private.close' }));
    }
    onClosedRef.current?.();
  }, [sessionId]);

  return { connected, myText, peerText, updateMyText, closeSession };
}
