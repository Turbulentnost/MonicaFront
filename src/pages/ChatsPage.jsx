import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotifications, usePresence } from '../hooks/usePresence';
import { useCall } from '../hooks/useCall';
import { useSecretSequenceShortcut, FRONT_SEQUENCE, BACK_SEQUENCE } from '../hooks/useSecretFavoritesShortcut';
import { useUserIdle } from '../hooks/useUserIdle';
import { ChatHeader } from '../components/Chat/ChatHeader';
import { ChatListItem } from '../components/Chat/ChatListItem';
import { ChatIconRail } from '../components/Chat/ChatIconRail';
import { ChatFilters } from '../components/Chat/ChatFilters';
import { ChatDetailsPanel } from '../components/Chat/ChatDetailsPanel';
import { ChatDevStatusBar } from '../components/Chat/ChatDevStatusBar';
import { AccountSettings } from '../components/AccountSettings';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { NotificationBell } from '../components/Chat/NotificationBell';
import { CodeEditorInput } from '../components/Chat/CodeEditorInput';
import { EmojiPicker } from '../components/Chat/EmojiPicker';
import { PrivatePanel } from '../components/Chat/PrivatePanel';
import { UserSearchResult } from '../components/Chat/UserSearchResult';
import { IncomingCallOverlay } from '../components/Chat/IncomingCallOverlay';
import { CallScreen } from '../components/Chat/CallScreen';
import { warmAvatarCache } from '../utils/avatarCache';
import { groupMessagesByDay } from '../utils/formatChatDate';
import { invalidateMediaCache, warmMediaCache } from '../utils/mediaCache';
import { API_URL } from '../config';
import { VoiceRecorder, canUseMicrophone } from '../utils/voiceRecorder';

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;
const CHAT_IDLE_MS = 60_000;
const lastChatStorageKey = (userId) => (userId ? `monica_last_chat_id:${userId}` : null);

