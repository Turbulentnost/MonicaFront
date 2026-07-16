import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageMedia } from './MessageMedia';
import { EmojiPicker } from './EmojiPicker';

const DELETE_FOR_ALL_MS = 48 * 60 * 60 * 1000;
const HOVER_HIDE_DELAY_MS = 280;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 2.5v9M2.5 7h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function canDeleteForEveryone(message, isOwn) {
  if (!isOwn || !message?.sent_at) return false;
  if (String(message.id).startsWith('temp-')) return false;
  return Date.now() - new Date(message.sent_at).getTime() < DELETE_FOR_ALL_MS;
}

function getDeliveryStatus(message, isOwn) {
  if (!isOwn) return null;
  if (message.client_status === 'sending' || String(message.id).startsWith('temp-')) {
    return { key: 'sending', label: 'отправляется' };
  }
  if (message.read_at) {
    return { key: 'read', label: 'прочитано' };
  }
  return { key: 'sent', label: 'отправлено' };
}

export function MessageBubble({
  message,
  isOwn,
  onDelete,
  chatId,
  specialMode = false,
  reactions = [],
  onToggleReaction,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [pickerExpanded, setPickerExpanded] = useState(false);
  const hideTimeoutRef = useRef(null);

  const showDeleteForAll = canDeleteForEveryone(message, isOwn);
  const delivery = getDeliveryStatus(message, isOwn);
  const isPending = delivery?.key === 'sending';
  const showReactionUi = !isPending;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setBarVisible(false);
      setPickerExpanded(false);
    }, HOVER_HIDE_DELAY_MS);
  }, [clearHideTimeout]);

  const handleMouseEnter = () => {
    if (!showReactionUi) return;
    clearHideTimeout();
    setBarVisible(true);
  };

  const handleMouseLeave = () => {
    if (!showReactionUi) return;
    scheduleHide();
  };

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

  const handleDelete = (scope) => {
    setMenuOpen(false);
    onDelete?.(message.id, scope);
  };

  const handleReactionClick = (emoji) => {
    onToggleReaction?.(message.id, emoji);
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    clearHideTimeout();
    setPickerExpanded((v) => !v);
    setBarVisible(true);
  };

  const renderContent = () => {
    if (message.message_type === 'text') {
      return <div className="message-content">{message.content}</div>;
    }
    if (message.message_type === 'photo' || message.message_type === 'file') {
      return <MessageMedia message={message} chatId={chatId} />;
    }
    return (
      <div className="message-content">
        [{message.message_type}] {message.content}
      </div>
    );
  };

  const reactionBarClass = [
    'message-reaction-bar',
    isOwn ? 'message-reaction-bar--own' : 'message-reaction-bar--other',
    specialMode ? 'message-reaction-bar--special' : '',
    barVisible || pickerExpanded ? 'is-visible' : '',
    pickerExpanded ? 'is-expanded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const reactionsClass = [
    'message-reactions',
    isOwn ? 'message-reactions--own' : 'message-reactions--other',
    specialMode ? 'message-reactions--special' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`message-wrapper ${isOwn ? 'own' : 'other'}${reactions.length ? ' has-reactions' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`message ${isOwn ? 'own' : 'other'}${isPending ? ' pending' : ''}`}>
        <div className="message-header">
          <div className="message-meta">{message.sender?.nickname}</div>
          {!isPending && (
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
          )}
        </div>
        {renderContent()}
        <div className="message-footer">
          <span className="message-time">
            {new Date(message.sent_at).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {delivery && (
            <span className={`message-status message-status-${delivery.key}`} title={delivery.label}>
              {delivery.key === 'sending' && '⏳'}
              {delivery.key === 'sent' && '✓'}
              {delivery.key === 'read' && '✓✓'}
              <span className="message-status-label">{delivery.label}</span>
            </span>
          )}
        </div>
      </div>

      {showReactionUi && (barVisible || pickerExpanded) && (
        <div
          className={reactionBarClass}
          role="toolbar"
          aria-label="Реакции на сообщение"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="message-reaction-bar__row">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="message-reaction-bar__emoji"
                onClick={() => handleReactionClick(emoji)}
                aria-label={`Реакция ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="message-reaction-bar__expand"
              onClick={handleExpandClick}
              aria-label={pickerExpanded ? 'Скрыть эмодзи' : 'Больше эмодзи'}
              aria-expanded={pickerExpanded}
            >
              <span className="message-reaction-bar__expand-icon" aria-hidden="true">
                😊
              </span>
              <PlusIcon />
            </button>
          </div>
          {pickerExpanded && (
            <div
              className="message-reaction-bar__picker"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <EmojiPicker
                visible={pickerExpanded}
                specialMode={specialMode}
                onSelect={handleReactionClick}
                className="emoji-picker--reaction"
              />
            </div>
          )}
        </div>
      )}

      {reactions.length > 0 && (
        <div className={reactionsClass}>
          {reactions.map(({ emoji, count, reactedByMe }) => (
            <button
              key={emoji}
              type="button"
              className={`message-reaction-chip${reactedByMe ? ' message-reaction-chip--mine' : ''}`}
              onClick={() => handleReactionClick(emoji)}
              aria-label={`${emoji}, ${count}${reactedByMe ? ', ваша реакция' : ''}`}
              aria-pressed={reactedByMe}
            >
              <span className="message-reaction-chip__emoji">{emoji}</span>
              {count > 1 && <span className="message-reaction-chip__count">{count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
