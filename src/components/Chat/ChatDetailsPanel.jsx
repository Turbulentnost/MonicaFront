import { useEffect, useMemo, useRef, useState } from 'react';
import { chatsApi } from '../../api/client';
import { getCachedMediaSrc, warmMediaCache } from '../../utils/mediaCache';
import { getPhotoCaption, looksLikeStoragePath } from '../../utils/messageText';
import {
  clearChatBackground,
  fileToBackgroundDataUrl,
  getChatBackground,
  setChatBackground,
} from '../../utils/chatBackground';
import pngIcon from '../../design-references/icons/png-svgrepo-com.svg';
import { FileTypeIcon } from './FileTypeIcon';
import { PhotoLightbox } from './PhotoGallery';
import { UserAvatar } from './UserAvatar';

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
  if (message.message_type === 'text') return (message.content || '').trim();
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
  partner,
  isOnline,
  onClose,
  specialMode = false,
  backMode = false,
  onJumpToMessage,
  onBackgroundChange,
}) {
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
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState('');
  const [hasCustomBg, setHasCustomBg] = useState(false);
  const menuRef = useRef(null);
  const bgInputRef = useRef(null);

  useEffect(() => {
    setHasCustomBg(Boolean(getChatBackground(chatId)));
    setMenuOpen(false);
    setBgModalOpen(false);
    setBgError('');
  }, [chatId]);

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

  const applyBackground = (dataUrl) => {
    const ok = setChatBackground(chatId, dataUrl);
    if (!ok) {
      setBgError('Не удалось сохранить фон (файл слишком большой)');
      return false;
    }
    setHasCustomBg(Boolean(dataUrl));
    onBackgroundChange?.(dataUrl || null);
    return true;
  };

  const handleBackgroundFile = async (file) => {
    if (!file) return;
    setBgBusy(true);
    setBgError('');
    try {
      const dataUrl = await fileToBackgroundDataUrl(file);
      if (applyBackground(dataUrl)) {
        setBgModalOpen(false);
      }
    } catch {
      setBgError('Не удалось обработать изображение');
    } finally {
      setBgBusy(false);
    }
  };

  const handleResetBackground = () => {
    if (applyBackground(null)) {
      setBgModalOpen(false);
      setMenuOpen(false);
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

  // Members tab: retry media load if the shared files request previously failed.
  useEffect(() => {
    if (activeTab !== 'members' || !chatId || filesLoading || !filesError) return undefined;

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
  }, [activeTab, chatId, filesLoading, filesError]);

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

  if (!partner) return null;

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
        <div className="chat-details__header-actions" ref={menuRef}>
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
                  setBgModalOpen(true);
                }}
              >
                <img src={pngIcon} alt="" className="chat-details__menu-icon" draggable={false} />
                <span>Изменить фон</span>
              </button>
              {hasCustomBg && (
                <button
                  type="button"
                  role="menuitem"
                  className="chat-details__menu-item chat-details__menu-item--muted"
                  onClick={handleResetBackground}
                >
                  <span className="chat-details__menu-icon chat-details__menu-icon--text">↺</span>
                  <span>Сбросить фон</span>
                </button>
              )}
            </div>
          )}
          <button type="button" className="chat-details__close" onClick={onClose} aria-label="Закрыть панель">
            ×
          </button>
        </div>
      </div>

      {bgModalOpen && (
        <div
          className="chat-details__bg-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Изменить фон чата"
        >
          <div className="chat-details__bg-modal-card">
            <div className="chat-details__bg-modal-head">
              <strong>Фон чата</strong>
              <button
                type="button"
                className="chat-details__close"
                onClick={() => setBgModalOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
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
            {hasCustomBg && (
              <button
                type="button"
                className="chat-details__bg-reset"
                onClick={handleResetBackground}
                disabled={bgBusy}
              >
                Сбросить фон
              </button>
            )}
          </div>
        </div>
      )}

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
          <UserAvatar
            user={partner}
            size={56}
            showOnline={!backMode}
            isOnline={backMode ? false : isOnline}
          />
        )}
        <h3 className="chat-details__name">
          {backMode
            ? `${partner.first_name} ${partner.last_name}`
            : specialMode
              ? (
                <>
                  <span className="chat-details__hash">#</span>
                  {`${partner.first_name} ${partner.last_name}`.trim() || partner.nickname}
                </>
              )
              : `${partner.first_name} ${partner.last_name}`}
        </h3>
        <p className="chat-details__sub">
          {backMode
            ? `@${partner.nickname} · давно ушёл`
            : specialMode
              ? `@${partner.nickname} · dev channel`
              : `@${partner.nickname}`}
        </p>
      </div>

      <div className="chat-details__search">
        <label className="chat-details__search-label" htmlFor="chat-details-search">
          {specialMode ? 'Search messages' : 'Поиск по чату'}
        </label>
        <input
          id="chat-details-search"
          type="search"
          className="chat-details__search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={specialMode ? 'Find in channel…' : 'Найти сообщение…'}
          autoComplete="off"
        />
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
        {TABS.map((tab) => (
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

      {activeTab === 'members' && (
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
