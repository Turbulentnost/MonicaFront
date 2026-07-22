import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useCall } from '../hooks/useCall';
import { usePresence } from '../hooks/usePresence';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { user } = useAuth();
  const call = useCall(user);
  const chatPreviewRef = useRef(null);
  const notificationRef = useRef(null);
  const onCallEventRef = useRef(call.onCallEvent);
  onCallEventRef.current = call.onCallEvent;

  const handleChatPreview = useCallback((message) => {
    chatPreviewRef.current?.(message);
  }, []);

  const handleNotification = useCallback((notification) => {
    notificationRef.current?.(notification);
  }, []);

  const handleCallEvent = useCallback((event) => {
    onCallEventRef.current?.(event);
  }, []);

  const presence = usePresence(Boolean(user), {
    onCallEvent: handleCallEvent,
    onChatPreview: handleChatPreview,
    onNotification: handleNotification,
  });

  const registerPresenceHandlers = useCallback(({ onChatPreview, onNotification } = {}) => {
    chatPreviewRef.current = onChatPreview || null;
    notificationRef.current = onNotification || null;
    return () => {
      if (chatPreviewRef.current === onChatPreview) chatPreviewRef.current = null;
      if (notificationRef.current === onNotification) notificationRef.current = null;
    };
  }, []);

  const value = {
    ...call,
    isOnline: presence.isOnline,
    getLastSeen: presence.getLastSeen,
    registerPresenceHandlers,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCallContext must be used within CallProvider');
  }
  return ctx;
}

/** Register chat-page presence side-effects without opening a second WS. */
export function usePresenceHandlers({ onChatPreview, onNotification } = {}) {
  const { registerPresenceHandlers } = useCallContext();
  useEffect(
    () => registerPresenceHandlers({ onChatPreview, onNotification }),
    [registerPresenceHandlers, onChatPreview, onNotification]
  );
}
