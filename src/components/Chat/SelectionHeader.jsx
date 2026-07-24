function pluralMessages(count) {
  const n = Math.abs(Number(count) || 0);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сообщение';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'сообщения';
  return 'сообщений';
}

export function SelectionHeader({ count, onClose }) {
  return (
    <div className="chat-header chat-header--selection" role="status" aria-live="polite">
      <div className="chat-header-selection__text">
        <strong>
          {count} {pluralMessages(count)}
        </strong>
        <span>выбрано для пересылки</span>
      </div>
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
  );
}
