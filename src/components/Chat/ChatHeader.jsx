import { UserAvatar } from './UserAvatar';

export function ChatHeader({ partner, connected }) {
  return (
    <div className="chat-header">
      <UserAvatar user={partner} size={40} />
      <div className="chat-header-info">
        <h3>@{partner?.nickname || '—'}</h3>
        <span className="chat-header-sub">
          {partner?.first_name} {partner?.last_name}
        </span>
      </div>
      <span className={`ws-status ${connected ? 'online' : 'offline'}`}>
        {connected ? 'online' : 'offline'}
      </span>
    </div>
  );
}
