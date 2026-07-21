import { UserAvatar } from './UserAvatar';

const TABS_DEFAULT = [
  { id: 'shared', label: 'Files' },
  { id: 'members', label: 'Members' },
  { id: 'pinned', label: 'Pinned' },
];

const TABS_BACK = [
  { id: 'shared', label: 'Пепел' },
  { id: 'members', label: 'Никого' },
  { id: 'pinned', label: 'Пусто' },
];

const DEV_FILES = [
  { name: 'project-update-v3.zip', meta: '4.2 MB · archive', icon: 'zip', color: '#eab308' },
  { name: 'dashboard-final.png', meta: '1.8 MB · image', icon: 'img', color: '#38bdf8' },
  { name: 'api-specs.yaml', meta: '24 KB · config', icon: 'yaml', color: '#a78bfa' },
];

const BACK_FILES = [
  { name: 'regret.txt', meta: '0 KB · пусто', icon: 'txt', color: '#888' },
  { name: 'last-hope.png', meta: 'удалено', icon: 'img', color: '#666' },
  { name: 'todo-never.yaml', meta: '∞ · не сделано', icon: 'yaml', color: '#555' },
];

const INTEGRATIONS = [
  { name: 'GitHub', status: 'Connected', color: '#e8eaed' },
  { name: 'Jira', status: 'Connected', color: '#3b82f6' },
  { name: 'Figma', status: 'Connected', color: '#f97316' },
];

const BACK_INTEGRATIONS = [
  { name: 'GitHub', status: 'Abandoned', color: '#444' },
  { name: 'Jira', status: 'Forgotten', color: '#333' },
  { name: 'Figma', status: 'Deleted', color: '#2a2a2a' },
];

function FileIcon({ color }) {
  return (
    <span className="chat-details__file-icon" style={{ color }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    </span>
  );
}

export function ChatDetailsPanel({ partner, isOnline, onClose, specialMode = false, backMode = false }) {
  if (!partner) return null;

  const tabs = backMode ? TABS_BACK : TABS_DEFAULT;

  const files = backMode
    ? BACK_FILES
    : specialMode
      ? DEV_FILES
      : [
          { name: 'onboarding-flow.fig', meta: 'Figma · 2.4 MB', icon: 'figma', color: '#f97316' },
          { name: 'specs-v2.pdf', meta: 'PDF · 1.1 MB', icon: 'pdf', color: '#ef4444' },
          { name: 'assets-bundle.zip', meta: 'ZIP · 8.7 MB', icon: 'zip', color: '#eab308' },
        ];

  const panelClass = [
    'chat-details',
    specialMode ? 'chat-details--special' : '',
    backMode ? 'chat-details--back' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={panelClass} aria-label="Детали чата">
      <div className="chat-details__header">
        <h2 className="chat-details__title">
          {backMode ? 'архив сожалений' : specialMode ? 'workspace' : 'Детали'}
        </h2>
        <button type="button" className="chat-details__close" onClick={onClose} aria-label="Закрыть панель">
          ×
        </button>
      </div>

      {specialMode && !backMode && (
        <div className="chat-details__dev-icon" aria-hidden="true">
          <span>{'</>'}</span>
        </div>
      )}

      {backMode && (
        <div className="chat-details__dev-icon chat-details__dev-icon--back" aria-hidden="true">
          <span>∴</span>
        </div>
      )}

      <div className="chat-details__profile">
        {!specialMode && !backMode && (
          <UserAvatar user={partner} size={56} showOnline isOnline={isOnline} />
        )}
        {backMode && (
          <UserAvatar user={partner} size={56} showOnline={false} isOnline={false} />
        )}
        <h3 className="chat-details__name">
          {specialMode && !backMode ? (
            <>
              <span className="chat-details__hash">#</span>
              {partner.nickname}
            </>
          ) : (
            `@${partner.nickname}`
          )}
        </h3>
        <p className="chat-details__sub">
          {backMode
            ? `${partner.first_name} ${partner.last_name} · давно ушёл`
            : specialMode
              ? `${partner.first_name} ${partner.last_name} · dev channel`
              : `${partner.first_name} ${partner.last_name}`}
        </p>
      </div>

      {(specialMode || backMode) && (
        <div className="chat-details__quick-actions">
          {(backMode ? ['Mute', 'Gone', 'Alone', '…'] : ['Mute', 'Pin', 'Members', 'More']).map((label) => (
            <button key={label} type="button" className="chat-details__quick-btn" aria-label={label}>
              <span>{label[0]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-details__tabs" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={i === 0}
            className={`chat-details__tab ${i === 0 ? 'chat-details__tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {specialMode && !backMode && (
        <div className="chat-details__about">
          <p>Frontend workspace для команды. Ship fast, break nothing.</p>
          <button type="button" className="chat-details__link">Edit description</button>
        </div>
      )}

      {backMode && (
        <div className="chat-details__about chat-details__about--back">
          <p>Здесь когда-то был смысл. Теперь только эхо неотправленных коммитов.</p>
          <button type="button" className="chat-details__link" disabled>
            Слишком поздно редактировать
          </button>
        </div>
      )}

      <div className="chat-details__section">
        <div className="chat-details__section-head">
          <span>{backMode ? 'Останки файлов' : specialMode ? 'Recent files' : 'Файлы'}</span>
          <button type="button" className="chat-details__link">
            {backMode ? 'Не смотрите' : specialMode ? 'See all' : 'Все файлы'}
          </button>
        </div>
        <ul className="chat-details__files">
          {files.map((file) => (
            <li key={file.name} className="chat-details__file">
              <FileIcon color={file.color} />
              <div className="chat-details__file-info">
                <span className="chat-details__file-name">{file.name}</span>
                <span className="chat-details__file-meta">{file.meta}</span>
              </div>
              <button type="button" className="chat-details__file-dl" aria-label={`Скачать ${file.name}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M12 3v12M7 10l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        {!specialMode && !backMode && (
          <p className="chat-details__placeholder">Данные файлов появятся при поддержке бэкенда</p>
        )}
      </div>

      {(specialMode || backMode) && (
        <div className="chat-details__section chat-details__section--integrations">
          <div className="chat-details__section-head">
            <span>{backMode ? 'Бывшие связи' : 'Integrations'}</span>
            <button type="button" className="chat-details__link">
              {backMode ? 'Всё ушло' : 'See all'}
            </button>
          </div>
          <ul className="chat-details__integrations">
            {(backMode ? BACK_INTEGRATIONS : INTEGRATIONS).map((item) => (
              <li key={item.name} className="chat-details__integration">
                <span className="chat-details__integration-dot" style={{ background: item.color }} />
                <span className="chat-details__integration-name">{item.name}</span>
                <span className="chat-details__integration-status">{item.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
