import { useEffect, useRef, useState } from 'react';

function pluralMessages(count) {
  const n = Math.abs(Number(count) || 0);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сообщение';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'сообщения';
  return 'сообщений';
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5 17.5 10.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Крышка */}
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Ручка крышки */}
      <path
        d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Корпус корзины */}
      <path
        d="M6.5 7 7.5 19.2A2 2 0 0 0 9.5 21h5a2 2 0 0 0 2-1.8L17.5 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Вертикальные линии внутри */}
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SelectionHeader({
  count,
  onClose,
  canEdit = false,
  canDeleteForEveryone = false,
  onEdit,
  onDeleteMe,
  onDeleteEveryone,
}) {
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    if (!deleteMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (!actionsRef.current?.contains(event.target)) {
        setDeleteMenuOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setDeleteMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [deleteMenuOpen]);

  useEffect(() => {
    setDeleteMenuOpen(false);
  }, [count, canDeleteForEveryone]);

  const handleDeleteClick = () => {
    if (canDeleteForEveryone) {
      setDeleteMenuOpen((open) => !open);
      return;
    }
    onDeleteMe?.();
  };

  return (
    <div className="chat-header chat-header--selection" role="status" aria-live="polite">
      <div className="chat-header-selection__text">
        <strong>
          {count} {pluralMessages(count)}
        </strong>
        <span>выбрано для пересылки</span>
      </div>
      <div className="chat-header-selection__actions" ref={actionsRef}>
        {canEdit && (
          <button
            type="button"
            className="chat-header-selection__action"
            onClick={onEdit}
            aria-label="Редактировать"
            title="Редактировать"
          >
            <PencilIcon />
          </button>
        )}
        {count > 0 && (
          <div className="chat-header-selection__delete-wrap">
            <button
              type="button"
              className="chat-header-selection__action chat-header-selection__action--danger"
              onClick={handleDeleteClick}
              aria-label="Удалить"
              title="Удалить"
              aria-expanded={canDeleteForEveryone ? deleteMenuOpen : undefined}
              aria-haspopup={canDeleteForEveryone ? 'menu' : undefined}
            >
              <TrashIcon />
            </button>
            {deleteMenuOpen && canDeleteForEveryone && (
              <div className="chat-header-selection__delete-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDeleteMenuOpen(false);
                    onDeleteMe?.();
                  }}
                >
                  Удалить у себя
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDeleteMenuOpen(false);
                    onDeleteEveryone?.();
                  }}
                >
                  Удалить у всех
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="chat-header-selection__close"
          onClick={onClose}
          aria-label="Отменить выбор"
          title="Отменить выбор"
        >
          ×
        </button>
      </div>
    </div>
  );
}
