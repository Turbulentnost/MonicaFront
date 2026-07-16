import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChatHeader } from '../components/Chat/ChatHeader';
import { ChatListItem } from '../components/Chat/ChatListItem';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { UserSearchResult } from '../components/Chat/UserSearchResult';
import { warmAvatarCache } from '../utils/avatarCache';
import { invalidateMediaCache, warmMediaCache } from '../utils/mediaCache';

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
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
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

  const clearPendingFile = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingPreview]);

  const handleSelectChat = async (chat) => {
    clearPendingFile();
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

  const { connected, sendMessage, sendTyping } = useWebSocket(selectedChat?.id, {
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onDeleted: handleMessageDeleted,
  });

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

    if (pendingFile) {
      setUploading(true);
      try {
        const { data } = await chatsApi.uploadMessageFile(selectedChat.id, pendingFile);
        sendMessage(data.path, data.message_type, {
          file_name: data.file_name,
          mime_type: data.mime_type,
          file_size: data.file_size,
        });
        if (data.message_type === 'photo' && data.path && data.content_url) {
          warmMediaCache(data.path, data.content_url);
        }
        clearPendingFile();
      } catch {
        // ошибка загрузки — оставляем вложение
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!input.trim()) return;
    stopTyping();
    sendMessage(input.trim());
    setInput('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview(null);
    }
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
                <UserSearchResult key={u.id} user={u} onSelect={startChat} />
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
            />
          ))}
        </ul>
      </aside>

      <main className="chat-main">
        {selectedChat ? (
          <>
            <ChatHeader partner={selectedChat.partner} connected={connected} />
            <div className="messages-area">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender?.id === user?.id}
                  onDelete={handleDeleteMessage}
                />
              ))}
              {partnerTyping && (
                <div className="typing-indicator">
                  @{selectedChat.partner?.nickname} печатает...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {pendingFile && (
              <div className="attachment-preview">
                {pendingPreview ? (
                  <img src={pendingPreview} alt="Превью" className="attachment-preview-image" />
                ) : (
                  <span className="attachment-preview-file">📎 {pendingFile.name}</span>
                )}
                <button type="button" className="attachment-remove" onClick={clearPendingFile}>
                  ×
                </button>
              </div>
            )}
            <form className="message-input" onSubmit={handleSend}>
              <div className="message-input-toolbar">
                <button
                  type="button"
                  className="btn-attach"
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файл"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden-file-input"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={stopTyping}
                placeholder="Сообщение..."
                disabled={Boolean(pendingFile)}
              />
              <button type="submit" disabled={uploading || (!input.trim() && !pendingFile)}>
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
