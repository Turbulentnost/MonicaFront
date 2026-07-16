import { UserAvatar } from './UserAvatar';

export function ChatHeader({ partner, isOnline }) {
  return (
    <div className="chat-header">
      <UserAvatar user={partner} size={40} showOnline isOnline={isOnline} />
      <div className="chat-header-info">
        <h3>@{partner?.nickname || '—'}</h3>
        <span className="chat-header-sub">
          {partner?.first_name} {partner?.last_name}
        </span>
      </div>
      <span className={`ws-status ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? 'в сети' : 'не в сети'}
      </span>
    </div>
  );
}
