import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCachedMediaSrc, warmMediaCache } from '../../utils/mediaCache';

function getLightboxHost() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('.chats-page .chat-main') || document.body;
}

/** Telegram-like row sizes for 1–10 photos */
export function galleryRowSizes(count) {
  const n = Math.max(0, Math.min(10, count));
  if (n <= 1) return [1];
  if (n === 2) return [2];
  if (n === 3) return [3];
  if (n === 4) return [2, 2];
  if (n === 5) return [2, 3];
  if (n === 6) return [3, 3];
  if (n === 7) return [3, 4];
  if (n === 8) return [4, 4];
  if (n === 9) return [4, 5];
  return [5, 5];
}

const PREVIEW_MIN = 180;
const PREVIEW_MAX_W = 320;
const PREVIEW_MAX_H = 420;

function fitPhotoSize(naturalW, naturalH, { minSide, maxW, maxH }) {
  let w = Math.max(1, naturalW);
  let h = Math.max(1, naturalH);

  // Upscale tiny images so they stay readable in chat / lightbox.
  if (w < minSide && h < minSide) {
    const scale = minSide / Math.max(w, h);
    w *= scale;
    h *= scale;
  }

  const down = Math.min(1, maxW / w, maxH / h);
  return {
    width: Math.round(w * down),
    height: Math.round(h * down),
  };
}

function GalleryThumb({ item, onOpen, single = false }) {
  const key = item.path;
  const remote = item.content_url;
  const [src, setSrc] = useState(() => getCachedMediaSrc(key, remote));
  const [sizeStyle, setSizeStyle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedMediaSrc(key, remote);
    setSrc(cached);
    setSizeStyle(null);
    if (key && remote) {
      warmMediaCache(key, remote).then((url) => {
        if (!cancelled && url) setSrc(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key, remote]);

  const handleLoad = (event) => {
    if (!single) return;
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setSizeStyle(
      fitPhotoSize(naturalWidth, naturalHeight, {
        minSide: PREVIEW_MIN,
        maxW: PREVIEW_MAX_W,
        maxH: PREVIEW_MAX_H,
      })
    );
  };

  if (!src) {
    return (
      <button type="button" className="photo-gallery__cell photo-gallery__cell--empty" onClick={onOpen}>
        Фото
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`photo-gallery__cell${single ? ' photo-gallery__cell--single' : ''}`}
      onClick={onOpen}
    >
      <img
        src={src}
        alt={item.file_name || 'Фото'}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        style={single && sizeStyle ? sizeStyle : undefined}
      />
    </button>
  );
}

export function PhotoLightbox({ items, index, onClose, onChange }) {
  const current = items[index];
  const key = current?.path;
  const remote = current?.content_url;
  const [src, setSrc] = useState(() => getCachedMediaSrc(key, remote));
  const [host, setHost] = useState(null);
  const [sizeStyle, setSizeStyle] = useState(null);

  useEffect(() => {
    setHost(getLightboxHost());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedMediaSrc(key, remote);
    setSrc(cached);
    setSizeStyle(null);
    if (key && remote) {
      warmMediaCache(key, remote).then((url) => {
        if (!cancelled && url) setSrc(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key, remote]);

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    const maxW = Math.min(920, Math.floor(window.innerWidth * 0.9));
    const maxH = Math.floor(window.innerHeight * 0.82);
    const minSide = Math.min(360, Math.floor(Math.min(maxW, maxH) * 0.55));
    setSizeStyle(
      fitPhotoSize(naturalWidth, naturalHeight, {
        minSide,
        maxW,
        maxH,
      })
    );
  };

  const go = useCallback(
    (delta) => {
      if (!items.length) return;
      const next = (index + delta + items.length) % items.length;
      onChange(next);
    },
    [index, items.length, onChange],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  if (!current || !host) return null;

  const inChat = host !== document.body;

  return createPortal(
    <div
      className={`photo-lightbox${inChat ? ' photo-lightbox--chat' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="photo-lightbox__toolbar" onClick={(e) => e.stopPropagation()}>
        <span className="photo-lightbox__counter">
          {index + 1} / {items.length}
        </span>
        <button type="button" className="photo-lightbox__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      {items.length > 1 && (
        <button
          type="button"
          className="photo-lightbox__nav photo-lightbox__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="Предыдущее"
        >
          ‹
        </button>
      )}
      <div className="photo-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img
            src={src}
            alt={current.file_name || 'Фото'}
            className="photo-lightbox__image"
            onLoad={handleImageLoad}
            style={sizeStyle || undefined}
          />
        ) : (
          <div className="photo-lightbox__empty">Загрузка…</div>
        )}
      </div>
      {items.length > 1 && (
        <button
          type="button"
          className="photo-lightbox__nav photo-lightbox__nav--next"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="Следующее"
        >
          ›
        </button>
      )}
    </div>,
    host,
  );
}

export function PhotoGallery({ items }) {
  const photos = useMemo(
    () => (Array.isArray(items) ? items.filter((i) => i?.path || i?.content_url) : []).slice(0, 10),
    [items],
  );
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const rows = useMemo(() => galleryRowSizes(photos.length), [photos.length]);

  if (!photos.length) return null;

  let offset = 0;
  const rowBlocks = rows.map((size, rowIdx) => {
    const slice = photos.slice(offset, offset + size);
    offset += size;
    return (
      <div key={`row-${rowIdx}`} className="photo-gallery__row" style={{ '--gallery-cols': size }}>
        {slice.map((item, colIdx) => {
          const absoluteIndex = offset - size + colIdx;
          return (
            <GalleryThumb
              key={item.path || `${rowIdx}-${colIdx}`}
              item={item}
              single={photos.length === 1}
              onOpen={() => setLightboxIndex(absoluteIndex)}
            />
          );
        })}
      </div>
    );
  });

  return (
    <>
      <div className={`photo-gallery photo-gallery--n${photos.length}`}>{rowBlocks}</div>
      {lightboxIndex != null && (
        <PhotoLightbox
          items={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  );
}
