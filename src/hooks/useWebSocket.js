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

export function useWebSocket(chatId, { onMessage, onTyping, onDeleted } = {}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onDeletedRef = useRef(onDeleted);
  onMessageRef.current = onMessage;
  onTypingRef.current = onTyping;
  onDeletedRef.current = onDeleted;

  useEffect(() => {
    if (!chatId) return undefined;

    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    let cancelled = false;
    let retryTimer = null;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(`${resolveWsUrl()}/ws/chat/${chatId}/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        attempt = 0;
      };
      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        wsRef.current = null;
        if (attempt < 6) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          attempt += 1;
          retryTimer = setTimeout(connect, delay);
        }
      };
      ws.onerror = () => {};
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.action === 'message.new' && onMessageRef.current) {
          onMessageRef.current(data.message);
        }
        if (data.action === 'typing.update' && onTypingRef.current) {
          onTypingRef.current(data);
        }
        if (data.action === 'message.deleted' && onDeletedRef.current) {
          onDeletedRef.current(data.message_id);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [chatId]);

  const sendMessage = useCallback((content, messageType = 'text', metadata = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'message.send',
          message_type: messageType,
          content,
          file_name: metadata.file_name || '',
          mime_type: metadata.mime_type || '',
          file_size: metadata.file_size ?? null,
        })
      );
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ action: isTyping ? 'typing.start' : 'typing.stop' })
      );
    }
  }, []);

  return { connected, sendMessage, sendTyping };
}
