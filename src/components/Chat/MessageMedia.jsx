import { useEffect, useState } from 'react';
import { getCachedMediaSrc, warmMediaCache } from '../../utils/mediaCache';

export function MessageMedia({ message }) {
  const mediaKey = message.content;
  const remoteUrl = message.content_url;
  const [src, setSrc] = useState(() => getCachedMediaSrc(mediaKey, remoteUrl));

  useEffect(() => {
    let cancelled = false;

    if (message.message_type === 'photo') {
      const cached = getCachedMediaSrc(mediaKey, remoteUrl);
      setSrc(cached);
      if (mediaKey && remoteUrl) {
        warmMediaCache(mediaKey, remoteUrl).then((url) => {
          if (!cancelled && url) setSrc(url);
        });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [mediaKey, remoteUrl, message.message_type]);

  if (message.message_type === 'photo') {
    if (!src) return <span className="message-content">Фото</span>;
    return (
      <img
        src={src}
        alt={message.file_name || 'Фото'}
        className="message-image"
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (message.message_type === 'file') {
    const label = message.file_name || 'Файл';
    const sizeLabel = message.file_size
      ? ` (${Math.round(message.file_size / 1024)} КБ)`
      : '';
    return (
      <a
        href={remoteUrl || '#'}
        className="message-file"
        target="_blank"
        rel="noopener noreferrer"
        download={message.file_name || undefined}
      >
        <span className="message-file-icon">📎</span>
        <span className="message-file-name">
          {label}
          {sizeLabel}
        </span>
      </a>
    );
  }

  return null;
}