function leavePrivateSessionsBestEffort() {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    // keepalive переживает закрытие вкладки; дублирует presence-disconnect
    fetch(`${API_URL}/api/private/leave/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: '{}',
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export default function ChatsPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('');
  const [codeFileName, setCodeFileName] = useState('');
  const [privateSessionId, setPrivateSessionId] = useState(null);
  const [privateBusy, setPrivateBusy] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [pendingInviteSessionId, setPendingInviteSessionId] = useState(null);
  const [chatFilter, setChatFilter] = useState('all');
  const [isSpecialFavoritesOpen, setIsSpecialFavoritesOpen] = useState(false);
  const [isBackModeOpen, setIsBackModeOpen] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState({});
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const loadingOlderRef = useRef(false);
  const prependScrollRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const suppressHistoryLoadRef = useRef(false);
  const highlightTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const markReadRef = useRef(null);
  const isIdleRef = useRef(false);
  const didRestoreChatRef = useRef(false);
  const lastImagePasteAtRef = useRef(0);
  const emojiHideTimeoutRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceElapsedMs, setVoiceElapsedMs] = useState(0);
  const [voiceLiveWaveform, setVoiceLiveWaveform] = useState([]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const callController = useCall(user);
  const callChatId = callController.call?.chat_id
    || (typeof callController.call?.chat === 'object'
      ? callController.call.chat?.id
      : callController.call?.chat);
  const callScreenVisible = ['outgoing', 'connecting', 'active'].includes(callController.status);
  const dispatchCallEvent = callController.onCallEvent;
  const isIdle = useUserIdle(CHAT_IDLE_MS);
  isIdleRef.current = isIdle;

  const persistSelectedChat = useCallback((chat) => {
    const key = lastChatStorageKey(user?.id);
    if (!key || !chat?.id) return;
    localStorage.setItem(key, String(chat.id));
  }, [user?.id]);

  const loadChats = useCallback(async () => {
    const { data } = await chatsApi.list();
    setChats(data);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!callScreenVisible || selectedChat || !callChatId) return;
    const activeChat = chats.find((item) => String(item.id) === String(callChatId));
    if (activeChat) {
      setSelectedChat(activeChat);
      persistSelectedChat(activeChat);
    }
  }, [callChatId, callScreenVisible, chats, selectedChat, persistSelectedChat]);

  const loadMessages = useCallback(async (chatId) => {
    shouldStickToBottomRef.current = true;
    suppressHistoryLoadRef.current = true;
    setHighlightedMessageId(null);
    const { data } = await chatsApi.messages(chatId, { limit: 100 });
    setMessages(data);
    setHasMoreMessages(data.length === 100);
    loadingOlderRef.current = false;
    setLoadingOlderMessages(false);
    prependScrollRef.current = null;
    data.forEach((msg) => {
      if (msg.message_type !== 'photo') return;
      const items = Array.isArray(msg.attachments) && msg.attachments.length
        ? msg.attachments
        : [{ path: msg.content, content_url: msg.content_url }];
      items.forEach((item) => {
        if (item.path && item.content_url) warmMediaCache(item.path, item.content_url);
      });
    });
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (
      loadingOlderRef.current
      || !hasMoreMessages
      || !selectedChat?.id
      || messages.length === 0
    ) {
      return;
    }

    const oldestMessage = messages.find((message) => !String(message.id).startsWith('temp-'));
    if (!oldestMessage) return;

    const container = messagesAreaRef.current;
    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);
    try {
      const { data } = await chatsApi.messages(selectedChat.id, {
        limit: 100,
        before: oldestMessage.id,
      });

      if (!data.length) {
        setHasMoreMessages(false);
        return;
      }

      if (container) {
        prependScrollRef.current = {
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
        };
      }
      setMessages((current) => {
        const knownIds = new Set(current.map((message) => String(message.id)));
        const older = data.filter((message) => !knownIds.has(String(message.id)));
        return older.length ? [...older, ...current] : current;
      });
      setHasMoreMessages(data.length === 100);
      data.forEach((message) => {
        if (message.message_type !== 'photo') return;
        const items = Array.isArray(message.attachments) && message.attachments.length
          ? message.attachments
          : [{ path: message.content, content_url: message.content_url }];
        items.forEach((item) => {
          if (item.path && item.content_url) warmMediaCache(item.path, item.content_url);
        });
      });
    } catch {
      setAttachError('Не удалось загрузить более старые сообщения');
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [hasMoreMessages, messages, selectedChat?.id]);

  const handleMessagesScroll = useCallback((event) => {
    const container = event.currentTarget;
    if (suppressHistoryLoadRef.current) return;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    shouldStickToBottomRef.current = maxScroll - container.scrollTop < 96;
    if (container.scrollTop <= 80) {
      loadOlderMessages();
    }
  }, [loadOlderMessages]);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setAttachError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removePendingAttachment = (id) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
    setAttachError('');
  };

  const handleSelectChat = async (chat) => {
    clearPendingAttachments();
    setAccountSettingsOpen(false);
    setSelectedChat(chat);
    persistSelectedChat(chat);
    setPartnerTyping(false);
    setInput('');
    setCodeMode(false);
    setAttachError('');
    await loadMessages(chat.id);
  };

  useEffect(() => {
    if (!user?.id || !chats.length || selectedChat || didRestoreChatRef.current) return;
    didRestoreChatRef.current = true;
    const savedId = localStorage.getItem(lastChatStorageKey(user.id));
    if (!savedId) return;
    const chat = chats.find((item) => String(item.id) === String(savedId));
    if (chat) {
      handleSelectChat(chat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once after first chats load
  }, [user?.id, chats, selectedChat]);

  const handleNewMessage = useCallback(
    (message) => {
      setPartnerTyping(false);
      setMessages((prev) => {
        const withoutTemp = message.client_id
          ? prev.filter((m) => m.client_id !== message.client_id && m.id !== `temp-${message.client_id}`)
          : prev;
        if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp;
        return [...withoutTemp, message];
      });
      if (message.message_type === 'photo') {
        const items = Array.isArray(message.attachments) && message.attachments.length
          ? message.attachments
          : [{ path: message.content, content_url: message.content_url }];
        items.forEach((item) => {
          if (item.path && item.content_url) warmMediaCache(item.path, item.content_url);
        });
      }
      // Mark read only while the user is actively using the page.
      if (
        !isIdleRef.current
        && message.sender?.id
        && message.sender.id !== user?.id
        && !message.read_at
      ) {
        markReadRef.current?.([message.id]);
      }
      loadChats();
    },
    [loadChats, user?.id]
  );

  const handleMessagesRead = useCallback((data) => {
    const ids = new Set((data.message_ids || []).map(String));
    if (!ids.size) return;
    const readAt = data.read_at || new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (ids.has(String(m.id)) ? { ...m, read_at: readAt } : m))
    );
  }, []);

  const handleMessageDeleted = useCallback(
    (messageId) => {
      setMessages((prev) => {
        const removed = prev.find((m) => m.id === messageId);
        if (removed?.message_type === 'photo') {
          const items = Array.isArray(removed.attachments) && removed.attachments.length
            ? removed.attachments
            : [{ path: removed.content }];
          items.forEach((item) => {
            if (item?.path) invalidateMediaCache(item.path);
          });
        }
        return prev.filter((m) => m.id !== messageId);
      });
      loadChats();
    },
    [loadChats]
  );

  const handleMessageEdited = useCallback((message) => {
    if (!message?.id) return;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, ...message } : m)));
    const chatId = message?.chat ? String(message.chat) : null;
    if (!chatId) return;
    setChats((prev) => {
      const idx = prev.findIndex((c) => String(c.id) === chatId);
      if (idx < 0) return prev;
      const current = prev[idx];
      if (String(current.last_message?.id) !== String(message.id)) return prev;
      const next = [...prev];
      next[idx] = {
        ...current,
        last_message: { ...current.last_message, ...message },
      };
      return next;
    });
  }, []);

  const handleTyping = useCallback((data) => {
    if (data.user_id === user?.id) return;
    setPartnerTyping(Boolean(data.is_typing));
  }, [user?.id]);

  const { connected, sendMessage, editMessage, sendTyping, markRead: markMessagesRead } = useWebSocket(selectedChat?.id, {
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onDeleted: handleMessageDeleted,
    onEdited: handleMessageEdited,
    onRead: handleMessagesRead,
  });
  markReadRef.current = markMessagesRead;

  // When the open chat is connected and the user is active, mark backlog as read.
  useEffect(() => {
    if (!selectedChat?.id || !connected || isIdle) return;
    markMessagesRead();
  }, [selectedChat?.id, connected, isIdle, markMessagesRead]);

  const {
    items: notifications,
    open: notifOpen,
    setOpen: setNotifOpen,
    unreadCount,
    pushNotification,
    updateNotification,
    resolveInvitesBySession,
    markRead,
    markAllRead,
    clearAll,
  } = useNotifications(Boolean(user));

  const openPrivateSession = useCallback(
    async (sessionId, chatId) => {
      // Сначала открываем панель — не блокируемся на загрузке чата
      setPrivateSessionId(sessionId);
      setInvitePending(false);
      setPendingInviteSessionId(null);
      setPrivateBusy(false);

      if (!chatId) return;
      try {
        let chat = chats.find((c) => String(c.id) === String(chatId));
        if (!chat) {
          const { data } = await chatsApi.list();
          setChats(data);
          chat = data.find((c) => String(c.id) === String(chatId));
        }
        if (chat && String(selectedChat?.id) !== String(chat.id)) {
          clearPendingAttachments();
          setSelectedChat(chat);
          persistSelectedChat(chat);
          setPartnerTyping(false);
          setInput('');
          setCodeMode(false);
          setAttachError('');
          await loadMessages(chat.id);
        }
      } catch {
        // панель уже открыта
      }
    },
    [chats, selectedChat?.id, loadMessages, clearPendingAttachments, persistSelectedChat]
  );

  const handleNotification = useCallback(
    (notification) => {
      pushNotification(notification);
      if (notification.notification_type === 'private_accepted' && notification.payload?.session_id) {
        openPrivateSession(notification.payload.session_id, notification.payload.chat_id);
      }
      if (notification.notification_type === 'private_declined') {
        setInvitePending(false);
        setPrivateBusy(false);
        setPendingInviteSessionId(null);
      }
      if (notification.notification_type === 'private_cancelled') {
        resolveInvitesBySession(notification.payload?.session_id, 'cancelled');
        setInvitePending(false);
        setPrivateBusy(false);
        setPendingInviteSessionId(null);
      }
      if (notification.notification_type === 'private_closed') {
        if (String(privateSessionId) === String(notification.payload?.session_id)) {
          setPrivateSessionId(null);
        }
        setInvitePending(false);
        setPendingInviteSessionId(null);
      }
    },
    [pushNotification, openPrivateSession, privateSessionId, resolveInvitesBySession]
  );

  const applyChatPreview = useCallback((message) => {
    const chatId = message?.chat ? String(message.chat) : null;
    if (!chatId) return;
    setChats((prev) => {
      const idx = prev.findIndex((c) => String(c.id) === chatId);
      if (idx < 0) {
        loadChats();
        return prev;
      }
      const current = prev[idx];
      const updated = {
        ...current,
        last_message: message,
        updated_at: message.sent_at || current.updated_at,
      };
      const rest = prev.filter((_, i) => i !== idx);
      return [updated, ...rest];
    });
  }, [loadChats]);

  const handleCallEvent = useCallback((event) => {
    dispatchCallEvent(event);
    if (event.action !== 'call.incoming') return;
    const eventCall = event.call || event;
    const chatId = eventCall.chat_id
      || (typeof eventCall.chat === 'object' ? eventCall.chat?.id : eventCall.chat);
    if (!chatId) return;
    setChats((prev) => {
      const index = prev.findIndex((item) => String(item.id) === String(chatId));
      if (index < 0) {
        loadChats();
        return prev;
      }
      return [prev[index], ...prev.filter((_, itemIndex) => itemIndex !== index)];
    });
  }, [dispatchCallEvent, loadChats]);

  const { isOnline, getLastSeen } = usePresence(Boolean(user), {
    onChatPreview: applyChatPreview,
    onNotification: handleNotification,
    onCallEvent: handleCallEvent,
  });

  const handleInvitePrivate = async () => {
    if (!selectedChat || privateBusy || privateSessionId) return;
    setPrivateBusy(true);
    try {
      const { data } = await chatsApi.invitePrivate(selectedChat.id);
      if (data.status === 'active' || data.handshake) {
        setInvitePending(false);
        setPendingInviteSessionId(null);
        await openPrivateSession(data.id, data.chat_id || selectedChat.id);
      } else {
        setInvitePending(true);
        setPendingInviteSessionId(data.id);
      }
    } catch (err) {
      const data = err.response?.data;
      if ((data?.status === 'active' || data?.handshake) && (data?.id || data?.session_id)) {
        await openPrivateSession(data.id || data.session_id, data.chat_id || selectedChat.id);
      } else if (data?.status === 'pending') {
        setInvitePending(true);
        setPendingInviteSessionId(data.id);
      }
    } finally {
      setPrivateBusy(false);
    }
  };

  const handleAcceptInvite = async (notification) => {
    const sessionId = notification.payload?.session_id;
    const chatId = notification.payload?.chat_id;
    if (!sessionId) return;

    updateNotification(notification.id, {
      is_read: true,
      payload: { resolved: 'accepted' },
    });
    setNotifOpen(false);

    // Accept и открытие панели параллельно: WS retry дождётся ACTIVE
    const acceptPromise = chatsApi.acceptPrivate(sessionId);
    await openPrivateSession(sessionId, chatId);

    try {
      await acceptPromise;
      markRead(notification.id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      // Уже обработано — сессия могла стать active (handshake и т.п.)
      if (status === 400 || status === 404) {
        markRead(notification.id);
        return;
      }
      setPrivateSessionId(null);
      updateNotification(notification.id, {
        is_read: false,
        payload: { resolved: undefined },
      });
      setAttachError(detail || 'Не удалось принять приглашение');
    }
  };

  const handleDeclineInvite = async (notification) => {
    const sessionId = notification.payload?.session_id;
    if (!sessionId) return;
    // Оптимистично сразу убираем кнопки
    updateNotification(notification.id, {
      is_read: true,
      payload: { resolved: 'declined' },
    });
    try {
      await chatsApi.declinePrivate(sessionId);
      await markRead(notification.id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      // Уже обработано / не найдено — считаем отклонённым
      if (status === 400 || status === 404) {
        await markRead(notification.id);
        return;
      }
      updateNotification(notification.id, {
        is_read: false,
        payload: { resolved: undefined },
      });
      setAttachError(detail || 'Не удалось отклонить приглашение');
    }
  };

  const handleCancelOutgoingInvite = async () => {
    const sessionId = pendingInviteSessionId;
    setInvitePending(false);
    setPrivateBusy(false);
    setPendingInviteSessionId(null);
    if (!sessionId) return;
    try {
      await chatsApi.closePrivate(sessionId);
    } catch {
      // ignore — при выходе presence/leave добьёт
    }
  };

  const handleLogout = async () => {
    stopTyping();
    try {
      await chatsApi.leavePrivate();
    } catch {
      leavePrivateSessionsBestEffort();
    }
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setPartnerTyping(false);
    lastTypingSentRef.current = false;
  }, [selectedChat?.id]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  useLayoutEffect(() => {
    const container = messagesAreaRef.current;
    const previous = prependScrollRef.current;
    if (container && previous) {
      container.scrollTop =
        container.scrollHeight - previous.scrollHeight + previous.scrollTop;
      prependScrollRef.current = null;
      return;
    }
    if (!container || !shouldStickToBottomRef.current) return;
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      if (!messagesAreaRef.current || !shouldStickToBottomRef.current) return;
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
      suppressHistoryLoadRef.current = false;
    });
  }, [messages, partnerTyping]);

  const jumpToMessage = useCallback(async (messageId) => {
    if (!selectedChat?.id || !messageId) return;

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setHighlightedMessageId(String(messageId));
    shouldStickToBottomRef.current = false;

    const scrollToTarget = () => {
      const el = messagesAreaRef.current?.querySelector(
        `[data-message-id="${CSS.escape(String(messageId))}"]`
      );
      if (!el) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    };

    if (scrollToTarget()) {
      highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 2200);
      return;
    }

    suppressHistoryLoadRef.current = true;
    try {
      const { data } = await chatsApi.messages(selectedChat.id, {
        around: messageId,
        limit: 100,
      });
      setMessages(Array.isArray(data) ? data : []);
      setHasMoreMessages(true);
      requestAnimationFrame(() => {
        scrollToTarget();
        suppressHistoryLoadRef.current = false;
      });
    } catch {
      suppressHistoryLoadRef.current = false;
    }
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 2200);
  }, [selectedChat?.id]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (lastTypingSentRef.current) {
      sendTyping(false);
      lastTypingSentRef.current = false;
    }
  }, [sendTyping]);

  const toggleCodeMode = () => {
    setCodeMode((prev) => {
      const next = !prev;
      if (next) {
        clearPendingAttachments();
        if (!codeLanguage) setCodeLanguage('python');
        if (!codeFileName) setCodeFileName('script.py');
      }
      setAttachError('');
      return next;
    });
  };

  const handleCodeLanguageChange = (lang) => {
    setCodeLanguage(lang);
    const ext = lang === 'javascript' ? '.js' : '.py';
    const base = (codeFileName || 'script').replace(/\.(py|js)$/i, '') || 'script';
    setCodeFileName(`${base}${ext}`);
  };

  const enqueueOptimistic = useCallback(
    (content, messageType, metadata = {}) => {
      const clientId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const attachments = Array.isArray(metadata.attachments)
        ? metadata.attachments.slice(0, 10)
        : undefined;
      const optimistic = {
        id: `temp-${clientId}`,
        client_id: clientId,
        client_status: 'sending',
        chat: selectedChat?.id,
        sender: {
          id: user?.id,
          nickname: user?.nickname,
          photo_url: user?.photo_url,
        },
        message_type: messageType,
        content,
        content_url: metadata.content_url || null,
        file_name: metadata.file_name || '',
        mime_type: metadata.mime_type || '',
        file_size: metadata.file_size ?? null,
        attachments,
        caption: metadata.caption || '',
        waveform: Array.isArray(metadata.waveform) ? metadata.waveform : [],
        voice_duration_ms: metadata.voice_duration_ms ?? null,
        sent_at: new Date().toISOString(),
        edited_at: null,
        read_at: null,
      };
      setMessages((prev) => [...prev, optimistic]);
      const ok = sendMessage(content, messageType, { ...metadata, client_id: clientId });
      if (!ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
      return ok;
    },
    [selectedChat?.id, sendMessage, user]
  );

  const uploadAndSendFiles = async (files, extra = {}) => {
    const caption = (extra.caption || '').trim();
    const voiceMeta = extra.waveform || extra.voiceDurationMs != null
      ? { waveform: extra.waveform, voiceDurationMs: extra.voiceDurationMs }
      : null;
    const { data } = await chatsApi.uploadMessageFiles(selectedChat.id, files);
    const uploaded = data.files || [];
    let allSent = true;

    const photos = uploaded.filter((item) => item.message_type === 'photo');
    const others = uploaded.filter((item) => item.message_type !== 'photo');

    if (photos.length) {
      photos.forEach((item) => {
        if (item.path && item.content_url) {
          warmMediaCache(item.path, item.content_url);
        }
      });
      const attachments = photos.map((item) => ({
        path: item.path,
        file_name: item.file_name,
        mime_type: item.mime_type,
        file_size: item.file_size,
        content_url: item.content_url,
      }));
      const first = attachments[0];
      const content = caption || first.path;
      const ok = enqueueOptimistic(content, 'photo', {
        file_name: first.file_name,
        mime_type: first.mime_type,
        file_size: first.file_size,
        content_url: first.content_url,
        attachments,
        caption: caption || '',
      });
      if (!ok) allSent = false;
    }

    others.forEach((item) => {
      const isVoice = item.message_type === 'voice' || Boolean(voiceMeta);
      const ok = enqueueOptimistic(item.path, isVoice ? 'voice' : item.message_type, {
        file_name: item.file_name,
        mime_type: item.mime_type,
        file_size: item.file_size,
        content_url: item.content_url,
        waveform: voiceMeta?.waveform || [],
        voice_duration_ms: voiceMeta?.voiceDurationMs ?? null,
      });
      if (!ok) allSent = false;
    });

    if (!allSent) {
      throw new Error('Файл загружен, но WebSocket отключился — обновите страницу');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const detectMic = async () => {
      if (!canUseMicrophone()) {
        if (!cancelled) setMicAvailable(false);
        return;
      }
      try {
        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasInput = devices.some((device) => device.kind === 'audioinput');
          if (!cancelled) setMicAvailable(hasInput || devices.length === 0);
          return;
        }
      } catch {
        // fallback below
      }
      if (!cancelled) setMicAvailable(true);
    };
    detectMic();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => {
    voiceRecorderRef.current?.cancel?.();
    voiceRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (!voiceRecorderRef.current) return;
      voiceRecorderRef.current.cancel?.();
      voiceRecorderRef.current = null;
      setVoiceRecording(false);
      setVoiceElapsedMs(0);
      setVoiceLiveWaveform([]);
    };
  }, [selectedChat?.id]);

  const formatVoiceClock = (milliseconds) => {
    const seconds = Math.max(0, Math.floor((milliseconds || 0) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const startVoiceRecording = async (event) => {
    event.preventDefault();
    if (
      !selectedChat
      || !micAvailable
      || voiceRecording
      || voiceBusy
      || uploading
      || codeMode
    ) {
      return;
    }
    if (!connected) {
      setAttachError('Нет соединения с чатом — подождите и попробуйте снова');
      return;
    }

    stopTyping();
    setAttachError('');
    const recorder = new VoiceRecorder();
    voiceRecorderRef.current = recorder;
    try {
      await recorder.start(({ elapsedMs, waveform }) => {
        setVoiceElapsedMs(elapsedMs);
        setVoiceLiveWaveform(waveform.slice(-28));
      });
      setVoiceRecording(true);
      setVoiceElapsedMs(0);
      setVoiceLiveWaveform([]);
    } catch (err) {
      voiceRecorderRef.current = null;
      setVoiceRecording(false);
      setMicAvailable(false);
      setAttachError(err.message || 'Не удалось получить доступ к микрофону');
    }
  };

  const cancelVoiceRecording = async () => {
    const recorder = voiceRecorderRef.current;
    voiceRecorderRef.current = null;
    setVoiceRecording(false);
    setVoiceElapsedMs(0);
    setVoiceLiveWaveform([]);
    if (recorder) {
      await recorder.cancel();
    }
  };

  const stopVoiceBeforeCall = async () => {
    if (voiceRecorderRef.current) await cancelVoiceRecording();
  };

  const handleStartCall = async () => {
    if (!selectedChat?.id) return;
    await stopVoiceBeforeCall();
    stopTyping();
    callController.startCall(selectedChat.id);
  };

  const handleAcceptCall = async () => {
    await stopVoiceBeforeCall();
    stopTyping();
    callController.acceptCall();
  };

  const sendVoiceRecording = async () => {
    if (!selectedChat || voiceBusy) return;
    const recorder = voiceRecorderRef.current;
    if (!recorder) return;

    setVoiceBusy(true);
    setAttachError('');
    try {
      const result = await recorder.stop(true);
      voiceRecorderRef.current = null;
      setVoiceRecording(false);
      setVoiceElapsedMs(0);
      setVoiceLiveWaveform([]);

      if (!result) {
        setAttachError('Запись слишком короткая');
        return;
      }
      if (!connected) {
        setAttachError('Нет соединения с чатом — подождите и попробуйте снова');
        return;
      }

      setUploading(true);
      await uploadAndSendFiles([result.file], {
        waveform: result.waveform,
        voiceDurationMs: result.voiceDurationMs,
      });
    } catch (err) {
      setAttachError(err.response?.data?.detail || err.message || 'Не удалось отправить голосовое');
      await cancelVoiceRecording();
    } finally {
      setUploading(false);
      setVoiceBusy(false);
    }
  };

  const handleSendCode = async () => {
    if (!selectedChat || uploading) return;

    const code = input;
    if (!code.trim()) {
      setAttachError('Введите код');
      return;
    }
    if (!codeLanguage) {
      setAttachError('Выберите язык');
      return;
    }
    let name = (codeFileName || '').trim();
    if (!name) {
      setAttachError('Укажите имя файла');
      return;
    }
    if (!connected) {
      setAttachError('Нет соединения с чатом — подождите и попробуйте снова');
      return;
    }

    const ext = codeLanguage === 'javascript' ? '.js' : '.py';
    if (!name.toLowerCase().endsWith(ext)) {
      name = `${name}${ext}`;
    }
    const mime = codeLanguage === 'javascript' ? 'text/javascript' : 'text/x-python';
    const file = new File([code], name, { type: mime });

    stopTyping();
    setAttachError('');
    setUploading(true);
    try {
      await uploadAndSendFiles([file]);
      setInput('');
      setCodeFileName(codeLanguage === 'javascript' ? 'script.js' : 'script.py');
    } catch (err) {
      setAttachError(err.response?.data?.detail || err.message || 'Не удалось отправить код');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedChat || uploading) return;

    if (codeMode) {
      await handleSendCode();
      return;
    }

    const text = input.trim();
    const hasFiles = pendingAttachments.length > 0;
    if (!text && !hasFiles) return;

    if (!connected) {
      setAttachError('Нет соединения с чатом — подождите и попробуйте снова');
      return;
    }

    stopTyping();
    setAttachError('');

    if (!hasFiles) {
      const ok = enqueueOptimistic(text, 'text');
      if (!ok) {
        setAttachError('Не удалось отправить сообщение');
        return;
      }
      setInput('');
      return;
    }

    const hasPhotos = pendingAttachments.some((item) => item.file?.type?.startsWith('image/'));
    setUploading(true);
    try {
      await uploadAndSendFiles(
        pendingAttachments.map((item) => item.file),
        { caption: hasPhotos ? text : '' }
      );
      // Text without photos stays a separate message.
      if (text && !hasPhotos) {
        const ok = enqueueOptimistic(text, 'text');
        if (!ok) {
          setAttachError('Файлы отправлены, но текст не удалось отправить');
        }
      }
      setInput('');
      clearPendingAttachments();
    } catch (err) {
      setAttachError(err.response?.data?.detail || err.message || 'Не удалось загрузить файлы');
    } finally {
      setUploading(false);
    }
  };

  const handleEditMessage = useCallback((messageId, content) => {
    if (!connected) {
      setAttachError('Нет соединения с чатом — подождите и попробуйте снова');
      return false;
    }
    const ok = editMessage(messageId, content);
    if (!ok) {
      setAttachError('Не удалось отредактировать сообщение');
    }
    return ok;
  }, [connected, editMessage]);

  const addPendingFiles = useCallback((fileList) => {
    const picked = Array.from(fileList || []).filter(Boolean);
    if (!picked.length) return;

    setPendingAttachments((prev) => {
      const room = MAX_ATTACHMENTS - prev.length;
      if (room <= 0) {
        setAttachError(`Можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`);
        return prev;
      }

      const accepted = [];
      let error = '';
      for (const file of picked) {
        if (accepted.length >= room) {
          error = `Можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`;
          break;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          error = `«${file.name || 'файл'}» больше 300 МБ`;
          continue;
        }
        accepted.push({
          id: `${file.name || 'paste'}-${file.size}-${file.lastModified || Date.now()}-${Math.random()}`,
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        });
      }
      setAttachError(error);
      return accepted.length ? [...prev, ...accepted] : prev;
    });
  }, []);

  const handleFileChange = (e) => {
    addPendingFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteFiles = useCallback(
    (event) => {
      if (!selectedChat || codeMode || voiceRecording || uploading) return;
      if (
        event.currentTarget !== messageInputRef.current
        || document.activeElement !== messageInputRef.current
      ) {
        return;
      }

      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const imageItems = Array.from(clipboard.items || []).filter(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );
      const clipboardFiles = Array.from(clipboard.files || []).filter((file) =>
        file.type?.startsWith('image/')
      );

      // A screenshot may be exposed in several formats; one Ctrl+V adds one image.
      const sourceFile = imageItems[0]?.getAsFile() || clipboardFiles[0];
      if (!sourceFile) return;
      event.preventDefault();
      event.stopPropagation();

      // Some Windows screenshot tools dispatch two paste events for one Ctrl+V.
      const now = Date.now();
      if (now - lastImagePasteAtRef.current < 2000) return;
      lastImagePasteAtRef.current = now;

      const rawExt = (sourceFile.type.split('/')[1] || 'png').toLowerCase();
      const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
      const hasName = Boolean(
        sourceFile.name
        && sourceFile.name.trim()
        && sourceFile.name !== 'image.png'
      );
      const image = hasName
        ? sourceFile
        : new File([sourceFile], `paste-${now}.${ext}`, {
            type: sourceFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            lastModified: now,
          });
      addPendingFiles([image]);
    },
    [addPendingFiles, codeMode, selectedChat, uploading, voiceRecording]
  );

  const handleToggleReaction = useCallback((messageId, emoji) => {
    setMessageReactions((prev) => {
      const list = [...(prev[messageId] || [])];
      const idx = list.findIndex((r) => r.emoji === emoji);

      if (idx >= 0) {
        const item = list[idx];
        if (item.reactedByMe) {
          const newCount = item.count - 1;
          if (newCount <= 0) {
            list.splice(idx, 1);
          } else {
            list[idx] = { ...item, count: newCount, reactedByMe: false };
          }
        } else {
          list[idx] = { ...item, count: item.count + 1, reactedByMe: true };
        }
      } else {
        list.push({ emoji, count: 1, reactedByMe: true });
      }

      const next = { ...prev };
      if (list.length === 0) {
        delete next[messageId];
      } else {
        next[messageId] = list;
      }
      return next;
    });
  }, []);

  const handleDeleteMessage = async (messageId, scope) => {
    if (!selectedChat) return;
    if (String(messageId).startsWith('temp-')) return;
    try {
      await chatsApi.deleteMessage(selectedChat.id, messageId, scope);
      const removed = messages.find((m) => m.id === messageId);
      if (scope === 'everyone' && removed?.message_type === 'photo') {
        const items = Array.isArray(removed.attachments) && removed.attachments.length
          ? removed.attachments
          : [{ path: removed.content }];
        items.forEach((item) => {
          if (item?.path) invalidateMediaCache(item.path);
        });
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setMessageReactions((prev) => {
        if (!prev[messageId]) return prev;
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      loadChats();
    } catch {
      // ignore
    }
  };

  const resizeMessageInput = useCallback(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = '0px';
    const styles = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
    const paddingY =
      (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
    const minHeight = lineHeight + paddingY;
    const maxHeight = lineHeight * 2 + paddingY;
    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
  }, []);

  const handleInputChange = (value) => {
    setInput(value);
    if (!selectedChat) return;

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!lastTypingSentRef.current) {
      sendTyping(true);
      lastTypingSentRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
      lastTypingSentRef.current = false;
    }, 1500);
  };

  useEffect(() => {
    if (codeMode) return;
    resizeMessageInput();
  }, [input, codeMode, selectedChat?.id, resizeMessageInput]);

  const clearEmojiHideTimeout = useCallback(() => {
    if (emojiHideTimeoutRef.current) {
      clearTimeout(emojiHideTimeoutRef.current);
      emojiHideTimeoutRef.current = null;
    }
  }, []);

  const handleEmojiZoneEnter = useCallback(() => {
    clearEmojiHideTimeout();
    setEmojiPickerVisible(true);
  }, [clearEmojiHideTimeout]);

  const handleEmojiZoneLeave = useCallback(() => {
    clearEmojiHideTimeout();
    emojiHideTimeoutRef.current = setTimeout(() => {
      setEmojiPickerVisible(false);
    }, 150);
  }, [clearEmojiHideTimeout]);

  const handleEmojiSelect = useCallback(
    (emoji) => {
      handleInputChange(input + emoji);
    },
    [handleInputChange, input]
  );

  useEffect(() => () => clearEmojiHideTimeout(), [clearEmojiHideTimeout]);

  const searchLocalCacheRef = useRef(new Map());

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const key = q.trim().toLowerCase();
    const cached = searchLocalCacheRef.current.get(key);
    if (cached) {
      setSearchResults(cached);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await chatsApi.searchUsers(q.trim());
        searchLocalCacheRef.current.set(key, data);
        setSearchResults(data);
        data.forEach((u) => {
          if (u.photo && u.photo_url) {
            warmAvatarCache(u.photo, u.photo_url);
          }
        });
      } catch {
        setSearchResults([]);
      }
    }, 250);
  };

  const startChat = async (recipientId) => {
    const { data } = await chatsApi.start(recipientId);
    setSearchQuery('');
    setSearchResults([]);
    await loadChats();
    const chat = {
      id: data.id,
      partner: data.partner,
      last_message: null,
      updated_at: new Date().toISOString(),
    };
    await handleSelectChat(chat);
  };

  const isChatUnread = useCallback(
    (chat) => {
      const lm = chat.last_message;
      if (!lm || !user?.id) return false;
      if (lm.sender?.id === user.id) return false;
      return !lm.read_at;
    },
    [user?.id]
  );

  const unreadChatCount = useMemo(
    () => chats.filter(isChatUnread).length,
    [chats, isChatUnread]
  );

  const filteredChats = useMemo(() => {
    if (isSpecialFavoritesOpen || isBackModeOpen) return chats;
    if (chatFilter === 'unread') return chats.filter(isChatUnread);
    if (chatFilter === 'mentions') return [];
    return chats;
  }, [chats, chatFilter, isSpecialFavoritesOpen, isBackModeOpen, isChatUnread]);

  const unlockFront = useCallback(() => {
    setIsBackModeOpen(false);
    setIsSpecialFavoritesOpen(true);
  }, []);
  const unlockBack = useCallback(() => {
    setIsSpecialFavoritesOpen(false);
    setIsBackModeOpen(true);
  }, []);
  useSecretSequenceShortcut(FRONT_SEQUENCE, unlockFront);
  useSecretSequenceShortcut(BACK_SEQUENCE, unlockBack);

  useEffect(() => {
    if (!isSpecialFavoritesOpen && !isBackModeOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setIsSpecialFavoritesOpen(false);
        setIsBackModeOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSpecialFavoritesOpen, isBackModeOpen]);

  useEffect(() => {
    const prevTitle = document.title;
    if (isBackModeOpen) {
      document.title = 'нам очень жаль что вы приняли эту сторону...';
      return () => {
        document.title = prevTitle || 'Monica';
      };
    }
    if (!isSpecialFavoritesOpen) {
      document.title = 'Monica';
    }
    return undefined;
  }, [isBackModeOpen, isSpecialFavoritesOpen]);

  const sidebarTitle = isBackModeOpen
    ? 'Пустота'
    : isSpecialFavoritesOpen
      ? 'Chats'
      : 'Чаты';

  const searchPlaceholder = isBackModeOpen
    ? 'Искать… зачем?'
    : isSpecialFavoritesOpen
      ? 'Search chats…  ⌘K'
      : 'Имя, фамилия, email или ник...';

  const inputPlaceholder = isBackModeOpen
    ? 'Напишите что-нибудь… это никого не спасёт'
    : isSpecialFavoritesOpen
      ? "Let's ship this! 💪"
      : 'Сообщение...';

  const sendLabel = isBackModeOpen
    ? 'Отправить…'
    : isSpecialFavoritesOpen
      ? 'Send ▷'
      : 'Отправить';

  const emptyLabel = isBackModeOpen
    ? 'Здесь никого нет. Как и смысла.'
    : isSpecialFavoritesOpen
      ? 'Select a channel from the sidebar'
      : 'Выберите чат или найдите пользователя для начала диалога';

  return (
    <div
      className={[
        'chats-page',
        privateSessionId ? 'with-private' : '',
        isSpecialFavoritesOpen ? 'chats-page--special' : '',
        isBackModeOpen ? 'chats-page--back' : '',
        selectedChat ? 'has-selected-chat' : '',
        callScreenVisible ? 'chats-page--call-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {callController.status === 'incoming' && (
        <IncomingCallOverlay
          partner={callController.partner}
          error={callController.error}
          onAccept={handleAcceptCall}
          onReject={callController.rejectCall}
        />
      )}
      {callController.status === 'ended' && callController.error && (
        <div className="call-error-toast" role="alert">{callController.error}</div>
      )}
      {isSpecialFavoritesOpen && <ChatDevStatusBar variant="front" />}
      {isBackModeOpen && <ChatDevStatusBar variant="back" />}
      {isSpecialFavoritesOpen && (
        <div className="chat-dev-grid" aria-hidden="true" />
      )}
      {isBackModeOpen && <div className="chat-back-rain" aria-hidden="true" />}
      {isBackModeOpen && (
        <div className="chat-back-banner" aria-hidden="true">
          вы могли выбрать FRONT. вы выбрали это.
        </div>
      )}
      <div className="chats-page__body">
      <ChatIconRail
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => {
          setAccountSettingsOpen(true);
          setIsSpecialFavoritesOpen(false);
          setIsBackModeOpen(false);
        }}
        settingsActive={accountSettingsOpen}
        specialMode={isSpecialFavoritesOpen}
        backMode={isBackModeOpen}
      />
      {accountSettingsOpen ? (
        <AccountSettings
          user={user}
          onUserUpdated={updateUser}
          onClose={() => setAccountSettingsOpen(false)}
        />
      ) : (
        <>
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <h2>{sidebarTitle}</h2>
          <div className="sidebar-header-actions">
            <NotificationBell
              open={notifOpen}
              onToggle={() => setNotifOpen((v) => !v)}
              unreadCount={unreadCount}
              items={notifications}
              onAccept={handleAcceptInvite}
              onDecline={handleDeclineInvite}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onClearAll={clearAll}
            />
          </div>
        </div>
        <ChatFilters
          active={chatFilter}
          onChange={setChatFilter}
          unreadCount={unreadChatCount}
          specialMode={isSpecialFavoritesOpen}
          backMode={isBackModeOpen}
        />
        <div className="search-box">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((u) => (
                <UserSearchResult
                  key={u.id}
                  user={u}
                  onSelect={startChat}
                  isOnline={isOnline(u.id, u.is_online)}
                />
              ))}
            </ul>
          )}
        </div>
        <ul className="chat-list">
          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              active={selectedChat?.id === chat.id}
              onSelect={handleSelectChat}
              isOnline={isOnline(chat.partner?.id, chat.partner?.is_online)}
              ringing={
                callController.status === 'incoming'
                && String(callChatId) === String(chat.id)
              }
            />
          ))}
        </ul>
      </aside>

      <main className="chat-main">
        {selectedChat ? (
          <>
            <ChatHeader
              partner={selectedChat.partner}
              isOnline={isOnline(selectedChat.partner?.id, selectedChat.partner?.is_online)}
              lastSeenAt={getLastSeen(
                selectedChat.partner?.id,
                selectedChat.partner?.last_seen_at
              )}
              onInvitePrivate={handleInvitePrivate}
              privateBusy={privateBusy || invitePending || Boolean(privateSessionId)}
              onOpenDetails={() => setDetailsPanelOpen(true)}
              onStartCall={handleStartCall}
              callDisabled={!selectedChat?.partner || !['idle', 'ended'].includes(callController.status)}
            />
            {invitePending && !privateSessionId && (
              <div className="private-invite-banner">
                <span>Приглашение отправлено — ожидание ответа…</span>
                <button
                  type="button"
                  className="btn-text"
                  onClick={handleCancelOutgoingInvite}
                >
                  Отменить
                </button>
              </div>
            )}
            <>
            <div
              ref={messagesAreaRef}
              className="messages-area"
              onScroll={handleMessagesScroll}
            >
              {loadingOlderMessages && (
                <div className="messages-history-loading">Загрузка истории…</div>
              )}
              {groupMessagesByDay(messages).map((group) => (
                <div key={group.key} className="message-day-group">
                  <div className="message-day-separator">
                    <span>{group.label}</span>
                  </div>
                  {group.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.sender?.id === user?.id}
                      onDelete={handleDeleteMessage}
                      onEdit={handleEditMessage}
                      chatId={selectedChat.id}
                      specialMode={isSpecialFavoritesOpen}
                      backMode={isBackModeOpen}
                      reactions={messageReactions[msg.id] || []}
                      onToggleReaction={handleToggleReaction}
                      highlighted={String(highlightedMessageId) === String(msg.id)}
                    />
                  ))}
                </div>
              ))}
              {partnerTyping && (
                <div className="typing-indicator">
                  @{selectedChat.partner?.nickname} печатает...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {pendingAttachments.length > 0 && !codeMode && (
              <div className="attachment-preview-list">
                {pendingAttachments.map((item) => (
                  <div key={item.id} className="attachment-preview-item">
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="attachment-preview-image"
                      />
                    ) : (
                      <span className="attachment-preview-file" title={item.file.name}>
                        📎 {item.file.name}
                      </span>
                    )}
                    <button
                      type="button"
                      className="attachment-remove"
                      onClick={() => removePendingAttachment(item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <span className="attachment-count">
                  {pendingAttachments.length}/{MAX_ATTACHMENTS}
                </span>
              </div>
            )}
            {attachError && <div className="attachment-error">{attachError}</div>}
            <form
              className={[
                'message-input',
                codeMode ? 'code-mode' : '',
                isSpecialFavoritesOpen ? 'message-input--special' : '',
                isBackModeOpen ? 'message-input--back' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onSubmit={handleSend}
            >
              {isSpecialFavoritesOpen && !codeMode && (
                <div className="message-input-formatbar" aria-hidden="true">
                  <span className="message-input-formatbar__btn">B</span>
                  <span className="message-input-formatbar__btn">I</span>
                  <span className="message-input-formatbar__btn">S</span>
                  <span className="message-input-formatbar__btn message-input-formatbar__code">{'</>'}</span>
                  <span className="message-input-formatbar__btn">🔗</span>
                  <span className="message-input-formatbar__btn">≡</span>
                </div>
              )}
              {isBackModeOpen && !codeMode && (
                <div className="message-input-formatbar message-input-formatbar--back" aria-hidden="true">
                  <span className="message-input-formatbar__btn">…</span>
                  <span className="message-input-formatbar__btn">†</span>
                  <span className="message-input-formatbar__btn">∴</span>
                  <span className="message-input-formatbar__btn">ø</span>
                </div>
              )}
              {voiceRecording && (
                <div className="voice-record-bar" role="status" aria-live="polite">
                  <button
                    type="button"
                    className="voice-record-cancel"
                    onClick={cancelVoiceRecording}
                    title="Отменить запись"
                    aria-label="Отменить запись"
                    disabled={voiceBusy}
                  >
                    <span className="voice-record-cancel__square" />
                  </button>
                  <div className="voice-record-live">
                    <span className="voice-record-dot" />
                    <span className="voice-record-timer">{formatVoiceClock(voiceElapsedMs)}</span>
                    <div className="voice-record-waveform" aria-hidden="true">
                      {(voiceLiveWaveform.length ? voiceLiveWaveform : Array(16).fill(0.2)).map((level, index) => (
                        <span
                          key={`voice-bar-${index}`}
                          style={{ height: `${18 + level * 18}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="voice-record-send"
                    onClick={sendVoiceRecording}
                    title="Отправить голосовое"
                    aria-label="Отправить голосовое"
                    disabled={voiceBusy || voiceElapsedMs < 400}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="message-input-row">
                <div className="message-input-toolbar">
                  <button
                    type="button"
                    className="btn-attach"
                    onClick={() => fileInputRef.current?.click()}
                    title="Прикрепить файлы (до 10, до 300 МБ)"
                    aria-label="Прикрепить файлы"
                    disabled={codeMode || voiceRecording || pendingAttachments.length >= MAX_ATTACHMENTS || uploading}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path
                        d="M16 8v8a4 4 0 0 1-8 0V7a3 3 0 0 1 6 0v9a2 2 0 0 1-4 0V8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`btn-code-mode ${codeMode ? 'active' : ''}`}
                    onClick={toggleCodeMode}
                    title={codeMode ? 'Обычное сообщение' : 'Написать код'}
                    aria-label={codeMode ? 'Обычное сообщение' : 'Написать код'}
                    disabled={uploading || voiceRecording}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M8 6L2 12l6 6M16 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {!codeMode && (
                    <div
                      className="message-input-toolbar-emoji-wrap"
                      onMouseEnter={handleEmojiZoneEnter}
                      onMouseLeave={handleEmojiZoneLeave}
                    >
                      <button
                        type="button"
                        className="btn-emoji"
                        title="Эмодзи"
                        aria-label="Эмодзи"
                        disabled={uploading || voiceRecording}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
                          <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" />
                          <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" />
                        </svg>
                      </button>
                      <EmojiPicker
                        visible={emojiPickerVisible}
                        specialMode={isSpecialFavoritesOpen}
                        backMode={isBackModeOpen}
                        onSelect={handleEmojiSelect}
                      />
                    </div>
                  )}
                  {!codeMode && (
                    <button
                      type="button"
                      className={`btn-voice ${voiceRecording ? 'active' : ''}`}
                      title={micAvailable ? 'Зажмите, чтобы записать голосовое' : 'Микрофон недоступен'}
                      aria-label={micAvailable ? 'Записать голосовое' : 'Микрофон недоступен'}
                      disabled={!micAvailable || uploading || voiceBusy}
                      onPointerDown={startVoiceRecording}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                        <rect x="9" y="3" width="6" height="11" rx="3" />
                        <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
                        <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
                        <line x1="9" y1="21" x2="15" y2="21" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden-file-input"
                    accept="image/*,.pdf,.doc,.docx,.txt,.py,.js"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
                <div className="message-input-main">
                  {codeMode ? (
                    <>
                      <CodeEditorInput
                        value={input}
                        language={codeLanguage || 'python'}
                        onChange={handleInputChange}
                        onSubmit={handleSendCode}
                      />
                      <div className="code-meta">
                        <label className="code-meta-field">
                          <span>Язык</span>
                          <select
                            value={codeLanguage}
                            onChange={(e) => handleCodeLanguageChange(e.target.value)}
                            required
                          >
                            <option value="" disabled>
                              Выберите язык
                            </option>
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                          </select>
                        </label>
                        <label className="code-meta-field code-meta-filename">
                          <span>Имя файла</span>
                          <input
                            type="text"
                            value={codeFileName}
                            onChange={(e) => setCodeFileName(e.target.value)}
                            placeholder={codeLanguage === 'javascript' ? 'script.js' : 'script.py'}
                            required
                          />
                        </label>
                        <span className="code-meta-hint">Ctrl+Enter — отправить</span>
                      </div>
                    </>
                  ) : (
                    <textarea
                      ref={messageInputRef}
                      className="message-input-textarea"
                      rows={1}
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onPaste={handlePasteFiles}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      onBlur={stopTyping}
                      disabled={voiceRecording}
                      placeholder={inputPlaceholder}
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={
                    uploading
                    || voiceRecording
                    || (codeMode
                      ? !input.trim() || !codeLanguage || !codeFileName.trim()
                      : !input.trim() && pendingAttachments.length === 0)
                  }
                >
                  {uploading ? '...' : sendLabel}
                </button>
              </div>
            </form>
            </>
          </>
        ) : (
          <div className="chat-empty">
            <p>{emptyLabel}</p>
          </div>
        )}
      </main>
      {callScreenVisible ? (
        <CallScreen
          partner={callController.partner}
          status={callController.status}
          elapsedSeconds={callController.elapsedSeconds}
          muted={callController.muted}
          speakerMuted={callController.speakerMuted}
          error={callController.error}
          remoteAudioRef={callController.remoteAudioRef}
          onToggleMute={callController.toggleMute}
          onToggleSpeakerMute={callController.toggleSpeakerMute}
          onEnd={
            callController.status === 'outgoing'
              ? callController.cancelCall
              : callController.hangup
          }
          specialMode={isSpecialFavoritesOpen}
        />
      ) : (
        detailsPanelOpen && selectedChat && (
          <ChatDetailsPanel
            chatId={selectedChat.id}
            partner={selectedChat.partner}
            isOnline={isOnline(selectedChat.partner?.id, selectedChat.partner?.is_online)}
            onClose={() => setDetailsPanelOpen(false)}
            specialMode={isSpecialFavoritesOpen}
            backMode={isBackModeOpen}
            onJumpToMessage={jumpToMessage}
          />
        )
      )}
      {privateSessionId && (
        <PrivatePanel
          sessionId={privateSessionId}
          partnerNickname={selectedChat?.partner?.nickname}
          onClose={() => {
            setPrivateSessionId(null);
            setInvitePending(false);
          }}
        />
      )}
        </>
      )}
      </div>
    </div>
  );
}
