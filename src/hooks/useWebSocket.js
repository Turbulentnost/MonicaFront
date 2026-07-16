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

export function useWebSocket(chatId, { onMessage, onTyping } = {}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  onMessageRef.current = onMessage;
  onTypingRef.current = onTyping;

  useEffect(() => {
    if (!chatId) return undefined;

    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    const ws = new WebSocket(`${resolveWsUrl()}/ws/chat/${chatId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.action === 'message.new' && onMessageRef.current) {
        onMessageRef.current(data.message);
      }
      if (data.action === 'typing.update' && onTypingRef.current) {
        onTypingRef.current(data);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [chatId]);

  const sendMessage = useCallback((content, messageType = 'text') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ action: 'message.send', message_type: messageType, content })
      );
    }
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
