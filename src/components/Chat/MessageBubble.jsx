import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageMedia } from './MessageMedia';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { AppleEmoji, renderTextWithAppleEmoji } from './AppleEmoji';
import { EmojiPicker } from './EmojiPicker';
import { ForwardedBundle } from './ForwardedBundle';
import { LinkPreviewCard } from './LinkPreviewCard';
import { StickerView } from './StickerView';
import { getEditableMessageText, getPhotoCaption } from '../../utils/messageText';
import { linkifyText } from '../../utils/linkifyText';
import { canDeleteForEveryone, canEditMessage } from '../../utils/messageActions';
import { isStickerMessageContent, parseStickerMessage } from '../../utils/stickerPayload';
import { copyMessagePhoto, getMessagePhotoSource } from '../../utils/copyImage';
import {
  claimReactionBar,
  releaseReactionBar,
  subscribeReactionBar,
} from '../../utils/reactionBarHover';
import {
  ReplyActionIcon,
  ForwardActionIcon,
  EditActionIcon,
  CopyActionIcon,
  PinActionIcon,
  DeleteActionIcon,
} from './actionIcons';

const QUICK_REACTIONS = ['👍', '❤️', '👎', '🔥', '🥰', '👏', '😁'];
const BACK_QUICK_REACTIONS = ['🥀', '💀', '😭', '🖤', '😞', '💔'];
const POPOVER_PAD = 8;
const POPOVER_ESTIMATE = { width: 220, height: 320 };
const POPOVER_GAP = 6;

function isMessageOutsideArea(messageRect, areaRect) {
  return (
    messageRect.bottom < areaRect.top
    || messageRect.top > areaRect.bottom
    || messageRect.right < areaRect.left
    || messageRect.left > areaRect.right
  );
}

/** Place fixed popover relative to message, clamped inside chat messages area. */
function placePopoverInChat({ messageRect, areaRect, width, height, preferX }) {
  const minX = areaRect.left + POPOVER_PAD;
  const maxX = areaRect.right - width - POPOVER_PAD;
  let x = typeof preferX === 'number' ? preferX : messageRect.left;
  if (maxX < minX) {
    x = areaRect.left + Math.max(0, (areaRect.width - width) / 2);
  } else {
    x = Math.min(Math.max(x, minX), maxX);
  }

  const spaceBelow = areaRect.bottom - messageRect.bottom - POPOVER_PAD;
  const spaceAbove = messageRect.top - areaRect.top - POPOVER_PAD;
  let y;
  if (spaceBelow >= height || spaceBelow >= spaceAbove) {
    y = messageRect.bottom + POPOVER_GAP;
    if (y + height > areaRect.bottom - POPOVER_PAD) {
      y = areaRect.bottom - height - POPOVER_PAD;
    }
  } else {
    y = messageRect.top - height - POPOVER_GAP;
    if (y < areaRect.top + POPOVER_PAD) {
      y = areaRect.top + POPOVER_PAD;
    }
  }

  const minY = areaRect.top + POPOVER_PAD;
  const maxY = areaRect.bottom - height - POPOVER_PAD;
  if (maxY < minY) {
    y = minY;
  } else {
    y = Math.min(Math.max(y, minY), maxY);
  }

  return { x, y };
}

function getMessagesAreaRect(wrapperEl) {
  const area = wrapperEl?.closest('.messages-area')
    || document.querySelector('.chats-page .messages-area');
  if (!area) {
    return {
      area: null,
      rect: {
        left: POPOVER_PAD,
        top: POPOVER_PAD,
        right: window.innerWidth - POPOVER_PAD,
        bottom: window.innerHeight - POPOVER_PAD,
        width: window.innerWidth - POPOVER_PAD * 2,
        height: window.innerHeight - POPOVER_PAD * 2,
      },
    };
  }
  return { area, rect: area.getBoundingClientRect() };
}

function MenuIcon({ children }) {
  return (
    <span className="message-context-menu__icon" aria-hidden="true">
      {children}
    </span>
  );
}

