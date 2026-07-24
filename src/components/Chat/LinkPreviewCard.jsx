import { useEffect, useState } from 'react';
import { chatsApi } from '../../api/client';
import { firstUrl } from '../../utils/linkifyText';

const previewCache = new Map();
const inflight = new Map();

async function loadPreview(url) {
  if (previewCache.has(url)) return previewCache.get(url);
  if (inflight.has(url)) return inflight.get(url);

  const promise = chatsApi
    .linkPreview(url)
    .then((res) => {
      const data = res.data || null;
      previewCache.set(url, data);
      return data;
    })
    .catch(() => {
      previewCache.set(url, null);
      return null;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise;
}

export function LinkPreviewCard({ text, className = '' }) {
  const link = firstUrl(text);
  const [preview, setPreview] = useState(() => (link ? previewCache.get(link.href) : null));
  const [failed, setFailed] = useState(() => (link ? previewCache.get(link.href) === null : false));

  useEffect(() => {
    if (!link?.href) {
      setPreview(null);
      setFailed(false);
      return undefined;
    }
    let cancelled = false;
    const cached = previewCache.get(link.href);
    if (cached !== undefined) {
      setPreview(cached);
      setFailed(cached === null);
      return undefined;
    }
    setPreview(undefined);
    setFailed(false);
    loadPreview(link.href).then((data) => {
      if (cancelled) return;
      setPreview(data);
      setFailed(!data);
    });
    return () => {
      cancelled = true;
    };
  }, [link?.href]);

  if (!link || failed || preview === null) return null;
  if (preview === undefined) return null;

  const title = preview.title || preview.site_name || link.href;
  const description = preview.description || '';
  const favicon = preview.favicon || '';
  const site = preview.site_name || '';

  return (
    <a
      className={`message-link-preview ${className}`.trim()}
      href={preview.url || link.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="message-link-preview__icon" aria-hidden="true">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="message-link-preview__icon-fallback">🔗</span>
        )}
      </span>
      <span className="message-link-preview__body">
        {site ? <span className="message-link-preview__site">{site}</span> : null}
        <span className="message-link-preview__title">{title}</span>
        {description ? (
          <span className="message-link-preview__desc">{description}</span>
        ) : null}
      </span>
    </a>
  );
}
