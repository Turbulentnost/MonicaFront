import { useEffect, useRef } from 'react';

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Fires onUnlock after a key sequence (no modifiers).
 * Ignored while focus is in input/textarea. Session-only.
 */
export function useSecretSequenceShortcut(sequence, onUnlock, enabled = true) {
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !onUnlock || !sequence?.length) return undefined;

    function onKeyDown(event) {
      if (isTypingTarget(event.target)) return;

      const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
      if (isModifierOnly) return;

      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        indexRef.current = 0;
        return;
      }

      const expectedCode = sequence[indexRef.current];

      if (event.code === expectedCode) {
        event.preventDefault();
        event.stopPropagation();
        indexRef.current += 1;

        if (indexRef.current === sequence.length) {
          indexRef.current = 0;
          onUnlock();
        }
        return;
      }

      indexRef.current = 0;
    }

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [enabled, onUnlock, sequence]);
}

const FRONT_SEQUENCE = ['KeyF', 'KeyR', 'KeyO', 'KeyN', 'KeyT'];
const BACK_SEQUENCE = ['KeyB', 'KeyA', 'KeyC', 'KeyK'];

/** @deprecated Prefer useSecretSequenceShortcut(FRONT_SEQUENCE, ...) */
export function useSecretFavoritesShortcut(onUnlock, enabled = true) {
  useSecretSequenceShortcut(FRONT_SEQUENCE, onUnlock, enabled);
}

export { FRONT_SEQUENCE, BACK_SEQUENCE };
