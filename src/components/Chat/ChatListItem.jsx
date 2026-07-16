import { UserAvatar } from './UserAvatar';

export function ChatListItem({ chat, active, onSelect }) {
  const partner = chat.partner;
  const preview = chat.last_message?.content || 'Нет сообщений';

  return (
    <li className={active ? 'active' : ''}>
      <button type="button" className="chat-item-btn" onClick={() => onSelect(chat)}>
        <UserAvatar user={partner} size={44} />
        <span className="chat-item-text">
          <span className="chat-item-name">@{partner?.nickname || '—'}</span>
          <span className="chat-item-preview">{preview}</span>
        </span>
      </button>
    </li>
  );
}
