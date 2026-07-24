import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageMedia } from './MessageMedia';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { EmojiPicker } from './EmojiPicker';
import { ForwardedBundle } from './ForwardedBundle';
import { getEditableMessageText, getPhotoCaption } from '../../utils/messageText';
import {
  claimReactionBar,
  releaseReactionBar,
  subscribeReactionBar,
} from '../../utils/reactionBarHover';

const DELETE_FOR_ALL_MS = 48 * 60 * 60 * 1000;
const EDIT_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];
const BACK_QUICK_REACTIONS = ['🥀', '💀', '😭', '🖤', '😞', '💔'];

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 2.5v9M2.5 7h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 3.5 2.5 7l4 3.5"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 7h6.2c2.4 0 4.3 1.7 4.3 4v1"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
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
      viewBox="0 0 16 10"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      {status === 'sent' ? (
        <path
          d="M1.5 5.2 4.2 7.6 11.5 2"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M1 5.2 3.6 7.6 9.8 2"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.8 5.2 8.2 7.6 14.5 2"
            strokeWidth="1.3"
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

function CallHistoryIcon({ video = false }) {
  if (video) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="7" width="13" height="10" rx="2" />
        <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M7 4.5 4.8 6.7c-.8.8.5 4.5 3.6 7.6s6.8 4.4 7.6 3.6l2.2-2.2-4-2-1.4 1.4c-1.7-.8-3.5-2.6-4.3-4.3l1.4-1.4-2.9-4.9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CallHistoryBubble({ message, highlighted = false }) {
  const meta = Array.isArray(message.attachments) ? message.attachments[0] : null;
  const isVideo = meta?.media_mode === 'video'
    || /видео/i.test(message.content || '');
  const status = meta?.status || message.mime_type || '';
  return (
    <div
      className={[
        'message-wrapper',
        'message-wrapper--call',
        highlighted ? 'is-highlighted' : '',
      ].filter(Boolean).join(' ')}
      data-message-id={message.id}
    >
      <div className={`message message--call message--call-${status || 'ended'}`}>
        <span className="message-call-icon" aria-hidden="true">
          <CallHistoryIcon video={isVideo} />
        </span>
        <span className="message-call-text">{message.content}</span>
        <span className="message-call-time">
          {new Date(message.sent_at).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export function MessageBubble(props) {
  if (props.message?.message_type === 'call') {
    return (
      <CallHistoryBubble
        message={props.message}
        highlighted={props.highlighted}
      />
    );
  }
  return <ChatMessageBubble {...props} />;
}

function ChatMessageBubble({
  message,
  isOwn,
  onDelete,
  onEdit,
  chatId,
  specialMode = false,
  backMode = false,
  reactions = [],
  onToggleReaction,
  highlighted = false,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onQuickForward,
  onReply,
  onJumpToReply,
  onOpenOriginal,
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [barOpen, setBarOpen] = useState(false);
  const [pickerExpanded, setPickerExpanded] = useState(false);
  /** above = над сообщением, below = под ним (для верхних сообщений) */
  const [reactionSide, setReactionSide] = useState('above');
  /** up = пикер раскрывается вверх, down = вниз */
  const [pickerSide, setPickerSide] = useState('up');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const wrapperRef = useRef(null);
  const editInputRef = useRef(null);

  const showDeleteForAll = canDeleteForEveryone(message, isOwn);
  const showEdit = canEditMessage(message, isOwn);
  const delivery = getDeliveryStatus(message, isOwn);
  const isPending = delivery?.key === 'sending';
  const showReactionUi = !isPending && !editing && !selectionMode;
  const canInteract = !isPending && !editing;
  const isEdited = Boolean(message.edited_at);
  const photoCaption = getPhotoCaption(message);
  const selectable = !isPending && message.message_type !== 'call' && !String(message.id).startsWith('temp-');
  const showSelectControl = selectable && Boolean(onToggleSelect);

  const closeReactions = useCallback(() => {
    releaseReactionBar(message.id);
    setBarOpen(false);
    setPickerExpanded(false);
  }, [message.id]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const updateReactionLayout = useCallback((expanded = pickerExpanded) => {
    const node = wrapperRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const area = node.closest('.messages-area');
    const areaRect = area?.getBoundingClientRect();
    const topBound = areaRect?.top ?? 0;
    const bottomBound = areaRect?.bottom ?? window.innerHeight;
    const spaceAbove = rect.top - topBound;
    const spaceBelow = bottomBound - rect.bottom;

    // Мало места сверху (сообщение у края) — реакция снизу с отступом
    const side = spaceAbove < 64 ? 'below' : 'above';
    setReactionSide(side);

    // Пикер: вверх по умолчанию, вниз если сверху не помещается
    const pickerNeed = expanded ? 280 : 72;
    if (side === 'above') {
      setPickerSide(spaceAbove >= pickerNeed ? 'up' : 'down');
    } else {
      setPickerSide(spaceBelow >= pickerNeed ? 'down' : 'up');
    }
  }, [pickerExpanded]);

  useEffect(() => () => {
    releaseReactionBar(message.id);
  }, [message.id]);

  useEffect(() => {
    return subscribeReactionBar((activeId) => {
      if (activeId === message.id) {
        setBarOpen(true);
        return;
      }
      setBarOpen(false);
      setPickerExpanded(false);
    });
  }, [message.id]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;
    const onEnter = () => updateReactionLayout(false);
    node.addEventListener('mouseenter', onEnter);
    return () => node.removeEventListener('mouseenter', onEnter);
  }, [updateReactionLayout]);

  useEffect(() => {
    if (!barOpen) return undefined;
    updateReactionLayout(pickerExpanded);
    const onScrollOrResize = () => updateReactionLayout(pickerExpanded);
    window.addEventListener('resize', onScrollOrResize);
    const area = wrapperRef.current?.closest('.messages-area');
    area?.addEventListener('scroll', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      area?.removeEventListener('scroll', onScrollOrResize);
    };
  }, [barOpen, pickerExpanded, updateReactionLayout]);

  useEffect(() => {
    if (!barOpen && !contextMenu) return undefined;

    const onPointerDown = (event) => {
      if (wrapperRef.current?.contains(event.target)) return;
      closeReactions();
      closeContextMenu();
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      closeReactions();
      closeContextMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [barOpen, contextMenu, closeReactions, closeContextMenu]);

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
    closeContextMenu();
    onDelete?.(message.id, scope);
  };

  const startEdit = () => {
    closeContextMenu();
    setEditText(getEditableMessageText(message));
    setEditing(true);
    closeReactions();
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

  const handleReactionPick = (emoji) => {
    onToggleReaction?.(message.id, emoji);
    closeReactions();
  };

  const handleReactionChipClick = (emoji) => {
    onToggleReaction?.(message.id, emoji);
  };

  const openReactions = (event) => {
    event?.stopPropagation?.();
    closeContextMenu();
    if (barOpen && event?.type === 'click') {
      // Повторный клик по триггеру закрывает; hover только открывает
      closeReactions();
      return;
    }
    if (barOpen) return;
    updateReactionLayout(false);
    claimReactionBar(message.id);
    setBarOpen(true);
    setPickerExpanded(false);
  };

  const handleExpandClick = (event) => {
    event.stopPropagation();
    setPickerExpanded((value) => {
      const next = !value;
      updateReactionLayout(next);
      return next;
    });
    setBarOpen(true);
    claimReactionBar(message.id);
  };

  const handleContextMenu = (event) => {
    if (!canInteract || selectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    closeReactions();

    const menuWidth = 188;
    const menuHeight = 220;
    const pad = 8;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - pad);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - pad);
    setContextMenu({ x: Math.max(pad, x), y: Math.max(pad, y) });
  };

  const handleReply = (event) => {
    event?.stopPropagation?.();
    closeContextMenu();
    closeReactions();
    onReply?.(message);
  };

  const handleSelectFromMenu = () => {
    closeContextMenu();
    onToggleSelect?.(message);
  };

  const handleForwardFromMenu = () => {
    closeContextMenu();
    onQuickForward?.(message);
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
    if (message.message_type === 'forward') {
      return (
        <ForwardedBundle
          bundle={Array.isArray(message.forward_bundle) ? message.forward_bundle : []}
          comment={message.content}
          onOpenOriginal={onOpenOriginal}
        />
      );
    }
    return (
      <div className="message-content">
        [{message.message_type}] {message.content}
      </div>
    );
  };

  const reactionBarClass = [
    'message-reaction-bar',
    'is-docked',
    `is-${reactionSide}`,
    `picker-${pickerSide}`,
    isOwn ? 'message-reaction-bar--own' : 'message-reaction-bar--other',
    specialMode ? 'message-reaction-bar--special' : '',
    backMode ? 'message-reaction-bar--back' : '',
    barOpen ? 'is-visible' : '',
    pickerExpanded ? 'is-expanded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const reactionsClass = [
    'message-reactions',
    isOwn ? 'message-reactions--own' : 'message-reactions--other',
    specialMode ? 'message-reactions--special' : '',
    backMode ? 'message-reactions--back' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapperRef}
      className={[
        'message-wrapper',
        isOwn ? 'own' : 'other',
        reactions.length ? 'has-reactions' : '',
        highlighted ? 'is-highlighted' : '',
        selected ? 'is-selected' : '',
        selectionMode ? 'is-selection-mode' : '',
        barOpen ? 'is-reacting' : '',
        `reaction-side-${reactionSide}`,
      ].filter(Boolean).join(' ')}
      data-message-id={message.id}
      data-reaction-side={reactionSide}
      onClick={selectionMode && selectable ? () => onToggleSelect?.(message) : undefined}
      onContextMenu={handleContextMenu}
    >
      {showSelectControl && (
        <button
          type="button"
          className={`message-select-control${selected ? ' is-checked' : ''}`}
          aria-label={selected ? 'Снять выделение' : 'Выбрать сообщение'}
          aria-pressed={selected}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect?.(message);
          }}
        >
          {selected ? (
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path
                d="M2.2 6.1 4.8 8.6 9.8 3.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
      )}

      {canInteract && !selectionMode && onReply && (
        <button
          type="button"
          className="message-reply-action"
          title="Ответить"
          aria-label="Ответить на сообщение"
          onClick={handleReply}
        >
          <ReplyIcon />
        </button>
      )}

      <div className={`message ${isOwn ? 'own' : 'other'}${isPending ? ' pending' : ''}`}>
        <div className="message-header">
          <div className="message-meta">{message.sender?.nickname}</div>
        </div>
        {message.reply_to_summary && (
          <button
            type="button"
            className="message-reply-quote"
            onClick={(event) => {
              event.stopPropagation();
              onJumpToReply?.(message.reply_to_summary.id);
            }}
          >
            <strong>@{message.reply_to_summary.sender?.nickname || 'user'}</strong>
            <span>{message.reply_to_summary.preview || 'Сообщение'}</span>
          </button>
        )}
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

      {showReactionUi && (
        <>
          {/* Невидимый мост через зазор — иначе hover сбрасывается по пути к реакции */}
          <span
            className={`message-react-hover-bridge is-${reactionSide}`}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`message-react-trigger is-${reactionSide}${barOpen ? ' is-open' : ''}`}
            title="Реакция"
            aria-label="Добавить реакцию"
            aria-expanded={barOpen}
            onClick={openReactions}
            onMouseEnter={openReactions}
          >
            <span className="message-react-trigger__emoji" aria-hidden="true">😊</span>
            <span className="message-react-trigger__plus" aria-hidden="true">
              <PlusIcon />
            </span>
          </button>
        </>
      )}

      {showReactionUi && barOpen && (
        <div
          className={reactionBarClass}
          role="toolbar"
          aria-label="Реакции на сообщение"
          onMouseEnter={() => updateReactionLayout(pickerExpanded)}
        >
          <div className="message-reaction-bar__row">
            {(backMode ? BACK_QUICK_REACTIONS : QUICK_REACTIONS).map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="message-reaction-bar__emoji"
                onClick={() => handleReactionPick(emoji)}
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
            <div className="message-reaction-bar__picker">
              <EmojiPicker
                visible={pickerExpanded}
                specialMode={specialMode}
                backMode={backMode}
                onSelect={handleReactionPick}
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
              onClick={() => handleReactionChipClick(emoji)}
              aria-label={`${emoji}, ${count}${reactedByMe ? ', ваша реакция' : ''}`}
              aria-pressed={reactedByMe}
            >
              <span className="message-reaction-chip__emoji">{emoji}</span>
              {count > 1 && <span className="message-reaction-chip__count">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="message-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {showEdit && (
            <button type="button" role="menuitem" onClick={startEdit}>
              Редактировать
            </button>
          )}
          {onReply && (
            <button type="button" role="menuitem" onClick={handleReply}>
              Ответить
            </button>
          )}
          <button type="button" role="menuitem" onClick={handleSelectFromMenu}>
            Выбрать
          </button>
          {onQuickForward && (
            <button type="button" role="menuitem" onClick={handleForwardFromMenu}>
              Переслать
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => handleDelete('me')}>
            Удалить у себя
          </button>
          {showDeleteForAll && (
            <button type="button" role="menuitem" onClick={() => handleDelete('everyone')}>
              Удалить у всех
            </button>
          )}
        </div>
      )}
    </div>
  );
}
