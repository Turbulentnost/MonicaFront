import { UserAvatar } from './UserAvatar';

function RailIcon({ children, active, label, onClick, as: Tag = 'button' }) {
  const props = Tag === 'button'
    ? { type: 'button', onClick, 'aria-label': label, title: label }
    : { 'aria-hidden': true };

  return (
    <Tag
      className={`chat-rail__item ${active ? 'chat-rail__item--active' : ''}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function ChatIconRail({ user, onLogout, specialMode = false }) {
  return (
    <nav className={`chat-rail ${specialMode ? 'chat-rail--special' : ''}`} aria-label="Навигация">
      <div className="chat-rail__logo" aria-label={specialMode ? 'FRONT mode' : 'Monica'}>
        <span className={`chat-rail__logo-mark ${specialMode ? 'chat-rail__logo-mark--dev' : ''}`}>
          {specialMode ? '</>' : 'M'}
        </span>
      </div>

      <div className="chat-rail__nav">
        <RailIcon active label="Чаты">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.3 8.5 8.5 0 0 1-7.3 4.3 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.3-7.3A8.4 8.4 0 0 1 12 3h.5a8.5 8.5 0 0 1 8.5 8.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </RailIcon>
        {specialMode && (
          <RailIcon label="Код">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M8 6L2 12l6 6M16 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </RailIcon>
        )}
        <RailIcon label="Уведомления">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
          </svg>
        </RailIcon>
        <RailIcon label="Настройки">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" strokeLinecap="round" />
          </svg>
        </RailIcon>
      </div>

      <div className="chat-rail__bottom">
        <button
          type="button"
          className="chat-rail__logout"
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
            <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="chat-rail__avatar">
          <UserAvatar user={user} size={36} showOnline isOnline />
        </div>
      </div>
    </nav>
  );
}
