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
  onStartCall,
  onStartVideoCall,
  callDisabled,
  onBack,
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
      {onBack && (
        <button
          type="button"
          className="btn-chat-back"
          onClick={onBack}
          aria-label="К списку чатов"
          title="К списку чатов"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
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
        aria-label="Показать или скрыть детали чата"
        title="Детали чата"
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
        className="btn-call"
        onClick={onStartCall}
        disabled={callDisabled}
        title={callDisabled ? 'Звонок уже выполняется' : 'Аудиозвонок'}
        aria-label="Начать аудиозвонок"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M7 4.5 4.8 6.7c-.8.8.5 4.5 3.6 7.6s6.8 4.4 7.6 3.6l2.2-2.2-4-2-1.4 1.4c-1.7-.8-3.5-2.6-4.3-4.3l1.4-1.4-2.9-4.9Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className="btn-call btn-call-video"
        onClick={onStartVideoCall}
        disabled={callDisabled}
        title={callDisabled ? 'Звонок уже выполняется' : 'Видеозвонок'}
        aria-label="Начать видеозвонок"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <rect x="3" y="7" width="13" height="10" rx="2" />
          <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
        </svg>
      </button>
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
