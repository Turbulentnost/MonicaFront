import sendIcon from '../../assets/icons/send.png';
import { UploadProgressRing } from './UploadProgressRing';

export function SendIconButton({
  disabled = false,
  busy = false,
  uploadProgress = null,
  title = 'Отправить',
  className = '',
}) {
  const indeterminate = busy && uploadProgress == null;

  return (
    <button
      type="submit"
      className={['message-send-btn', busy ? 'is-uploading' : '', className]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      title={
        busy
          ? (indeterminate ? 'Загрузка…' : `Загрузка ${uploadProgress}%`)
          : title
      }
      aria-label={
        busy
          ? (indeterminate ? 'Загрузка файла' : `Загрузка ${uploadProgress}%`)
          : title
      }
    >
      <span className="message-send-btn__icon" aria-hidden="true">
        {busy ? (
          <UploadProgressRing
            progress={uploadProgress ?? 0}
            indeterminate={indeterminate}
            size={26}
            showLabel={false}
          />
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
