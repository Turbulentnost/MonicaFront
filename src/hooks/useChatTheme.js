import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_ID,
  getThemeById,
  readStoredThemeId,
  storeThemeId,
} from '../themes/chatThemes';

const THEME_EVENT = 'monica-theme-change';

export function useChatTheme() {
  const [themeId, setThemeIdState] = useState(() => readStoredThemeId());
  const theme = getThemeById(themeId);

  const setThemeId = useCallback((nextId) => {
    const resolved = getThemeById(nextId).id;
    storeThemeId(resolved);
    setThemeIdState(resolved);
    try {
      window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: resolved }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onCustom = (event) => {
      const next = event?.detail;
      if (typeof next === 'string') setThemeIdState(getThemeById(next).id);
    };
    const onStorage = (event) => {
      if (event.key !== 'monica_chat_theme') return;
      setThemeIdState(readStoredThemeId());
    };
    window.addEventListener(THEME_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return {
    themeId: theme.id || DEFAULT_THEME_ID,
    theme,
    setThemeId,
  };
}
