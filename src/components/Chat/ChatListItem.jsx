import { UserAvatar } from './UserAvatar';
import { formatChatListTime } from '../../utils/formatChatDate';
import { getPhotoCaption } from '../../utils/messageText';

function formatPreview(lastMessage) {
  if (!lastMessage) return 'Нет сообщений';
  if (lastMessage.message_type === 'photo') {
    const caption = getPhotoCaption(lastMessage);
    if (caption) return caption;
    const count = Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 1
      ? lastMessage.attachments.length
      : 1;
    return count > 1 ? `${count} фото` : 'Фото';
  }
  if (lastMessage.message_type === 'voice') return 'Голосовое сообщение';
  if (lastMessage.message_type === 'forward') {
    return lastMessage.content || 'Пересланные сообщения';
  }
  if (lastMessage.message_type === 'call') {
    return lastMessage.content || 'Звонок';
  }
  if (lastMessage.message_type === 'file') {
    const name = (lastMessage.file_name || '').toLowerCase();
    if (name.endsWith('.py')) return `Python: ${lastMessage.file_name}`;
    if (name.endsWith('.js')) return `JS: ${lastMessage.file_name}`;
    return lastMessage.file_name ? `Файл: ${lastMessage.file_name}` : 'Файл';
  }
  return lastMessage.content || 'Нет сообщений';
}

function PhoneIcon({ answer = true }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {answer ? (
        <path
          d="M7 4.5 4.8 6.7c-.8.8.5 4.5 3.6 7.6s6.8 4.4 7.6 3.6l2.2-2.2-4-2-1.4 1.4c-1.7-.8-3.5-2.6-4.3-4.3l1.4-1.4-2.9-4.9Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M5.3 15.2c3.9-3.3 9.5-3.3 13.4 0l-2.3 3.1-3-1.4v-2.2h-2.8v2.2l-3 1.4-2.3-3.1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function ChatListItem({
  chat,
  active,
  onSelect,
  isOnline,
  unread = false,
  ringing = false,
  ringingMediaMode = 'audio',
  onAcceptCall,
  onRejectCall,
}) {
  const partner = chat.partner;
  const preview = formatPreview(chat.last_message);
  const timeLabel = formatChatListTime(
    chat.last_message?.sent_at || chat.updated_at
  );
  const ringingLabel = ringingMediaMode === 'video'
    ? 'Входящий видеозвонок…'
    : 'Входящий звонок…';
  const showUnread = unread && !ringing;

  return (
    <li className={[active ? 'active' : '', ringing ? 'ringing' : '', showUnread ? 'has-unread' : ''].filter(Boolean).join(' ')}>
      <div className={`chat-item-row ${ringing ? 'chat-item-row--ringing' : ''}`}>
        <button type="button" className="chat-item-btn" onClick={() => onSelect(chat)}>
          <UserAvatar user={partner} size={44} showOnline isOnline={isOnline} />
          <span className="chat-item-text">
            <span className="chat-item-top">
              <span className="chat-item-name">@{partner?.nickname || '—'}</span>
              {!ringing && timeLabel && <span className="chat-item-time">{timeLabel}</span>}
            </span>
            <span className="chat-item-preview">
              {ringing && <span className="chat-ringing-dot" aria-hidden="true" />}
              {ringing ? ringingLabel : preview}
            </span>
          </span>
          {showUnread && (
            <span className="chat-item-unread" aria-label="Есть непрочитанные сообщения" />
          )}
        </button>
        {ringing && (
          <div className="chat-item-call-actions" role="group" aria-label={ringingLabel}>
            <button
              type="button"
              className="chat-item-call-btn chat-item-call-btn--accept"
              onClick={(event) => {
                event.stopPropagation();
                onAcceptCall?.(chat);
              }}
              title="Принять звонок"
              aria-label="Принять звонок"
            >
              <PhoneIcon answer />
            </button>
            <button
              type="button"
              className="chat-item-call-btn chat-item-call-btn--reject"
              onClick={(event) => {
                event.stopPropagation();
                onRejectCall?.(chat);
              }}
              title="Отклонить звонок"
              aria-label="Отклонить звонок"
            >
              <PhoneIcon answer={false} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
