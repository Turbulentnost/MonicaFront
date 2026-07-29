import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persistable panel width with mouse drag resize.
 * @param {string} storageKey
 * @param {{ defaultWidth: number, min: number, max: number }} options
 * @param {1 | -1} direction 1 = drag right grows, -1 = drag left grows (right panel)
 */
export function useResizableWidth(storageKey, { defaultWidth, min, max }, direction = 1) {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return defaultWidth;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Math.min(max, Math.max(min, Math.round(parsed)));
      }
    } catch {
      /* ignore */
    }
    return defaultWidth;
  });

  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(Math.round(width)));
    } catch {
      /* ignore */
    }
  }, [storageKey, width]);

  const beginResize = useCallback((event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = widthRef.current;
    document.body.classList.add('is-resizing-panels');

    const onMove = (moveEvent) => {
      const delta = (moveEvent.clientX - startX) * direction;
      const next = Math.min(max, Math.max(min, Math.round(startWidth + delta)));
      setWidth(next);
    };

    const onUp = () => {
      document.body.classList.remove('is-resizing-panels');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [direction, max, min]);

  return { width, setWidth, beginResize, min, max };
}
