import { UserAvatar } from './UserAvatar';
import { LinkPreviewCard } from './LinkPreviewCard';
import { linkifyText } from '../../utils/linkifyText';

function relativeTime(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return 'сейчас';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}м`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}ч`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}д`;
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function itemText(item) {
  if (item.message_type === 'voice') return 'Голосовое сообщение';
  if (item.message_type === 'file') return item.file_name || 'Файл';
  if (item.message_type === 'photo') return item.caption || (
    item.content && !item.content.includes('/') ? item.content : ''
  );
  return item.content || '';
}

function forwardedCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} пересланное сообщение`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} пересланных сообщения`;
  }
  return `${count} пересланных сообщений`;
}

function photoItems(item) {
  if (Array.isArray(item.attachments) && item.attachments.length) return item.attachments;
  return item.content_url ? [{ content_url: item.content_url, path: item.content }] : [];
}

export function ForwardedBundle({ bundle = [], comment, onOpenOriginal }) {
  return (
    <div className="forwarded-bundle">
      <strong className="forwarded-bundle__title">{forwardedCountLabel(bundle.length)}</strong>
      {bundle.map((item, index) => {
        const photos = item.message_type === 'photo' ? photoItems(item) : [];
        const text = itemText(item);
        return (
          <article className="forwarded-item" key={`${item.original_chat_id}-${item.original_id}-${index}`}>
            <UserAvatar user={item.sender} size={30} />
            <div className="forwarded-item__body">
              <div className="forwarded-item__head">
                <strong>@{item.sender?.nickname || 'user'}</strong>
                <time>{relativeTime(item.sent_at)}</time>
                <button
                  type="button"
                  className="forwarded-item__jump"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenOriginal?.(item.original_chat_id, item.original_id);
                  }}
                  title="Открыть оригинал"
                  aria-label="Открыть оригинал"
                >↗</button>
              </div>
              {photos.length > 0 && (
                <div className={`forwarded-item__photos forwarded-item__photos--${Math.min(photos.length, 4)}`}>
                  {photos.slice(0, 4).map((photo, photoIndex) => (
                    <img
                      key={photo.path || photo.content_url || photoIndex}
                      src={photo.content_url}
                      alt={photo.file_name || 'Фото'}
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              {text ? (
                <>
                  <div className="forwarded-item__content">{linkifyText(text)}</div>
                  <LinkPreviewCard text={text} />
                </>
              ) : null}
            </div>
          </article>
        );
      })}
      {comment ? (
        <>
          <div className="forwarded-bundle__comment">{linkifyText(comment)}</div>
          <LinkPreviewCard text={comment} />
        </>
      ) : null}
    </div>
  );
}
