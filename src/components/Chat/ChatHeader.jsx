import { useEffect, useState } from 'react';
import { formatLastSeen } from '../../utils/formatLastSeen';
import {
  getChatSubtitle,
  getChatTitle,
  getGroupAvatarUser,
  isGroupChat,
} from '../../utils/chatDisplay';
import { UserAvatar } from './UserAvatar';

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path
        d="M23 7l-7 5 7 5V7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatHeader({
  chat = null,
  partner,
  isOnline,
  lastSeenAt,
  partnerActivity = null,
  onInvitePrivate,
  privateBusy,
  onOpenDetails,
  onStartCall,
  onStartVideoCall,
  callDisabled,
  incomingInvitePending = false,
  onBack,
}) {
  const [, setTick] = useState(0);
  const group = isGroupChat(chat);
  const displayPartner = group ? getGroupAvatarUser(chat) : (partner || chat?.partner);
  const activity = !group && (partnerActivity === 'typing' || partnerActivity === 'recording')
    ? partnerActivity
    : null;

  useEffect(() => {
    if (group || activity || isOnline || !lastSeenAt) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [group, activity, isOnline, lastSeenAt]);

  const title = chat
    ? getChatTitle(chat)
    : ([displayPartner?.first_name, displayPartner?.last_name].filter(Boolean).join(' ')
      || displayPartner?.nickname
      || '—');

  let statusText = chat
    ? getChatSubtitle(chat, {
      isOnline,
      lastSeenText: formatLastSeen(lastSeenAt),
    })
    : (isOnline ? 'в сети' : formatLastSeen(lastSeenAt));
  let statusClass = !group && isOnline ? 'is-online' : 'is-offline';

  if (activity === 'typing') {
    statusText = 'печатает...';
    statusClass = 'is-activity';
  } else if (activity === 'recording') {
    statusText = 'записывает голосовое...';
    statusClass = 'is-activity';
  }

  return (
    <div
      className={[
        'chat-header',
        group ? 'chat-header--group' : '',
        incomingInvitePending ? 'chat-header--incoming-invite' : '',
      ].filter(Boolean).join(' ')}
    >
      {onBack && (
        <button
          type="button"
          className="btn-chat-back"
          onClick={onBack}
          aria-label="К списку чатов"
          title="К списку чатов"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
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
        <UserAvatar
          user={displayPartner}
          size={40}
          showOnline={!group}
          isOnline={isOnline}
          className={group ? 'chat-header-avatar--group' : ''}
        />
        <div className="chat-header-info">
          <h3 className="chat-header-name">{title}</h3>
          <span className={`chat-header-status ${statusClass}`}>
            {statusText}
          </span>
        </div>
      </div>

      {!group && (
        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-header-icon-btn"
            onClick={onInvitePrivate}
            disabled={privateBusy}
            title="Пригласить в приватный чат"
            aria-label="Приватный чат"
          >
            <IconLock />
          </button>
          <button
            type="button"
            className="chat-header-icon-btn"
            onClick={onStartCall}
            disabled={callDisabled}
            title={
              incomingInvitePending
                ? 'Звонки недоступны во время приглашения в приватный чат'
                : (callDisabled ? 'Звонок уже выполняется' : 'Аудиозвонок')
            }
            aria-label="Начать аудиозвонок"
          >
            <IconPhone />
          </button>
          <button
            type="button"
            className="chat-header-icon-btn"
            onClick={onStartVideoCall}
            disabled={callDisabled}
            title={
              incomingInvitePending
                ? 'Звонки недоступны во время приглашения в приватный чат'
                : (callDisabled ? 'Звонок уже выполняется' : 'Видеозвонок')
            }
            aria-label="Начать видеозвонок"
          >
            <IconVideo />
          </button>
        </div>
      )}
    </div>
  );
}
