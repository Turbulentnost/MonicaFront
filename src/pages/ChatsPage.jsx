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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);
  const searchDebounceRef = useRef(null);

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
  }, []);

  const handleSelectChat = async (chat) => {
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    stopTyping();
    sendMessage(input.trim());
    setInput('');
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
                />
              ))}
              {partnerTyping && (
                <div className="typing-indicator">
                  @{selectedChat.partner?.nickname} печатает...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-input" onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={stopTyping}
                placeholder="Сообщение..."
              />
              <button type="submit">Отправить</button>
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
