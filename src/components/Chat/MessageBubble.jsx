import { useState } from 'react';
import { MessageMedia } from './MessageMedia';

const DELETE_FOR_ALL_MS = 48 * 60 * 60 * 1000;

function canDeleteForEveryone(message, isOwn) {
  if (!isOwn || !message?.sent_at) return false;
  return Date.now() - new Date(message.sent_at).getTime() < DELETE_FOR_ALL_MS;
}

export function MessageBubble({ message, isOwn, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showDeleteForAll = canDeleteForEveryone(message, isOwn);

  const handleDelete = (scope) => {
    setMenuOpen(false);
    onDelete?.(message.id, scope);
  };

  const renderContent = () => {
    if (message.message_type === 'text') {
      return <div className="message-content">{message.content}</div>;
    }
    if (message.message_type === 'photo' || message.message_type === 'file') {
      return <MessageMedia message={message} />;
    }
    return (
      <div className="message-content">
        [{message.message_type}] {message.content}
      </div>
    );
  };

  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-header">
        <div className="message-meta">{message.sender?.nickname}</div>
        <div className="message-actions">
          <button
            type="button"
            className="message-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Действия с сообщением"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="message-menu">
              <button type="button" onClick={() => handleDelete('me')}>
                Удалить у себя
              </button>
              {showDeleteForAll && (
                <button type="button" onClick={() => handleDelete('everyone')}>
                  Удалить у всех
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {renderContent()}
      <div className="message-time">
        {new Date(message.sent_at).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
