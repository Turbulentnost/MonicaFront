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

export function ChatIconRail({
  user,
  onLogout,
  onOpenSettings,
  settingsActive = false,
  specialMode = false,
  backMode = false,
}) {
  const railClass = [
    'chat-rail',
    specialMode ? 'chat-rail--special' : '',
    backMode ? 'chat-rail--back' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={railClass} aria-label="Навигация">
      <div
        className="chat-rail__logo"
        aria-label={backMode ? 'BACK mode' : specialMode ? 'FRONT mode' : 'Monica'}
      >
        {backMode ? (
          <span className="chat-rail__logo-mark chat-rail__logo-mark--back">∴</span>
        ) : specialMode ? (
          <span className="chat-rail__logo-mark chat-rail__logo-mark--dev">{'</>'}</span>
        ) : (
          <img
            className="chat-rail__logo-image"
            src="/monica-logo.png"
            alt="Monica"
          />
        )}
      </div>

      <div className="chat-rail__nav">
        <RailIcon active label={backMode ? 'Пустота' : 'Чаты'}>
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
        {backMode && (
          <RailIcon label="Сожаление">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M12 19V5M12 19l-4-4M12 19l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </RailIcon>
        )}
      </div>

      <div className="chat-rail__bottom">
        <button
          type="button"
          className="chat-rail__logout"
          onClick={onLogout}
          aria-label="Выйти"
          title={backMode ? 'Уйти… поздно' : 'Выйти'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
            <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className={`chat-rail__avatar${settingsActive ? ' is-active' : ''}`}
          onClick={onOpenSettings}
          aria-label="Настройки аккаунта"
          title="Настройки аккаунта"
        >
          <UserAvatar user={user} size={36} showOnline={!backMode} isOnline={!backMode} />
        </button>
      </div>
    </nav>
  );
}
