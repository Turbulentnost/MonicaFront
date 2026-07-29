import { isStickerMessageContent } from '../../utils/stickerPayload';
import { renderTextWithAppleEmoji } from './AppleEmoji';

function previewFor(message) {
  if (!message) return '';
  if (message.preview) return message.preview;
  if (message.message_type === 'photo') return message.caption || 'Фото';
  if (message.message_type === 'voice') return 'Голосовое сообщение';
  if (message.message_type === 'file') {
    const mime = String(message.mime_type || '').toLowerCase();
    const name = String(message.file_name || '').toLowerCase();
    if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv|m4v|avi|ogv|3gp)$/.test(name)) {
      return 'Видео';
    }
    return message.file_name || 'Файл';
  }
  if (message.message_type === 'forward') {
    const count = message.forward_bundle?.length || 0;
    return `${count} пересланных сообщений`;
  }
  if (message.message_type === 'text' && isStickerMessageContent(message.content)) {
    return 'Стикер';
  }
  return message.content || 'Сообщение';
}

export function QuoteComposerBar({ mode = 'reply', message, onClose }) {
  const sender = message?.sender?.nickname || message?.sender?.first_name || 'Пользователь';
  const preview = previewFor(message);
  const previewNode = isStickerMessageContent(preview)
    ? 'Стикер'
    : renderTextWithAppleEmoji(preview, 'quote-composer', 14);

  return (
    <div className="quote-composer-bar">
      <span className="quote-composer-bar__line" aria-hidden="true" />
      <div className="quote-composer-bar__body">
        <strong>{mode === 'forward' ? `@${sender}` : `Ответ для @${sender}`}</strong>
        <span>{previewNode}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Отменить">×</button>
    </div>
  );
}
