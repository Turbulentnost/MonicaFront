import { useCallback, useEffect, useRef, useState } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export function useWebSocket(chatId, onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!chatId) return undefined;

    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    const ws = new WebSocket(`${WS_URL}/ws/chat/${chatId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.action === 'message.new' && onMessageRef.current) {
        onMessageRef.current(data.message);
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

  return { connected, sendMessage };
}
