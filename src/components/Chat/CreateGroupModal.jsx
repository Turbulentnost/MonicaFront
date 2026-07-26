import { useEffect, useMemo, useState } from 'react';
import { chatsApi } from '../../api/client';
import { getDirectChatPartners } from '../../utils/chatDisplay';
import { UserAvatar } from './UserAvatar';

const TITLE_MAX = 64;

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) {
    if (error?.response?.status === 404) {
      return 'Создание групп пока недоступно на сервере';
    }
    return error?.message || 'Не удалось создать группу';
  }
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    const item = data.detail[0];
    if (typeof item === 'string') return item;
    if (item?.msg) return item.msg;
  }
  if (typeof data.title === 'string') return data.title;
  if (Array.isArray(data.title)) return data.title[0];
  if (typeof data.member_ids === 'string') return data.member_ids;
  if (Array.isArray(data.member_ids)) {
    const first = data.member_ids[0];
    return typeof first === 'string' ? first : 'Некорректный список участников';
  }
  const first = Object.values(data).flat?.()?.[0];
  return typeof first === 'string' ? first : 'Не удалось создать группу';
}

export function CreateGroupModal({
  chats = [],
  currentUserId,
  onCreate,
  onClose,
}) {
  const [step, setStep] = useState('name');
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedUsers, setSelectedUsers] = useState(() => new Map());
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const partners = useMemo(
    () => getDirectChatPartners(chats, currentUserId),
    [chats, currentUserId],
  );

  useEffect(() => {
    if (step !== 'members') return undefined;
    const value = query.trim();
    if (value.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(() => {
      chatsApi.searchUsers(value)
        .then(({ data }) => {
          if (cancelled) return;
          const list = (Array.isArray(data) ? data : [])
            .filter((item) => currentUserId == null || String(item.id) !== String(currentUserId));
          setSearchResults(list);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentUserId, query, step]);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byId = new Map();
    partners.forEach((user) => byId.set(String(user.id), user));
    if (q.length >= 2) {
      searchResults.forEach((user) => byId.set(String(user.id), user));
    }
    selectedUsers.forEach((user, id) => {
      if (!byId.has(id)) byId.set(id, user);
    });
    let list = Array.from(byId.values());
    if (q && q.length < 2) {
      list = list.filter((user) => {
        const nick = (user.nickname || '').toLowerCase();
        const first = (user.first_name || '').toLowerCase();
        const last = (user.last_name || '').toLowerCase();
        const full = `${first} ${last}`.trim();
        return nick.includes(q) || first.includes(q) || last.includes(q) || full.includes(q);
      });
    } else if (q.length >= 2) {
      // Prefer search hits first, then matching partners.
      const hitIds = new Set(searchResults.map((u) => String(u.id)));
      list = list.filter((user) => {
        if (hitIds.has(String(user.id))) return true;
        const nick = (user.nickname || '').toLowerCase();
        const first = (user.first_name || '').toLowerCase();
        const last = (user.last_name || '').toLowerCase();
        const full = `${first} ${last}`.trim();
        return nick.includes(q) || first.includes(q) || last.includes(q) || full.includes(q);
      });
    }
    return list.sort((a, b) => {
      const aSelected = selectedIds.has(String(a.id)) ? 0 : 1;
      const bSelected = selectedIds.has(String(b.id)) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      const an = (a.nickname || a.first_name || '').toLowerCase();
      const bn = (b.nickname || b.first_name || '').toLowerCase();
      return an.localeCompare(bn, 'ru');
    });
  }, [partners, query, searchResults, selectedIds, selectedUsers]);

  const trimmedTitle = title.trim();
  const canNext = trimmedTitle.length > 0 && trimmedTitle.length <= TITLE_MAX;
  const canCreate = selectedIds.size >= 1 && !submitting;

  const toggleMember = (user) => {
    if (!user?.id) return;
    const key = String(user.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, user);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    setError('');
    try {
      // Backend expects UUID strings in member_ids — never coerce to Number.
      await onCreate?.({
        title: trimmedTitle,
        member_ids: Array.from(selectedIds),
      });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="create-group-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="create-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="create-group-modal__header">
          <div>
            <h2 id="create-group-title">Новая группа</h2>
            <p className="create-group-modal__step">
              {step === 'name' ? 'Шаг 1 · Название' : 'Шаг 2 · Участники'}
            </p>
          </div>
          <button type="button" className="create-group-modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        {step === 'name' ? (
          <div className="create-group-modal__body">
            <label className="create-group-modal__label" htmlFor="create-group-name">
              Название группы
            </label>
            <input
              id="create-group-name"
              type="text"
              className="create-group-modal__input"
              value={title}
              maxLength={TITLE_MAX}
              autoFocus
              placeholder="Например, Команда"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canNext) {
                  event.preventDefault();
                  setStep('members');
                }
              }}
            />
            <div className="create-group-modal__hint">
              {trimmedTitle.length}/{TITLE_MAX}
            </div>
            <div className="create-group-modal__actions">
              <button type="button" className="create-group-modal__btn ghost" onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className="create-group-modal__btn primary"
                disabled={!canNext}
                onClick={() => setStep('members')}
              >
                Далее
              </button>
            </div>
          </div>
        ) : (
          <div className="create-group-modal__body">
            <p className="create-group-modal__group-name">{trimmedTitle}</p>
            <input
              type="search"
              className="create-group-modal__input"
              value={query}
              placeholder="Поиск по никам и диалогам"
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="create-group-modal__list" role="listbox" aria-label="Участники">
              {partners.length === 0 && query.trim().length < 2 && (
                <p className="create-group-modal__empty">
                  Выберите из диалогов или найдите пользователя (от 2 символов).
                </p>
              )}
              {searchLoading && query.trim().length >= 2 && (
                <p className="create-group-modal__empty">Поиск…</p>
              )}
              {!searchLoading && visibleUsers.length === 0 && query.trim().length >= 2 && (
                <p className="create-group-modal__empty">Никого не найдено</p>
              )}
              {visibleUsers.map((user) => {
                const checked = selectedIds.has(String(user.id));
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
                return (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={`create-group-modal__person${checked ? ' is-selected' : ''}`}
                    onClick={() => toggleMember(user)}
                  >
                    <span className={`create-group-modal__check${checked ? ' is-on' : ''}`} aria-hidden="true">
                      {checked ? '✓' : ''}
                    </span>
                    <UserAvatar user={user} size={40} />
                    <span className="create-group-modal__person-text">
                      <strong>@{user.nickname || 'user'}</strong>
                      {fullName ? <small>{fullName}</small> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {error && <p className="create-group-modal__error">{error}</p>}
            <div className="create-group-modal__actions">
              <button
                type="button"
                className="create-group-modal__btn ghost"
                disabled={submitting}
                onClick={() => {
                  setError('');
                  setStep('name');
                }}
              >
                Назад
              </button>
              <button
                type="button"
                className="create-group-modal__btn primary"
                disabled={!canCreate}
                onClick={handleCreate}
              >
                {submitting ? 'Создание…' : `Создать${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
