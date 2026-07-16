import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePresence } from '../hooks/usePresence';
import { ChatHeader } from '../components/Chat/ChatHeader';
import { ChatListItem } from '../components/Chat/ChatListItem';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { UserSearchResult } from '../components/Chat/UserSearchResult';
import { warmAvatarCache } from '../utils/avatarCache';
import { invalidateMediaCache, warmMediaCache } from '../utils/mediaCache';

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;

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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const { sendMessage, sendTyping } = useWebSocket(selectedChat?.id, {
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onDeleted: handleMessageDeleted,
  });

  const { isOnline } = usePresence(Boolean(user));

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedChat || uploading) return;

    const text = input.trim();
    const hasFiles = pendingAttachments.length > 0;
    if (!text && !hasFiles) return;

    stopTyping();

    if (text) {
      sendMessage(text);
      setInput('');
    }

    if (!hasFiles) return;

    setUploading(true);
    setAttachError('');
    try {
      const files = pendingAttachments.map((item) => item.file);
      const { data } = await chatsApi.uploadMessageFiles(selectedChat.id, files);
      const uploaded = data.files || [];
      uploaded.forEach((item) => {
        sendMessage(item.path, item.message_type, {
          file_name: item.file_name,
          mime_type: item.mime_type,
          file_size: item.file_size,
        });
        if (item.message_type === 'photo' && item.path && item.content_url) {
          warmMediaCache(item.path, item.content_url);
        }
      });
      clearPendingAttachments();
    } catch (err) {
      setAttachError(err.response?.data?.detail || 'Не удалось загрузить файлы');
    } finally {
      setUploading(false);
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

  const handleLogout = () => {
    stopTyping();
    logout();
    navigate('/login');
  };

  return (
    <div className="chats-page">
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Monica</h2>
          <button type="button" onClick={handleLogout} className="btn-text">
            Выйти
          </button>
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
            />
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
            {pendingAttachments.length > 0 && (
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
            <form className="message-input" onSubmit={handleSend}>
              <div className="message-input-toolbar">
                <button
                  type="button"
                  className="btn-attach"
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файлы (до 10, до 300 МБ)"
                  disabled={pendingAttachments.length >= MAX_ATTACHMENTS || uploading}
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden-file-input"
                  accept="image/*,.pdf,.doc,.docx,.txt,.py"
                  multiple
                  onChange={handleFileChange}
                />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={stopTyping}
                placeholder="Сообщение..."
              />
              <button
                type="submit"
                disabled={uploading || (!input.trim() && pendingAttachments.length === 0)}
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
    </div>
  );
}
