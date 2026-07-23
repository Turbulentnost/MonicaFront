import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'monica_send_icon';

const SEND_ICONS = [
  {
    id: 'plane',
    label: 'Самолёт',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3.4 11.2 20.1 3.7c.7-.3 1.4.4 1.1 1.1l-7.5 16.7c-.3.7-1.3.6-1.5-.2l-1.6-6.3-6.3-1.6c-.8-.2-.9-1.2-.2-1.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="m11.6 14.8 3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'plane-fill',
    label: 'Самолёт заливка',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.5 3.3c.4-.9-.5-1.8-1.4-1.4L2.8 9.4c-.9.4-.8 1.7.2 1.9l7.2 1.5 1.5 7.2c.2 1 1.5 1.1 1.9.2l7.5-17.3Z" />
      </svg>
    ),
  },
  {
    id: 'plane-up',
    label: 'Самолёт вверх',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.2 4.8 19.4c-.3.7.5 1.3 1.1.9L12 16.8l6.1 3.5c.6.4 1.4-.2 1.1-.9L12 3.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'send-right',
    label: 'Стрелка вправо',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="m12 5 7 7-7 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'send-corner',
    label: 'Отправка углом',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 19V8.5A3.5 3.5 0 0 1 8.5 5H19"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="m14 10 5-5M19 5v5M19 5h-5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'paper-fold',
    label: 'Сложенный лист',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.2 11.1 19.6 4.5c.8-.3 1.5.5 1.1 1.2L13.4 20c-.3.7-1.4.5-1.5-.3l-.7-6.4-6.4-.7c-.8-.1-1-1.2-.6-1.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="m11.2 13.2 8.2-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'circle-plane',
    label: 'В круге',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8.2 12.2 15.8 8.4c.4-.2.8.2.6.6l-3.8 7.6c-.2.4-.8.3-.9-.1l-.7-3.2-3.2-.7c-.4-.1-.5-.7-.1-.9Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: 'chevron-send',
    label: 'Шеврон',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m7 6 5 6-5 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m13 6 5 6-5 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'bolt-send',
    label: 'Молния',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 3 5.5 13.2c-.3.4 0 1 .5 1H11l-1 6.8c-.1.6.7 1 1.1.5L20.5 10.8c.3-.4 0-1-.5-1H14l1-6.3c.1-.6-.7-1-1-.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'rocket',
    label: 'Ракета',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14.5 4.2c2.8.4 5 2.6 5.4 5.4.2 1.7-.8 3.8-2.2 5.7l-1.4 1.8-1.8 1.4c-1.9 1.4-4 2.4-5.7 2.2-2.8-.4-5-2.6-5.4-5.4-.1-.8.1-1.8.5-2.8l2.8 2.8c.2 1.1 1.1 2 2.2 2.2l2.2-2.8 2.8-2.2c-.2-1.1-1.1-2-2.2-2.2L9.5 7.5c1-.4 2-.6 2.8-.5 1.1.1 1.8.2 2.2.2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="14.2" cy="9.8" r="1.2" fill="currentColor" />
        <path d="m6.2 17.8-.8 2.4 2.4-.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function readStoredIconId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SEND_ICONS.some((icon) => icon.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return SEND_ICONS[0].id;
}

export function SendIconButton({
  disabled = false,
  busy = false,
  title = 'Отправить',
  className = '',
}) {
  const buttonRef = useRef(null);
  const [iconId, setIconId] = useState(readStoredIconId);
  const index = Math.max(0, SEND_ICONS.findIndex((icon) => icon.id === iconId));
  const current = SEND_ICONS[index] || SEND_ICONS[0];
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, current.id);
    } catch {
      /* ignore */
    }
  }, [current.id]);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return undefined;

    const onWheel = (event) => {
      if (node.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const next = (indexRef.current + (event.deltaY > 0 ? 1 : -1) + SEND_ICONS.length) % SEND_ICONS.length;
      setIconId(SEND_ICONS[next].id);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="submit"
      className={['message-send-btn', className].filter(Boolean).join(' ')}
      disabled={disabled}
      title={`${title} · ${current.label} (скролл для смены)`}
      aria-label={`${title}. Иконка: ${current.label}. Наведите и прокрутите, чтобы сменить.`}
    >
      <span className="message-send-btn__icon" aria-hidden="true">
        {busy ? <span className="message-send-btn__busy">…</span> : current.svg}
      </span>
    </button>
  );
}

export const SEND_ICON_COUNT = SEND_ICONS.length;
