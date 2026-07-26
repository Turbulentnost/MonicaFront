import { useEffect, useMemo, useRef, useState } from 'react';
import { chatsApi } from '../../api/client';
import { getCachedMediaSrc, warmMediaCache } from '../../utils/mediaCache';
import { getPhotoCaption, looksLikeStoragePath } from '../../utils/messageText';
import {
  clearChatBackground,
  fileToBackgroundFile,
} from '../../utils/chatBackground';
import pngIcon from '../../design-references/icons/png-svgrepo-com.svg';
import {
  formatMembersCount,
  getChatTitle,
  getGroupAvatarUser,
  getMembersCount,
  isFavoritesChat,
  isGroupChat,
} from '../../utils/chatDisplay';
import { FileTypeIcon } from './FileTypeIcon';
import { PhotoLightbox } from './PhotoGallery';
import { UserAvatar } from './UserAvatar';
import { FavoritesAvatar } from './FavoritesAvatar';

function MoreDotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

const TABS = [
  { id: 'shared', label: 'Files' },
  { id: 'members', label: 'Members' },
  { id: 'pinned', label: 'Pinned' },
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

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return '';
  const size = Number(bytes);
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`;
}

function fileTypeLabel(mimeType, name) {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toUpperCase();
  if (mime.startsWith('image/')) return 'Изображение';
  if (mime === 'application/pdf') return 'PDF';
  return ext && ext !== name?.toUpperCase() ? ext : 'Файл';
}

function fileColor(mimeType, name) {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (mime.startsWith('image/')) return '#38bdf8';
  if (mime === 'application/pdf' || ext === 'pdf') return '#ef4444';
  if (['zip', 'rar', '7z'].includes(ext)) return '#eab308';
  if (['py', 'js', 'ts', 'json', 'yaml', 'yml'].includes(ext)) return '#a78bfa';
  return '#94a3b8';
}

function attachmentItems(message) {
  if (Array.isArray(message.attachments) && message.attachments.length) {
    return message.attachments;
  }
  return [{
    path: message.content,
    content_url: message.content_url,
    file_name: message.file_name,
    mime_type: message.mime_type,
    file_size: message.file_size,
  }];
}

function flattenFiles(messages) {
  const result = [];
  const seen = new Set();

  (messages || []).forEach((message) => {
    if (message.message_type === 'photo') return;
    attachmentItems(message).forEach((item, index) => {
      const key = item.path || item.content_url || `${message.id}-${index}`;
      if (!item.content_url || seen.has(key)) return;
      seen.add(key);
      const name = item.file_name || message.file_name || 'Файл';
      const mimeType = item.mime_type || message.mime_type || '';
      const size = item.file_size ?? message.file_size;
      const type = fileTypeLabel(mimeType, name);
      const sizeLabel = formatFileSize(size);
      result.push({
        id: key,
        name,
        mimeType,
        meta: [type, sizeLabel].filter(Boolean).join(' · '),
        color: fileColor(mimeType, name),
        url: item.content_url,
      });
    });
  });

  return result;
}

function flattenPhotos(messages) {
  const result = [];
  const seen = new Set();

  (messages || []).forEach((message) => {
    if (message.message_type !== 'photo') return;
    attachmentItems(message).forEach((item, index) => {
      const key = item.path || item.content_url || `${message.id}-${index}`;
      if (!item.content_url || seen.has(key)) return;
      seen.add(key);
      result.push({
        path: item.path || key,
        content_url: item.content_url,
        file_name: item.file_name || message.file_name || 'Фото',
        messageId: message.id,
        sentAt: message.sent_at,
      });
    });
  });

  return result;
}

function DetailsPhotoThumb({ item, onOpen }) {
  const [src, setSrc] = useState(() => getCachedMediaSrc(item.path, item.content_url));

  useEffect(() => {
    let cancelled = false;
    setSrc(getCachedMediaSrc(item.path, item.content_url));
    if (item.path && item.content_url) {
      warmMediaCache(item.path, item.content_url).then((url) => {
        if (!cancelled && url) setSrc(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [item.path, item.content_url]);

  return (
    <button type="button" className="chat-details__photo-cell" onClick={onOpen}>
      {src ? (
        <img src={src} alt={item.file_name || 'Фото'} loading="lazy" decoding="async" />
      ) : (
        <span>Фото</span>
      )}
    </button>
  );
}

function formatSearchTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSearchPreview(message) {
  if (!message) return '';
  if (message.message_type === 'text') {
    const content = (message.content || '').trim();
    if (content.startsWith('monica-sticker')) return 'Стикер';
    return content;
  }
  if (message.message_type === 'photo') {
    const caption = getPhotoCaption(message);
    return caption || 'Фото';
  }
  if (message.message_type === 'file') {
    return message.file_name || 'Файл';
  }
  if (message.message_type === 'voice') return 'Голосовое сообщение';
  if (message.message_type === 'forward') {
    return message.content || 'Пересланные сообщения';
  }
  if (message.message_type === 'call') return message.content || 'Звонок';
  if (message.message_type === 'code') {
    return message.file_name || 'Код';
  }
  const content = (message.content || '').trim();
  if (!content || looksLikeStoragePath(content)) {
    return message.file_name || 'Сообщение';
  }
  return content;
}

export function ChatDetailsPanel({
  chatId,
  chat = null,
  partner,
  isOnline,
  onClose,
  specialMode = false,
  backMode = false,
  onJumpToMessage,
  onBackgroundChange,
  backgroundUrl = null,
  currentUserId = null,
  panelWidth,
  searchOpen = false,
  searchFocusSeq = 0,
  onSearchOpenChange,
  onCloseSearch,
}) {
  const group = isGroupChat(chat);
  const favorites = isFavoritesChat(chat, currentUserId);
  const members = Array.isArray(chat?.members) ? chat.members : [];
  const displayUser = group ? getGroupAvatarUser(chat) : partner;
  const [activeTab, setActiveTab] = useState('shared');
  const [fileMessages, setFileMessages] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState('');
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bgEditorOpen, setBgEditorOpen] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState('');
  const [hasCustomBg, setHasCustomBg] = useState(false);
  const menuRef = useRef(null);
  const bgInputRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setHasCustomBg(Boolean(backgroundUrl));
    setMenuOpen(false);
    setBgEditorOpen(false);
    setBgError('');
  }, [chatId, backgroundUrl]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return undefined;
    }
    // Wait for panel enter animation, then focus search.
    const timer = window.setTimeout(() => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: false });
      input.select();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchOpen, searchFocusSeq, chatId]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseSearch?.();
      onSearchOpenChange?.(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCloseSearch, onSearchOpenChange, searchOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleBackgroundFile = async (file) => {
    if (!file || !chatId) return;
    setBgBusy(true);
    setBgError('');
    try {
      const prepared = await fileToBackgroundFile(file);
      const { data } = await chatsApi.uploadBackground(chatId, prepared);
      const url = data?.background_url || null;
      clearChatBackground(chatId);
      setHasCustomBg(Boolean(url));
      onBackgroundChange?.(url);
    } catch {
      setBgError('Не удалось загрузить фон');
    } finally {
      setBgBusy(false);
    }
  };

  const handleResetBackground = async () => {
    if (!chatId) return;
    setBgBusy(true);
    setBgError('');
    try {
      await chatsApi.deleteBackground(chatId);
      clearChatBackground(chatId);
      setHasCustomBg(false);
      onBackgroundChange?.(null);
      setMenuOpen(false);
    } catch {
      setBgError('Не удалось сбросить фон');
    } finally {
      setBgBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setActiveTab('shared');
    setShowAllFiles(false);
    setFileMessages([]);
    setFilesError('');
    setLightboxIndex(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    if (!chatId) return undefined;

    setFilesLoading(true);
    chatsApi.files(chatId)
      .then(({ data }) => {
        if (!cancelled) setFileMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFilesError('Не удалось загрузить файлы');
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // Members tab (direct chats): retry media load if the shared files request previously failed.
  useEffect(() => {
    if (group || activeTab !== 'members' || !chatId || filesLoading || !filesError) return undefined;

    let cancelled = false;
    setFilesLoading(true);
    setFilesError('');
    chatsApi.files(chatId)
      .then(({ data }) => {
        if (!cancelled) setFileMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFilesError('Не удалось загрузить фотографии');
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [group, activeTab, chatId, filesLoading, filesError]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!chatId || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError('');
      return undefined;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError('');
    const timer = setTimeout(() => {
      chatsApi.messages(chatId, { q: query, limit: 40 })
        .then(({ data }) => {
          if (!cancelled) setSearchResults(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
            setSearchError('Не удалось выполнить поиск');
          }
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chatId, searchQuery]);

  const files = useMemo(() => flattenFiles(fileMessages), [fileMessages]);
  const photos = useMemo(() => flattenPhotos(fileMessages), [fileMessages]);
  const visibleFiles = showAllFiles ? files : files.slice(0, 5);
  const searchActive = searchQuery.trim().length >= 2;
  const photosLoading = filesLoading;
  const photosError = filesError;
  const tabs = useMemo(() => (
    group
      ? [
        { id: 'shared', label: specialMode ? 'Files' : 'Файлы' },
        { id: 'members', label: specialMode ? 'Members' : 'Участники' },
        { id: 'pinned', label: specialMode ? 'Pinned' : 'Закреп' },
      ]
      : TABS
  ), [group, specialMode]);

  if (!group && !favorites && !partner) return null;

  const panelClass = [
    'chat-details',
    specialMode ? 'chat-details--special' : '',
    backMode ? 'chat-details--back' : '',
    group ? 'chat-details--group' : '',
    favorites ? 'chat-details--favorites' : '',
    searchOpen ? 'chat-details--search-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const profileTitle = favorites
    ? 'Избранное'
    : group
      ? getChatTitle(chat, currentUserId)
      : backMode
        ? `${partner.first_name} ${partner.last_name}`
        : specialMode
          ? (`${partner.first_name} ${partner.last_name}`.trim() || partner.nickname)
          : `${partner.first_name} ${partner.last_name}`;

  const profileSub = favorites
    ? 'Заметки и сохранённое'
    : group
      ? formatMembersCount(getMembersCount(chat))
      : backMode
        ? `@${partner.nickname} · давно ушёл`
        : specialMode
          ? `@${partner.nickname} · dev channel`
          : `@${partner.nickname}`;

  return (
    <aside
      className={panelClass}
      aria-label="Детали чата"
      style={panelWidth ? { width: panelWidth } : undefined}
    >
      <div className="chat-details__header">
        <h2 className="chat-details__title">
          {bgEditorOpen
            ? 'Фон чата'
            : backMode
              ? 'архив сожалений'
              : specialMode
                ? 'workspace'
                : 'Детали'}
        </h2>
        <div className="chat-details__header-actions" ref={menuRef}>
          {!bgEditorOpen && (
            <>
              <button
                type="button"
                className={`chat-details__menu-btn${menuOpen ? ' is-open' : ''}`}
                aria-label="Меню настроек чата"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Меню"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreDotsIcon />
              </button>
              {menuOpen && (
                <div className="chat-details__menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="chat-details__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setBgError('');
                      setBgEditorOpen(true);
                    }}
                  >
                    <img src={pngIcon} alt="" className="chat-details__menu-icon" draggable={false} />
                    <span>Изменить фон</span>
                  </button>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            className="chat-details__close"
            onClick={() => {
              if (bgEditorOpen) {
                setBgEditorOpen(false);
                setBgError('');
                return;
              }
              onClose();
            }}
            aria-label={bgEditorOpen ? 'Назад к деталям' : 'Закрыть панель'}
            title={bgEditorOpen ? 'Назад' : 'Закрыть'}
          >
            ×
          </button>
        </div>
      </div>

      {bgEditorOpen ? (
        <div className="chat-details__bg-editor">
          <div className="chat-details__bg-editor-body">
            <label
              className={`chat-details__bg-dropzone${bgBusy ? ' is-busy' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const file = event.dataTransfer?.files?.[0];
                if (file) handleBackgroundFile(file);
              }}
            >
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={bgBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) handleBackgroundFile(file);
                }}
              />
              <img src={pngIcon} alt="" className="chat-details__bg-dropzone-icon" draggable={false} />
              <span className="chat-details__bg-dropzone-title">
                {bgBusy ? 'Обработка…' : 'Загрузите изображение'}
              </span>
              <span className="chat-details__bg-dropzone-hint">
                Перетащите файл сюда или нажмите, чтобы выбрать
              </span>
            </label>
            {bgError ? <p className="chat-details__bg-error">{bgError}</p> : null}
          </div>
          <div className="chat-details__bg-editor-footer">
            <button
              type="button"
              className="chat-details__bg-reset"
              onClick={handleResetBackground}
              disabled={bgBusy || !hasCustomBg}
            >
              Вернуть по умолчанию
            </button>
          </div>
        </div>
      ) : (
        <>
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
        {!specialMode && (
          favorites ? (
            <FavoritesAvatar size={56} className="chat-details__avatar--favorites" />
          ) : (
            <UserAvatar
              user={displayUser}
              size={56}
              showOnline={!backMode && !group}
              isOnline={backMode || group ? false : isOnline}
              className={group ? 'chat-details__avatar--group' : ''}
            />
          )
        )}
        <h3 className="chat-details__name">
          {specialMode && !group ? (
            <>
              <span className="chat-details__hash">#</span>
              {profileTitle}
            </>
          ) : profileTitle}
        </h3>
        <p className="chat-details__sub">{profileSub}</p>
      </div>

      {searchOpen && (
        <div className="chat-details__search" role="search">
          <div className="chat-details__search-head">
            <label className="chat-details__search-label" htmlFor="chat-details-search">
              {specialMode ? 'Search messages' : 'Поиск по чату'}
            </label>
            <button
              type="button"
              className="chat-details__search-close"
              onClick={() => {
                onCloseSearch?.();
                onSearchOpenChange?.(false);
              }}
              aria-label={specialMode ? 'Close search' : 'Закрыть поиск'}
              title={specialMode ? 'Esc' : 'Esc — закрыть'}
            >
              ×
            </button>
          </div>
          <input
            ref={searchInputRef}
            id="chat-details-search"
            type="search"
            className="chat-details__search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={specialMode ? 'Find in channel…' : 'Найти сообщение…'}
            autoComplete="off"
            enterKeyHint="search"
          />
          <p className="chat-details__search-hint">
            {specialMode ? 'Esc to close · Ctrl+F to refocus' : 'Esc — закрыть · Ctrl+F — снова в поиск'}
          </p>
          {searchActive && (
            <div className="chat-details__search-results" role="listbox" aria-label="Результаты поиска">
              {searchLoading && (
                <p className="chat-details__placeholder">Поиск…</p>
              )}
              {!searchLoading && searchError && (
                <p className="chat-details__placeholder">{searchError}</p>
              )}
              {!searchLoading && !searchError && searchResults.length === 0 && (
                <p className="chat-details__placeholder">Ничего не найдено</p>
              )}
              {!searchLoading && !searchError && searchResults.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  className="chat-details__search-item"
                  onClick={() => onJumpToMessage?.(message.id)}
                >
                  <span className="chat-details__search-item-text">
                    {getSearchPreview(message)}
                  </span>
                  <span className="chat-details__search-item-meta">
                    @{message.sender?.nickname || 'user'} · {formatSearchTime(message.sent_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`chat-details__tab ${activeTab === tab.id ? 'chat-details__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {specialMode && !backMode && activeTab === 'shared' && (
        <div className="chat-details__about">
          <p>Frontend workspace для команды. Ship fast, break nothing.</p>
          <button type="button" className="chat-details__link">Edit description</button>
        </div>
      )}

      {backMode && activeTab === 'shared' && (
        <div className="chat-details__about chat-details__about--back">
          <p>Здесь когда-то был смысл. Теперь только эхо неотправленных коммитов.</p>
          <button type="button" className="chat-details__link" disabled>
            Слишком поздно редактировать
          </button>
        </div>
      )}

      {activeTab === 'shared' && (
        <div className="chat-details__section">
          <div className="chat-details__section-head">
            <span>{specialMode ? 'Recent files' : 'Файлы'}</span>
            {files.length > 5 && (
              <button
                type="button"
                className="chat-details__link"
                onClick={() => setShowAllFiles((value) => !value)}
              >
                {showAllFiles
                  ? (specialMode ? 'Show less' : 'Свернуть')
                  : (specialMode ? 'See all' : 'Все файлы')}
              </button>
            )}
          </div>
          <ul className="chat-details__files">
            {visibleFiles.map((file) => (
              <li key={file.id} className="chat-details__file">
                <span className="chat-details__file-icon">
                  <FileTypeIcon fileName={file.name} mimeType={file.mimeType} size="md" />
                </span>
                <div className="chat-details__file-info">
                  <span className="chat-details__file-name">{file.name}</span>
                  <span className="chat-details__file-meta">{file.meta}</span>
                </div>
                <a
                  href={file.url}
                  className="chat-details__file-dl"
                  aria-label={`Скачать ${file.name}`}
                  title="Скачать"
                  target="_blank"
                  rel="noopener noreferrer"
                  download={file.name}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          {filesLoading && <p className="chat-details__placeholder">Загрузка файлов…</p>}
          {!filesLoading && filesError && (
            <p className="chat-details__placeholder">{filesError}</p>
          )}
          {!filesLoading && !filesError && files.length === 0 && (
            <p className="chat-details__placeholder">В истории чата пока нет файлов</p>
          )}
        </div>
      )}

      {activeTab === 'members' && group && (
        <div className="chat-details__section">
          <div className="chat-details__section-head">
            <span>{specialMode ? 'Members' : 'Участники'}</span>
            {members.length > 0 && (
              <span className="chat-details__count">{members.length}</span>
            )}
          </div>
          {members.length === 0 ? (
            <p className="chat-details__placeholder">
              Список участников появится после ответа сервера
            </p>
          ) : (
            <ul className="chat-details__members">
              {members.map((member) => {
                const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ');
                return (
                  <li key={member.id} className="chat-details__member">
                    <UserAvatar user={member} size={40} />
                    <span className="chat-details__member-text">
                      <strong>@{member.nickname || 'user'}</strong>
                      {fullName ? <small>{fullName}</small> : null}
                      {member.role ? (
                        <em className="chat-details__member-role">
                          {member.role === 'owner'
                            ? 'владелец'
                            : member.role === 'admin'
                              ? 'админ'
                              : 'участник'}
                        </em>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'members' && !group && (
        <div className="chat-details__section">
          <div className="chat-details__section-head">
            <span>{specialMode ? 'Shared photos' : 'Фотографии'}</span>
            {!photosLoading && photos.length > 0 && (
              <span className="chat-details__count">{photos.length}</span>
            )}
          </div>
          {photosLoading && <p className="chat-details__placeholder">Загрузка фотографий…</p>}
          {!photosLoading && photosError && (
            <p className="chat-details__placeholder">{photosError}</p>
          )}
          {!photosLoading && !photosError && photos.length === 0 && (
            <p className="chat-details__placeholder">В этом чате пока нет фотографий</p>
          )}
          {!photosLoading && !photosError && photos.length > 0 && (
            <div className="chat-details__photo-grid">
              {photos.map((item, index) => (
                <DetailsPhotoThumb
                  key={item.path || item.content_url || index}
                  item={item}
                  onOpen={() => setLightboxIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pinned' && (
        <div className="chat-details__section">
          <p className="chat-details__placeholder">
            {specialMode ? 'No pinned messages yet' : 'Закреплённых сообщений пока нет'}
          </p>
        </div>
      )}

      {(specialMode || backMode) && activeTab === 'shared' && (
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
        </>
      )}

      {lightboxIndex != null && photos[lightboxIndex] && (
        <PhotoLightbox
          items={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </aside>
  );
}
