function pluralMessages(count) {
  const n = Math.abs(Number(count) || 0);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сообщение';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'сообщения';
  return 'сообщений';
}

export function SelectionToolbar({ count, onClose, onReply, onForward }) {
  return (
    <div className="selection-toolbar" role="toolbar" aria-label="Действия с сообщениями">
      <button type="button" className="selection-toolbar__close" onClick={onClose} aria-label="Закрыть">×</button>
      <strong className="selection-toolbar__count">
        {count} {pluralMessages(count)}
      </strong>
      <div className="selection-toolbar__actions">
        <button type="button" onClick={onReply} disabled={count < 1}>
          <span aria-hidden="true">↩</span> Ответить
        </button>
        <button type="button" onClick={onForward} disabled={count < 1}>
          <span aria-hidden="true">➤</span> Переслать
        </button>
        <button type="button" className="selection-toolbar__more" aria-label="Ещё" title="Ещё">•••</button>
      </div>
    </div>
  );
}
