import { UserAvatar } from './UserAvatar';

export function IncomingCallOverlay({ partner, onAccept, onReject, error }) {
  return (
    <div className="incoming-call-overlay" role="dialog" aria-modal="true" aria-label="Входящий звонок">
      <div className="incoming-call-card">
        <div className="incoming-call-pulse">
          <UserAvatar user={partner} size={92} />
        </div>
        <span className="incoming-call-label">Входящий аудиозвонок</span>
        <h2>@{partner?.nickname || 'Пользователь'}</h2>
        <p>{[partner?.first_name, partner?.last_name].filter(Boolean).join(' ') || 'звонит вам'}</p>
        {error && <div className="call-error" role="alert">{error}</div>}
        <div className="incoming-call-actions">
          <button type="button" className="call-round-button call-reject" onClick={onReject} aria-label="Отклонить звонок">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
              <path d="M5.3 15.2c3.9-3.3 9.5-3.3 13.4 0l-2.3 3.1-3-1.4v-2.2h-2.8v2.2l-3 1.4-2.3-3.1Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Отклонить</span>
          </button>
          <button type="button" className="call-round-button call-accept" onClick={onAccept} aria-label="Принять звонок">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
              <path d="M7 4.5 4.8 6.7c-.8.8.5 4.5 3.6 7.6s6.8 4.4 7.6 3.6l2.2-2.2-4-2-1.4 1.4c-1.7-.8-3.5-2.6-4.3-4.3l1.4-1.4-2.9-4.9Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Принять</span>
          </button>
        </div>
      </div>
    </div>
  );
}