function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.5 12.2 2.4 2.4 4.6-4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 14 5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  onTogglePin,
  /** Внешний запрос начать редактирование (из шапки выбора). */
  requestEdit = false,
  onRequestEditHandled,
}) {
  const [actionPopover, setActionPopover] = useState(null);
  const [popoverLeaving, setPopoverLeaving] = useState(false);
  const [pickerExpanded, setPickerExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const editInputRef = useRef(null);
  const popoverCloseTimerRef = useRef(null);
  const popoverOpen = Boolean(actionPopover) && !popoverLeaving;

  const stickerPayload = message.message_type === 'text'
    ? parseStickerMessage(message.content)
    : null;
  const isStickerMessage = Boolean(stickerPayload);
  const canCopyPhoto = Boolean(getMessagePhotoSource(message));
  const showDeleteForAll = canDeleteForEveryone(message, isOwn);
  const showEdit = !isStickerMessage && canEditMessage(message, isOwn);
  const delivery = getDeliveryStatus(message, isOwn);
  const isPending = delivery?.key === 'sending';
  const showReactionUi = !isPending && !editing && !selectionMode;
  const canInteract = !isPending && !editing;
  const isEdited = Boolean(message.edited_at);
  const photoCaption = getPhotoCaption(message);
  const selectable = !isPending && message.message_type !== 'call' && !String(message.id).startsWith('temp-');
  const showSelectControl = selectable && Boolean(onToggleSelect);
  const canPin = Boolean(onTogglePin)
    && canInteract
    && selectable
    && message.message_type !== 'call';
  const isPinned = Boolean(message.is_pinned);

  const closeActionPopover = useCallback((animated = true) => {
    if (popoverCloseTimerRef.current) {
      window.clearTimeout(popoverCloseTimerRef.current);
      popoverCloseTimerRef.current = null;
    }
    releaseReactionBar(message.id);
    setPickerExpanded(false);

    if (!animated) {
      setPopoverLeaving(false);
      setActionPopover(null);
      return;
    }

    setPopoverLeaving(true);
    popoverCloseTimerRef.current = window.setTimeout(() => {
      popoverCloseTimerRef.current = null;
      setActionPopover(null);
      setPopoverLeaving(false);
    }, 160);
  }, [message.id]);

  useEffect(() => () => {
    if (popoverCloseTimerRef.current) {
      window.clearTimeout(popoverCloseTimerRef.current);
    }
    releaseReactionBar(message.id);
  }, [message.id]);

  useEffect(() => {
    return subscribeReactionBar((activeId) => {
      if (activeId === message.id) return;
      if (!actionPopover) return;
      setPickerExpanded(false);
      setPopoverLeaving(false);
      setActionPopover(null);
    });
  }, [message.id, actionPopover]);

  const syncPopoverPosition = useCallback((closeIfOutside = false) => {
    const wrapper = wrapperRef.current;
    const node = popoverRef.current;
    if (!wrapper || !node) return;

    const messageRect = wrapper.getBoundingClientRect();
    const { rect: areaRect } = getMessagesAreaRect(wrapper);

    if (closeIfOutside && isMessageOutsideArea(messageRect, areaRect)) {
      closeActionPopover(true);
      return;
    }

    setActionPopover((prev) => {
      if (!prev) return prev;
      const width = node.getBoundingClientRect().width || POPOVER_ESTIMATE.width;
      const height = node.getBoundingClientRect().height || POPOVER_ESTIMATE.height;
      const next = placePopoverInChat({
        messageRect,
        areaRect,
        width,
        height,
        preferX: prev.preferX,
      });
      if (Math.abs(next.x - prev.x) <= 1 && Math.abs(next.y - prev.y) <= 1) {
        return prev;
      }
      return { ...prev, ...next };
    });
  }, [closeActionPopover]);

  // Remeasure after open / expand (follow-loop handles ongoing layout shifts).
  useLayoutEffect(() => {
    if (!popoverOpen) return undefined;
    syncPopoverPosition(false);
    return undefined;
  }, [popoverOpen, pickerExpanded, syncPopoverPosition]);

  // Follow the message bubble while popover is open (new messages shift layout).
  useEffect(() => {
    if (!popoverOpen) return undefined;

    let rafId = 0;
    const tick = () => {
      syncPopoverPosition(true);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    const wrapper = wrapperRef.current;
    const { area } = getMessagesAreaRect(wrapper);
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => syncPopoverPosition(true))
      : null;
    if (observer && wrapper) observer.observe(wrapper);
    if (observer && area) observer.observe(area);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [popoverOpen, syncPopoverPosition]);

  // Lock message list scroll while the action popover is open.
  useEffect(() => {
    if (!popoverOpen) return undefined;
    const area = wrapperRef.current?.closest('.messages-area')
      || document.querySelector('.chats-page .messages-area');
    if (!area) return undefined;

    area.classList.add('is-menu-locked');
    const blockScroll = (event) => {
      event.preventDefault();
    };
    area.addEventListener('wheel', blockScroll, { passive: false });
    area.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      area.classList.remove('is-menu-locked');
      area.removeEventListener('wheel', blockScroll);
      area.removeEventListener('touchmove', blockScroll);
    };
  }, [popoverOpen]);

  useEffect(() => {
    if (!actionPopover) return undefined;

    const onPointerDown = (event) => {
      if (popoverRef.current?.contains(event.target)) return;
      closeActionPopover(true);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeActionPopover(true);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actionPopover, closeActionPopover]);

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
    closeActionPopover();
    onDelete?.(message.id, scope);
  };

  const startEdit = useCallback(() => {
    closeActionPopover();
    setEditText(getEditableMessageText(message));
    setEditing(true);
  }, [closeActionPopover, message]);

  useEffect(() => {
    if (!requestEdit || !canEditMessage(message, isOwn)) return;
    startEdit();
    onRequestEditHandled?.();
  }, [requestEdit, message, isOwn, startEdit, onRequestEditHandled]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditText('');
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancelEdit();
    };
    // Capture: run after ChatsPage skips exit-chat when .message-edit is open
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [editing, cancelEdit]);

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
    closeActionPopover();
  };

  const handleReactionChipClick = (emoji) => {
    onToggleReaction?.(message.id, emoji);
  };

  const handleExpandClick = (event) => {
    event.stopPropagation();
    setPickerExpanded((value) => !value);
    claimReactionBar(message.id);
  };

  const handleContextMenu = (event) => {
    if (!canInteract || selectionMode) return;
    event.preventDefault();
    event.stopPropagation();

    if (popoverCloseTimerRef.current) {
      window.clearTimeout(popoverCloseTimerRef.current);
      popoverCloseTimerRef.current = null;
    }

    const wrapper = wrapperRef.current;
    const messageRect = wrapper?.getBoundingClientRect() || {
      left: event.clientX,
      top: event.clientY,
      right: event.clientX,
      bottom: event.clientY,
      width: 0,
      height: 0,
    };
    const { rect: areaRect } = getMessagesAreaRect(wrapper);
    const placed = placePopoverInChat({
      messageRect,
      areaRect,
      width: POPOVER_ESTIMATE.width,
      height: POPOVER_ESTIMATE.height,
      preferX: event.clientX,
    });
    claimReactionBar(message.id);
    setPopoverLeaving(false);
    setPickerExpanded(false);
    setCopyFeedback('');
    setActionPopover({
      ...placed,
      preferX: event.clientX,
    });
  };

  const handleReply = (event) => {
    event?.stopPropagation?.();
    closeActionPopover();
    onReply?.(message);
  };

  const handleSelectFromMenu = () => {
    closeActionPopover();
    onToggleSelect?.(message);
  };

  const handleForwardFromMenu = () => {
    closeActionPopover();
    onQuickForward?.(message);
  };

  const handleTogglePin = () => {
    closeActionPopover();
    onTogglePin?.(message);
  };

  const handleCopyPhoto = async () => {
    if (!canCopyPhoto || copyBusy) return;
    setCopyBusy(true);
    setCopyFeedback('');
    try {
      await copyMessagePhoto(message);
      setCopyFeedback('Скопировано');
      window.setTimeout(() => {
        closeActionPopover();
        setCopyFeedback('');
      }, 650);
    } catch {
      setCopyFeedback('Не удалось скопировать');
    } finally {
      setCopyBusy(false);
    }
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
                e.stopPropagation();
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
      if (stickerPayload) {
        return (
          <div className="message-sticker">
            <StickerView sticker={stickerPayload} size="chat" />
          </div>
        );
      }
      return (
        <>
          <div className="message-content">
            {linkifyText(message.content)}
            <EditedMark show={isEdited} />
          </div>
          <LinkPreviewCard text={message.content} />
        </>
      );
    }
    if (message.message_type === 'photo') {
      return (
        <>
          <MessageMedia message={message} chatId={chatId} />
          {photoCaption ? (
            <>
              <div className="message-content message-caption">
                {linkifyText(photoCaption)}
                <EditedMark show={isEdited} />
              </div>
              <LinkPreviewCard text={photoCaption} />
            </>
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

  const reactionsClass = [
    'message-reactions',
    isOwn ? 'message-reactions--own' : 'message-reactions--other',
    specialMode ? 'message-reactions--special' : '',
    backMode ? 'message-reactions--back' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const actionPopoverNode = actionPopover && createPortal(
    <div
      ref={popoverRef}
      className={[
        'message-action-popover',
        popoverLeaving ? 'is-leaving' : 'is-open',
        specialMode ? 'message-action-popover--special' : '',
        backMode ? 'message-action-popover--back' : '',
      ].filter(Boolean).join(' ')}
      style={{ left: actionPopover.x, top: actionPopover.y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {showReactionUi && (
        <div
          className={[
            'message-reaction-bar',
            'message-reaction-bar--popover',
            'is-visible',
            pickerExpanded ? 'is-expanded' : '',
            specialMode ? 'message-reaction-bar--special' : '',
            backMode ? 'message-reaction-bar--back' : '',
          ].filter(Boolean).join(' ')}
          role="toolbar"
          aria-label="Реакции на сообщение"
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
                <AppleEmoji emoji={emoji} size={22} />
              </button>
            ))}
            <button
              type="button"
              className="message-reaction-bar__expand"
              onClick={handleExpandClick}
              aria-label={pickerExpanded ? 'Скрыть эмодзи' : 'Больше эмодзи'}
              aria-expanded={pickerExpanded}
            >
              {pickerExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          </div>
          {pickerExpanded && (
            <div className="message-reaction-bar__picker">
              <EmojiPicker
                visible={pickerExpanded}
                specialMode={specialMode}
                backMode={backMode}
                onSelect={handleReactionPick}
                emojiOnly
                className="emoji-picker--reaction"
              />
            </div>
          )}
        </div>
      )}

      {!pickerExpanded && (
      <div className="message-context-menu is-open" role="menu">
        {showEdit && (
          <button type="button" role="menuitem" onClick={startEdit}>
            <MenuIcon><EditActionIcon /></MenuIcon>
            Редактировать
          </button>
        )}
        {canCopyPhoto && (
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyPhoto}
            disabled={copyBusy}
          >
            <MenuIcon><CopyActionIcon /></MenuIcon>
            {copyFeedback || (copyBusy ? 'Копирование…' : 'Скопировать')}
          </button>
        )}
        {onReply && (
          <button type="button" role="menuitem" onClick={handleReply}>
            <MenuIcon><ReplyActionIcon /></MenuIcon>
            Ответить
          </button>
        )}
        <button type="button" role="menuitem" onClick={handleSelectFromMenu}>
          <MenuIcon><SelectIcon /></MenuIcon>
          Выбрать
        </button>
        {onQuickForward && (
          <button type="button" role="menuitem" onClick={handleForwardFromMenu}>
            <MenuIcon><ForwardActionIcon /></MenuIcon>
            Переслать
          </button>
        )}
        {canPin && (
          <button type="button" role="menuitem" onClick={handleTogglePin}>
            <MenuIcon><PinActionIcon /></MenuIcon>
            {isPinned ? 'Открепить' : 'Закрепить'}
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className="message-context-menu__danger"
          onClick={() => handleDelete('me')}
        >
          <MenuIcon><DeleteActionIcon /></MenuIcon>
          Удалить у себя
        </button>
        {showDeleteForAll && (
          <button
            type="button"
            role="menuitem"
            className="message-context-menu__danger"
            onClick={() => handleDelete('everyone')}
          >
            <MenuIcon><DeleteActionIcon /></MenuIcon>
            Удалить у всех
          </button>
        )}
      </div>
      )}
    </div>,
    document.body,
  );

  return (
    <div
      ref={wrapperRef}
      className={[
        'message-wrapper',
        isOwn ? 'own' : 'other',
        isStickerMessage ? 'is-sticker' : '',
        reactions.length ? 'has-reactions' : '',
        highlighted ? 'is-highlighted' : '',
        selected ? 'is-selected' : '',
        selectionMode ? 'is-selection-mode' : '',
        popoverOpen ? 'is-menu-open' : '',
      ].filter(Boolean).join(' ')}
      data-message-id={message.id}
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
          <ReplyActionIcon />
        </button>
      )}

      <div
        className={[
          'message',
          isOwn ? 'own' : 'other',
          isPinned ? 'is-pinned' : '',
          isPending ? 'pending' : '',
          isStickerMessage ? 'message--sticker' : '',
        ].filter(Boolean).join(' ')}
      >
        {!isStickerMessage && (
          <div className="message-header">
            <div className="message-meta">{message.sender?.nickname}</div>
          </div>
        )}
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
            <span>
              {isStickerMessageContent(message.reply_to_summary.preview)
                ? 'Стикер'
                : renderTextWithAppleEmoji(
                  message.reply_to_summary.preview || 'Сообщение',
                  `reply-${message.id}`,
                  14
                )}
            </span>
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
              <span className="message-reaction-chip__emoji">
                <AppleEmoji emoji={emoji} size={16} />
              </span>
              {count > 1 && <span className="message-reaction-chip__count">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {actionPopoverNode}
    </div>
  );
}
