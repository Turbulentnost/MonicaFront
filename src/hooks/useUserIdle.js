import { useEffect, useState } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * Returns true when the user has been inactive for `idleMs`,
 * or when the document tab is hidden.
 */
export function useUserIdle(idleMs = 60_000) {
  const [idle, setIdle] = useState(() => Boolean(typeof document !== 'undefined' && document.hidden));

  useEffect(() => {
    let timer = null;

    const markIdle = () => setIdle(true);

    const bump = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        markIdle();
        return;
      }
      setIdle(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(markIdle, idleMs);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer);
        markIdle();
      } else {
        bump();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, bump, { passive: true });
    });
    document.addEventListener('visibilitychange', onVisibility);
    bump();

    return () => {
      if (timer) clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, bump);
      });
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [idleMs]);

  return idle;
}
