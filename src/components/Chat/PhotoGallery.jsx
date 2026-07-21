import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCachedMediaSrc, warmMediaCache } from '../../utils/mediaCache';

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

function GalleryThumb({ item, onOpen }) {
  const key = item.path;
  const remote = item.content_url;
  const [src, setSrc] = useState(() => getCachedMediaSrc(key, remote));

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedMediaSrc(key, remote);
    setSrc(cached);
    if (key && remote) {
      warmMediaCache(key, remote).then((url) => {
        if (!cancelled && url) setSrc(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key, remote]);

  if (!src) {
    return (
      <button type="button" className="photo-gallery__cell photo-gallery__cell--empty" onClick={onOpen}>
        Фото
      </button>
    );
  }

  return (
    <button type="button" className="photo-gallery__cell" onClick={onOpen}>
      <img src={src} alt={item.file_name || 'Фото'} loading="lazy" decoding="async" />
    </button>
  );
}

function PhotoLightbox({ items, index, onClose, onChange }) {
  const current = items[index];
  const key = current?.path;
  const remote = current?.content_url;
  const [src, setSrc] = useState(() => getCachedMediaSrc(key, remote));

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedMediaSrc(key, remote);
    setSrc(cached);
    if (key && remote) {
      warmMediaCache(key, remote).then((url) => {
        if (!cancelled && url) setSrc(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key, remote]);

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

  if (!current) return null;

  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
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
          <img src={src} alt={current.file_name || 'Фото'} className="photo-lightbox__image" />
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
    </div>
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
