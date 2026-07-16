import { UserAvatar } from './UserAvatar';

function formatPreview(lastMessage) {
  if (!lastMessage) return 'Нет сообщений';
  if (lastMessage.message_type === 'photo') return 'Фото';
  if (lastMessage.message_type === 'file') {
    const name = (lastMessage.file_name || '').toLowerCase();
    if (name.endsWith('.py')) return `Python: ${lastMessage.file_name}`;
    if (name.endsWith('.js')) return `JS: ${lastMessage.file_name}`;
    return lastMessage.file_name ? `Файл: ${lastMessage.file_name}` : 'Файл';
  }
  return lastMessage.content || 'Нет сообщений';
}

export function ChatListItem({ chat, active, onSelect, isOnline }) {
  const partner = chat.partner;
  const preview = formatPreview(chat.last_message);

  return (
    <li className={active ? 'active' : ''}>
      <button type="button" className="chat-item-btn" onClick={() => onSelect(chat)}>
        <UserAvatar user={partner} size={44} showOnline isOnline={isOnline} />
        <span className="chat-item-text">
          <span className="chat-item-name">@{partner?.nickname || '—'}</span>
          <span className="chat-item-preview">{preview}</span>
        </span>
      </button>
    </li>
  );
}
