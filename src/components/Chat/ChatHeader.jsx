import { useEffect, useState } from 'react';
import { formatLastSeen } from '../../utils/formatLastSeen';
import { UserAvatar } from './UserAvatar';

export function ChatHeader({
  partner,
  isOnline,
  lastSeenAt,
  onInvitePrivate,
  privateBusy,
  onOpenDetails,
}) {
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
      <div
        className="chat-header-partner"
        role="button"
        tabIndex={0}
        onClick={onOpenDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails?.();
          }
        }}
        aria-label="Открыть детали"
      >
        <UserAvatar user={partner} size={40} showOnline isOnline={isOnline} />
        <div className="chat-header-info">
          <h3>@{partner?.nickname || '—'}</h3>
          <span className="chat-header-sub">
            {partner?.first_name} {partner?.last_name}
          </span>
        </div>
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
