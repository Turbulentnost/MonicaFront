import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotifications, usePresence } from '../hooks/usePresence';
import { ChatHeader } from '../components/Chat/ChatHeader';
import { ChatListItem } from '../components/Chat/ChatListItem';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { NotificationBell } from '../components/Chat/NotificationBell';
import { CodeEditorInput } from '../components/Chat/CodeEditorInput';
import { PrivatePanel } from '../components/Chat/PrivatePanel';
import { UserSearchResult } from '../components/Chat/UserSearchResult';
import { warmAvatarCache } from '../utils/avatarCache';
import { invalidateMediaCache, warmMediaCache } from '../utils/mediaCache';

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;

function leavePrivateSessionsBestEffort() {
  const token = localStorage.getItem('access_token');
  if (!token) return;
  const base = (typeof window !== 'undefined' && window.location)
    ? (() => {
        try {
          const envUrl = process.env.REACT_APP_API_URL || 'http://localhost:5612';
          const url = new URL(envUrl);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            url.hostname = window.location.hostname;
          }
          return url.origin;
        } catch {
          return process.env.REACT_APP_API_URL || 'http://localhost:5612';
        }
      })()
    : (process.env.REACT_APP_API_URL || 'http://localhost:5612');

  try {
    // keepalive переживает закрытие вкладки; дублирует presence-disconnect
    fetch(`${base}/api/private/leave/`, {
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const fileInputRef = useRef(null);
  const codeTextareaRef = useRef(null);

  const loadChats = useCallback(async () => {
    const { data } = await chatsApi.list();
    setChats(data);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const loadMessages = useCallback(async (chatId) => {
    const { data } = await chatsApi.messages(chatId);
    setMessages(data);
    data.forEach((msg) => {
      if (msg.message_type === 'photo' && msg.content && msg.content_url) {
        warmMediaCache(msg.content, msg.content_url);
      }
    });
  }, []);

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
    setSelectedChat(chat);
    setPartnerTyping(false);
    setInput('');
    setCodeMode(false);
    setAttachError('');
    await loadMessages(chat.id);
  };

  const handleNewMessage = useCallback(
    (message) => {
      setPartnerTyping(false);
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.message_type === 'photo' && message.content && message.content_url) {
        warmMediaCache(message.content, message.content_url);
      }
      loadChats();
    },
    [loadChats]
  );

  const handleMessageDeleted = useCallback(
    (messageId) => {
      setMessages((prev) => {
        const removed = prev.find((m) => m.id === messageId);
        if (removed?.message_type === 'photo' && removed.content) {
          invalidateMediaCache(removed.content);
        }
        return prev.filter((m) => m.id !== messageId);
      });
      loadChats();
    },
    [loadChats]
  );

  const handleTyping = useCallback((data) => {
    if (data.user_id === user?.id) return;
    setPartnerTyping(Boolean(data.is_typing));
  }, [user?.id]);

  const { connected, sendMessage, sendTyping } = useWebSocket(selectedChat?.id, {
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onDeleted: handleMessageDeleted,
  });

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
    [chats, selectedChat?.id, loadMessages, clearPendingAttachments]
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

  const { isOnline, getLastSeen } = usePresence(Boolean(user), { onNotification: handleNotification });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

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

  const resizeCodeTextarea = useCallback(() => {
    const el = codeTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 96), 360)}px`;
  }, []);

  useEffect(() => {
    if (codeMode) {
      resizeCodeTextarea();
      codeTextareaRef.current?.focus();
    }
  }, [codeMode, resizeCodeTextarea]);

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

  const uploadAndSendFiles = async (files) => {
    const { data } = await chatsApi.uploadMessageFiles(selectedChat.id, files);
    const uploaded = data.files || [];
    let allSent = true;
    uploaded.forEach((item) => {
      const ok = sendMessage(item.path, item.message_type, {
        file_name: item.file_name,
        mime_type: item.mime_type,
        file_size: item.file_size,
      });
      if (!ok) allSent = false;
      if (item.message_type === 'photo' && item.path && item.content_url) {
        warmMediaCache(item.path, item.content_url);
      }
    });
    if (!allSent) {
      throw new Error('Файл загружен, но WebSocket отключился — обновите страницу');
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
      requestAnimationFrame(resizeCodeTextarea);
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

    if (text) {
      const ok = sendMessage(text);
      if (!ok) {
        setAttachError('Не удалось отправить сообщение');
        return;
      }
      setInput('');
    }

    if (!hasFiles) return;

    setUploading(true);
    try {
      await uploadAndSendFiles(pendingAttachments.map((item) => item.file));
      clearPendingAttachments();
    } catch (err) {
      setAttachError(err.response?.data?.detail || err.message || 'Не удалось загрузить файлы');
    } finally {
      setUploading(false);
    }
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendCode();
    }
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
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
          error = `«${file.name}» больше 300 МБ`;
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        });
      }
      setAttachError(error);
      return [...prev, ...accepted];
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMessage = async (messageId, scope) => {
    if (!selectedChat) return;
    try {
      await chatsApi.deleteMessage(selectedChat.id, messageId, scope);
      const removed = messages.find((m) => m.id === messageId);
      if (scope === 'everyone' && removed?.message_type === 'photo' && removed.content) {
        invalidateMediaCache(removed.content);
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      loadChats();
    } catch {
      // ignore
    }
  };

  const handleInputChange = (value) => {
    setInput(value);
    if (codeMode) {
      requestAnimationFrame(resizeCodeTextarea);
    }
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

  return (
    <div className={`chats-page ${privateSessionId ? 'with-private' : ''}`}>
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Monica</h2>
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
            <button type="button" onClick={handleLogout} className="btn-text">
              Выйти
            </button>
          </div>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Имя, фамилия, email или ник..."
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
          {chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              active={selectedChat?.id === chat.id}
              onSelect={handleSelectChat}
              isOnline={isOnline(chat.partner?.id, chat.partner?.is_online)}
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
            <div className="messages-area">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender?.id === user?.id}
                  onDelete={handleDeleteMessage}
                  chatId={selectedChat.id}
                />
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
              className={`message-input ${codeMode ? 'code-mode' : ''}`}
              onSubmit={handleSend}
            >
              <div className="message-input-toolbar">
                <button
                  type="button"
                  className="btn-attach"
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файлы (до 10, до 300 МБ)"
                  disabled={codeMode || pendingAttachments.length >= MAX_ATTACHMENTS || uploading}
                >
                  📎
                </button>
                <button
                  type="button"
                  className={`btn-code-mode ${codeMode ? 'active' : ''}`}
                  onClick={toggleCodeMode}
                  title={codeMode ? 'Обычное сообщение' : 'Написать код'}
                  disabled={uploading}
                >
                  {'</>'}
                </button>
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
                      ref={codeTextareaRef}
                      value={input}
                      language={codeLanguage || 'python'}
                      onChange={handleInputChange}
                      onKeyDown={handleCodeKeyDown}
                      onBlur={stopTyping}
                      placeholder="// Введите код… Enter — новая строка, Ctrl+Enter — отправить"
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
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={stopTyping}
                    placeholder="Сообщение..."
                  />
                )}
              </div>
              <button
                type="submit"
                disabled={
                  uploading
                  || (codeMode
                    ? !input.trim() || !codeLanguage || !codeFileName.trim()
                    : !input.trim() && pendingAttachments.length === 0)
                }
              >
                {uploading ? '...' : 'Отправить'}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <p>Выберите чат или найдите пользователя для начала диалога</p>
          </div>
        )}
      </main>
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
    </div>
  );
}
