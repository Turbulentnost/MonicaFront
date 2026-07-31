import { useEffect, useState } from 'react';
import { formatMessageDayLabel } from '../../utils/formatChatDate';

const AUTO_HIDE_MS = 4000;

function formatRelatedMeta(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const day = formatMessageDayLabel(iso);
  const time = then.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!day) return time;
  if (!time) return day;
  return `${day}, ${time}`;
}

/**
 * Floating list of semantically related messages used as Reason context.
 * Appears above the composer (right-aligned); auto-hides after suggestion is ready.
 */
export function RelatedMessagesPanel({
  messages = [],
  visible = false,
  suggestionReady = false,
  onHide,
  onHideForever,
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setExiting(false);
      return undefined;
    }
    if (!suggestionReady) return undefined;
    let exitTimer;
    const timer = setTimeout(() => {
      setExiting(true);
      exitTimer = setTimeout(() => {
        onHide?.();
      }, 220);
    }, AUTO_HIDE_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(exitTimer);
    };
  }, [visible, suggestionReady, onHide]);

  if (!visible || !messages.length) return null;

  return (
    <div
      className={`related-messages-panel${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Найденные сообщения для контекста"
    >
      <div className="related-messages-panel__actions">
        <button type="button" className="related-messages-panel__hide" onClick={onHide}>
          Скрыть
        </button>
        <button
          type="button"
          className="related-messages-panel__hide-forever"
          onClick={onHideForever}
        >
          Скрыть навсегда
        </button>
      </div>
      <ul className="related-messages-panel__list">
        {messages.map((item, index) => {
          const mine = Boolean(item.is_mine);
          const label = mine
            ? 'Вы'
            : (item.sender_label || 'Собеседник');
          const meta = formatRelatedMeta(item.sent_at);
          return (
            <li
              key={item.id || `related-${index}`}
              className={`related-messages-panel__row${mine ? ' is-own' : ' is-other'}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="related-messages-panel__label">{label}:</div>
              <div className="related-messages-panel__bubble">
                <span className="related-messages-panel__text">{item.text}</span>
                {meta ? (
                  <span className="related-messages-panel__meta">{meta}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
