import { useEffect, useState } from 'react';
import { chatsApi } from '../../api/client';
import { UserAvatar } from './UserAvatar';

export function ForwardPickerModal({ chats, currentUserId, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      chatsApi.searchUsers(value)
        .then(({ data }) => {
          if (!cancelled) setResults((Array.isArray(data) ? data : []).filter((item) => item.id !== currentUserId));
        })
        .catch(() => {
          if (!cancelled) setError('Не удалось выполнить поиск');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentUserId, query]);

  return (
    <div className="forward-picker-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="forward-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-picker-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="forward-picker-title">Переслать в…</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
        </header>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск пользователей"
          autoFocus
        />
        <div className="forward-picker__list">
          {!query.trim() && chats.map((chat) => (
            <button type="button" key={chat.id} onClick={() => onSelect(chat)}>
              <UserAvatar user={chat.partner} size={42} />
              <span>
                <strong>@{chat.partner?.nickname || 'user'}</strong>
                <small>{[chat.partner?.first_name, chat.partner?.last_name].filter(Boolean).join(' ')}</small>
              </span>
            </button>
          ))}
          {query.trim().length >= 2 && results.map((person) => (
            <button type="button" key={person.id} onClick={() => onSelect(null, person)}>
              <UserAvatar user={person} size={42} />
              <span>
                <strong>@{person.nickname || 'user'}</strong>
                <small>{[person.first_name, person.last_name].filter(Boolean).join(' ')}</small>
              </span>
            </button>
          ))}
          {loading && <p>Поиск…</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && query.trim().length >= 2 && results.length === 0 && <p>Ничего не найдено</p>}
        </div>
      </section>
    </div>
  );
}
