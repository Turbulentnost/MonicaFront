import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

function MessageBubble({ message, isOwn }) {
  const content =
    message.message_type === 'text'
      ? message.content
      : `[${message.message_type}] ${message.content}`;

  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-meta">{message.sender?.nickname}</div>
      <div className="message-content">{content}</div>
      <div className="message-time">
        {new Date(message.sent_at).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
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
  const messagesEndRef = useRef(null);

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
    await loadMessages(chat.id);
  };

  const handleNewMessage = useCallback(
    (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      loadChats();
    },
    [loadChats]
  );

  const { connected, sendMessage } = useWebSocket(selectedChat?.id, handleNewMessage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await chatsApi.searchUsers(q);
    setSearchResults(data);
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
            placeholder="Поиск по никнейму..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => startChat(u.id)}>
                    {u.nickname} ({u.first_name} {u.last_name})
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ul className="chat-list">
          {chats.map((chat) => (
            <li
              key={chat.id}
              className={selectedChat?.id === chat.id ? 'active' : ''}
            >
              <button type="button" onClick={() => handleSelectChat(chat)}>
                <div className="chat-item-name">{chat.partner?.nickname}</div>
                <div className="chat-item-preview">
                  {chat.last_message?.content || 'Нет сообщений'}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <h3>{selectedChat.partner?.nickname}</h3>
              <span className={`ws-status ${connected ? 'online' : 'offline'}`}>
                {connected ? 'online' : 'offline'}
              </span>
            </div>
            <div className="messages-area">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender?.id === user?.id}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-input" onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
