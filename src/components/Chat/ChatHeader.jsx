import { useEffect, useState } from 'react';
import { formatLastSeen } from '../../utils/formatLastSeen';
import { UserAvatar } from './UserAvatar';

export function ChatHeader({ partner, isOnline, lastSeenAt, onInvitePrivate, privateBusy }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isOnline || !lastSeenAt) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [isOnline, lastSeenAt]);

  const statusText = isOnline
    ? 'в сети'
    : formatLastSeen(lastSeenAt);

  return (
    <div className="chat-header">
      <UserAvatar user={partner} size={40} showOnline isOnline={isOnline} />
      <div className="chat-header-info">
        <h3>@{partner?.nickname || '—'}</h3>
        <span className="chat-header-sub">
          {partner?.first_name} {partner?.last_name}
        </span>
      </div>
      <button
        type="button"
        className="btn-private"
        onClick={onInvitePrivate}
        disabled={privateBusy}
        title="Пригласить в приватный чат"
      >
        Приватный чат
      </button>
      <span className={`ws-status ${isOnline ? 'online' : 'offline'}`}>
        {statusText}
      </span>
    </div>
  );
}
