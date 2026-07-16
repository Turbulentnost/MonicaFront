import { useEffect, useRef } from 'react';

const SECRET_SEQUENCE = ['KeyF', 'KeyR', 'KeyO', 'KeyN', 'KeyT'];

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Activates special Favorites view after F → R → O → N → T (no Shift/Ctrl).
 * Ignored while focus is in input/textarea. Session-only; not persisted.
 */
export function useSecretFavoritesShortcut(onUnlock, enabled = true) {
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !onUnlock) return undefined;

    function onKeyDown(event) {
      if (isTypingTarget(event.target)) return;

      const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
      if (isModifierOnly) return;

      const expectedCode = SECRET_SEQUENCE[indexRef.current];

      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        indexRef.current = 0;
        return;
      }

      if (event.code === expectedCode) {
        event.preventDefault();
        event.stopPropagation();
        indexRef.current += 1;

        if (indexRef.current === SECRET_SEQUENCE.length) {
          indexRef.current = 0;
          onUnlock();
        }
        return;
      }

      indexRef.current = 0;
    }

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [enabled, onUnlock]);
}
