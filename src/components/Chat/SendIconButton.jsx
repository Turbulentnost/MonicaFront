import sendIcon from '../../assets/icons/send.png';

export function SendIconButton({
  disabled = false,
  busy = false,
  title = 'Отправить',
  className = '',
}) {
  return (
    <button
      type="submit"
      className={['message-send-btn', className].filter(Boolean).join(' ')}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <span className="message-send-btn__icon" aria-hidden="true">
        {busy ? (
          <span className="message-send-btn__busy">…</span>
        ) : (
          <img
            className="message-send-btn__img"
            src={sendIcon}
            alt=""
            draggable={false}
          />
        )}
      </span>
    </button>
  );
}
