import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageMedia } from './MessageMedia';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { EmojiPicker } from './EmojiPicker';
import { getEditableMessageText, getPhotoCaption } from '../../utils/messageText';

const DELETE_FOR_ALL_MS = 48 * 60 * 60 * 1000;
const EDIT_FOR_MS = 7 * 24 * 60 * 60 * 1000;
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

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M8.6 2.85a1.2 1.2 0 0 1 1.7 0l.85.85a1.2 1.2 0 0 1 0 1.7L5.2 11.35 2.5 12l.65-2.7L8.6 2.85Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M7.7 3.75 10.25 6.3"
        stroke="currentColor"
        strokeWidth="1.3"
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

function canEditMessage(message, isOwn) {
  if (!isOwn || !message?.sent_at) return false;
  if (String(message.id).startsWith('temp-')) return false;
  if (message.message_type !== 'text' && message.message_type !== 'photo') return false;
  return Date.now() - new Date(message.sent_at).getTime() < EDIT_FOR_MS;
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

function DeliveryIcon({ status }) {
  if (status === 'sending') return <span aria-hidden="true">⏳</span>;

  return (
    <svg
      className="message-status-checks"
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      {status === 'sent' ? (
        <path
          d="M3 6.5 6 9.5 14.5 1.5"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M1 6.5 4 9.5 12.5 1.5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 8.5 8 9.5 16.5 1.5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

function EditedMark({ show }) {
  if (!show) return null;
  return <span className="message-edited">(ред.)</span>;
}

export function MessageBubble({
  message,
  isOwn,
  onDelete,
  onEdit,
  chatId,
  specialMode = false,
  reactions = [],
  onToggleReaction,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [pickerExpanded, setPickerExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const hideTimeoutRef = useRef(null);
  const editInputRef = useRef(null);

  const showDeleteForAll = canDeleteForEveryone(message, isOwn);
  const showEdit = canEditMessage(message, isOwn);
  const delivery = getDeliveryStatus(message, isOwn);
  const isPending = delivery?.key === 'sending';
  const showReactionUi = !isPending && !editing;
  const isEdited = Boolean(message.edited_at);
  const photoCaption = getPhotoCaption(message);

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

  useEffect(() => {
    if (!editing) return undefined;
    editInputRef.current?.focus();
    const el = editInputRef.current;
    if (el) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
    return undefined;
  }, [editing]);

  const handleDelete = (scope) => {
    setMenuOpen(false);
    onDelete?.(message.id, scope);
  };

  const startEdit = () => {
    setMenuOpen(false);
    setEditText(getEditableMessageText(message));
    setEditing(true);
    setBarVisible(false);
    setPickerExpanded(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditText('');
  };

  const saveEdit = () => {
    const next = editText.trim();
    if (message.message_type === 'text' && !next) return;
    if (next === getEditableMessageText(message).trim()) {
      cancelEdit();
      return;
    }
    const ok = onEdit?.(message.id, next);
    if (ok !== false) {
      cancelEdit();
    }
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
    if (editing) {
      return (
        <div className="message-edit">
          <textarea
            ref={editInputRef}
            className="message-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={Math.min(6, Math.max(2, editText.split('\n').length))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
            }}
          />
          <div className="message-edit-actions">
            <button type="button" className="message-edit-cancel" onClick={cancelEdit}>
              Отмена
            </button>
            <button
              type="button"
              className="message-edit-save"
              onClick={saveEdit}
              disabled={message.message_type === 'text' && !editText.trim()}
            >
              Сохранить
            </button>
          </div>
        </div>
      );
    }

    if (message.message_type === 'text') {
      return (
        <div className="message-content">
          {message.content}
          <EditedMark show={isEdited} />
        </div>
      );
    }
    if (message.message_type === 'photo') {
      return (
        <>
          <MessageMedia message={message} chatId={chatId} />
          {photoCaption ? (
            <div className="message-content message-caption">
              {photoCaption}
              <EditedMark show={isEdited} />
            </div>
          ) : null}
        </>
      );
    }
    if (message.message_type === 'file') {
      return <MessageMedia message={message} chatId={chatId} />;
    }
    if (message.message_type === 'voice') {
      return <VoiceMessagePlayer message={message} />;
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
          {!isPending && !editing && (
            <div className={`message-actions${menuOpen ? ' is-open' : ''}`}>
              {showEdit && (
                <button
                  type="button"
                  className="message-action-btn message-edit-btn"
                  onClick={startEdit}
                  aria-label="Редактировать"
                  title="Редактировать"
                >
                  <PencilIcon />
                </button>
              )}
              <button
                type="button"
                className="message-action-btn message-menu-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Удалить сообщение"
                title="Удалить"
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
            <span
              className={`message-status message-status-${delivery.key}`}
              title={delivery.label}
              aria-label={delivery.label}
            >
              <DeliveryIcon status={delivery.key} />
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
