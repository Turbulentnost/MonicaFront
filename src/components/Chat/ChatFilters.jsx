const DEV_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'dm', label: 'DMs' },
];

const BACK_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'unread', label: 'Забытые' },
  { id: 'pinned', label: 'Пусто' },
  { id: 'dm', label: 'Тишина' },
];

export function ChatFilters({ active, onChange, unreadCount = 0, specialMode = false, backMode = false }) {
  if (backMode) {
    return (
      <div className="chat-filters chat-filters--back" role="tablist" aria-label="Фильтры чатов">
        <div className="chat-filters__special-head">
          <span className="chat-filters__special-badge chat-filters__special-badge--back" aria-hidden="true">
            ∴
          </span>
          <span className="chat-filters__special-title">BACK.session</span>
          <span className="chat-filters__special-status chat-filters__special-status--dead">regret</span>
        </div>
        <div className="chat-filters__special-tabs">
          {BACK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={f.id === 'all'}
              className={`chat-filters__dev-pill chat-filters__dev-pill--back ${f.id === 'all' ? 'chat-filters__dev-pill--active' : ''}`}
              onClick={() => f.id !== 'dm' && f.id !== 'pinned' && onChange(f.id === 'unread' ? 'unread' : 'all')}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 && (
                <span className="chat-filters__count">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <p className="chat-filters__special-hint chat-filters__special-hint--back">
          <span className="chat-filters__hint-key">const</span> path ={' '}
          <span className="chat-filters__hint-str">&apos;backend&apos;</span>
          <span className="chat-filters__hint-sep"> · </span>
          вы могли выбрать FRONT
          <span className="chat-filters__hint-sep"> · </span>
          <span className="chat-filters__hint-fn">Escape</span>
          <span className="chat-filters__hint-sep">()</span> — уйти, если ещё можете
        </p>
      </div>
    );
  }

  if (specialMode) {
    return (
      <div className="chat-filters chat-filters--special" role="tablist" aria-label="Фильтры чатов">
        <div className="chat-filters__special-head">
          <span className="chat-filters__special-badge" aria-hidden="true">
            {'</>'}
          </span>
          <span className="chat-filters__special-title">FRONT.session</span>
          <span className="chat-filters__special-status">active</span>
        </div>
        <div className="chat-filters__special-tabs">
          {DEV_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={f.id === 'all'}
              className={`chat-filters__dev-pill ${f.id === 'all' ? 'chat-filters__dev-pill--active' : ''}`}
              onClick={() => f.id !== 'dm' && f.id !== 'pinned' && onChange(f.id === 'unread' ? 'unread' : 'all')}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 && (
                <span className="chat-filters__count">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <p className="chat-filters__special-hint">
          <span className="chat-filters__hint-key">const</span> mode ={' '}
          <span className="chat-filters__hint-str">&apos;frontend&apos;</span>
          <span className="chat-filters__hint-sep"> · </span>
          <span className="chat-filters__hint-fn">Escape</span>
          <span className="chat-filters__hint-sep">()</span> to exit
        </p>
      </div>
    );
  }

  const FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'unread', label: 'Непрочитанные' },
    { id: 'mentions', label: 'Упоминания' },
  ];

  return (
    <div className="chat-filters" role="tablist" aria-label="Фильтры чатов">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={active === f.id}
          className={`chat-filters__pill ${active === f.id ? 'chat-filters__pill--active' : ''}`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
          {f.id === 'unread' && unreadCount > 0 && (
            <span className="chat-filters__count">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}
