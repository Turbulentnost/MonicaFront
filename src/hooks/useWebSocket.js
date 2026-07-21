import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_URL } from '../config';

export function useWebSocket(chatId, { onMessage, onTyping, onDeleted, onEdited, onRead } = {}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onDeletedRef = useRef(onDeleted);
  const onEditedRef = useRef(onEdited);
  const onReadRef = useRef(onRead);
  onMessageRef.current = onMessage;
  onTypingRef.current = onTyping;
  onDeletedRef.current = onDeleted;
  onEditedRef.current = onEdited;
  onReadRef.current = onRead;

  useEffect(() => {
    if (!chatId) return undefined;

    let cancelled = false;
    let retryTimer = null;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      // Always read the latest access token — axios may refresh it while WS is down.
      const token = localStorage.getItem('access_token');
      if (!token) {
        setConnected(false);
        if (attempt < 12) {
          const delay = Math.min(1000 * 2 ** attempt, 10000);
          attempt += 1;
          retryTimer = setTimeout(connect, delay);
        }
        return;
      }

      const ws = new WebSocket(`${WS_URL}/ws/chat/${chatId}/?token=${token}`);
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
        if (attempt < 12) {
          const delay = Math.min(1000 * 2 ** attempt, 10000);
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
        if (data.action === 'message.edited' && onEditedRef.current) {
          onEditedRef.current(data.message);
        }
        if (data.action === 'messages.read' && onReadRef.current) {
          onReadRef.current(data);
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
      const attachments = Array.isArray(metadata.attachments)
        ? metadata.attachments
            .filter((item) => item?.path)
            .slice(0, 10)
            .map((item) => ({
              path: item.path,
              file_name: item.file_name || '',
              mime_type: item.mime_type || '',
              file_size: item.file_size ?? null,
            }))
        : undefined;
      wsRef.current.send(
        JSON.stringify({
          action: 'message.send',
          message_type: messageType,
          content,
          client_id: metadata.client_id || undefined,
          file_name: metadata.file_name || '',
          mime_type: metadata.mime_type || '',
          file_size: metadata.file_size ?? null,
          attachments,
          waveform: Array.isArray(metadata.waveform) ? metadata.waveform : undefined,
          voice_duration_ms: metadata.voice_duration_ms ?? undefined,
        })
      );
      return true;
    }
    return false;
  }, []);

  const editMessage = useCallback((messageId, content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'message.edit',
          message_id: messageId,
          content: content ?? '',
        })
      );
      return true;
    }
    return false;
  }, []);

  const markRead = useCallback((messageIds) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'messages.read',
          message_ids: messageIds || undefined,
        })
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

  return { connected, sendMessage, editMessage, sendTyping, markRead };
}
