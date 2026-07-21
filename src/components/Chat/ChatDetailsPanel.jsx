import { useEffect, useMemo, useState } from 'react';
import { chatsApi } from '../../api/client';
import { UserAvatar } from './UserAvatar';

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

function flattenFiles(messages) {
  const result = [];
  const seen = new Set();

  (messages || []).forEach((message) => {
    const items = Array.isArray(message.attachments) && message.attachments.length
      ? message.attachments
      : [{
          path: message.content,
          content_url: message.content_url,
          file_name: message.file_name,
          mime_type: message.mime_type,
          file_size: message.file_size,
        }];

    items.forEach((item, index) => {
      const key = item.path || item.content_url || `${message.id}-${index}`;
      if (!item.content_url || seen.has(key)) return;
      seen.add(key);
      const fallbackName = message.message_type === 'photo'
        ? `Фото ${new Date(message.sent_at).toLocaleDateString('ru-RU')}`
        : 'Файл';
      const name = item.file_name || message.file_name || fallbackName;
      const mimeType = item.mime_type || message.mime_type || '';
      const size = item.file_size ?? message.file_size;
      const type = fileTypeLabel(mimeType, name);
      const sizeLabel = formatFileSize(size);
      result.push({
        id: key,
        name,
        meta: [type, sizeLabel].filter(Boolean).join(' · '),
        color: fileColor(mimeType, name),
        url: item.content_url,
      });
    });
  });

  return result;
}

export function ChatDetailsPanel({
  chatId,
  partner,
  isOnline,
  onClose,
  specialMode = false,
}) {
  const [fileMessages, setFileMessages] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState('');
  const [showAllFiles, setShowAllFiles] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShowAllFiles(false);
    setFileMessages([]);
    setFilesError('');
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

  const files = useMemo(() => flattenFiles(fileMessages), [fileMessages]);
  const visibleFiles = showAllFiles ? files : files.slice(0, 5);

  if (!partner) return null;

  return (
    <aside className={`chat-details ${specialMode ? 'chat-details--special' : ''}`} aria-label="Детали чата">
      <div className="chat-details__header">
        <h2 className="chat-details__title">{specialMode ? 'workspace' : 'Детали'}</h2>
        <button type="button" className="chat-details__close" onClick={onClose} aria-label="Закрыть панель">
          ×
        </button>
      </div>

      {specialMode && (
        <div className="chat-details__dev-icon" aria-hidden="true">
          <span>{'</>'}</span>
        </div>
      )}

      <div className="chat-details__profile">
        {!specialMode && <UserAvatar user={partner} size={56} showOnline isOnline={isOnline} />}
        <h3 className="chat-details__name">
          {specialMode ? (
            <>
              <span className="chat-details__hash">#</span>
              {partner.nickname}
            </>
          ) : (
            `@${partner.nickname}`
          )}
        </h3>
        <p className="chat-details__sub">
          {specialMode
            ? `${partner.first_name} ${partner.last_name} · dev channel`
            : `${partner.first_name} ${partner.last_name}`}
        </p>
      </div>

      {specialMode && (
        <div className="chat-details__quick-actions">
          {['Mute', 'Pin', 'Members', 'More'].map((label) => (
            <button key={label} type="button" className="chat-details__quick-btn" aria-label={label}>
              <span>{label[0]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-details__tabs" role="tablist">
        {TABS.map((tab, i) => (
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

      {specialMode && (
        <div className="chat-details__about">
          <p>Frontend workspace для команды. Ship fast, break nothing.</p>
          <button type="button" className="chat-details__link">Edit description</button>
        </div>
      )}

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
              <FileIcon color={file.color} />
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

      {specialMode && (
        <div className="chat-details__section chat-details__section--integrations">
          <div className="chat-details__section-head">
            <span>Integrations</span>
            <button type="button" className="chat-details__link">See all</button>
          </div>
          <ul className="chat-details__integrations">
            {INTEGRATIONS.map((item) => (
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
