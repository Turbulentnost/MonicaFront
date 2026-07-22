export function SelectionToolbar({ count, onClose, onReply, onForward }) {
  return (
    <div className="selection-toolbar" role="toolbar" aria-label="Действия с сообщениями">
      <button type="button" className="selection-toolbar__close" onClick={onClose} aria-label="Закрыть">×</button>
      <strong className="selection-toolbar__count">
        {count} {count === 1 ? 'сообщение' : 'сообщений'}
      </strong>
      <div className="selection-toolbar__actions">
        <button type="button" onClick={onReply} disabled={count !== 1}>
          <span aria-hidden="true">↩</span> Ответить
        </button>
        <button type="button" onClick={onForward}>
          <span aria-hidden="true">➤</span> Переслать
        </button>
        <button type="button" className="selection-toolbar__more" aria-label="Ещё" title="Ещё">•••</button>
      </div>
    </div>
  );
}
