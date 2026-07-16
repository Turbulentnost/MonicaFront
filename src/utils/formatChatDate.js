function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDiff(from, to = new Date()) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Время последнего сообщения в списке чатов.
 * Сегодня → 14:32, вчера → вчера, иначе → 15.03 или 15.03.25
 */
export function formatChatListTime(iso, now = new Date()) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const diff = dayDiff(then, now);
  if (diff === 0) {
    return then.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff === 1) return 'вчера';
  if (diff === 2) return 'позавчера';

  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    ...(sameYear ? {} : { year: '2-digit' }),
  });
}

/**
 * Заголовок дня в ленте сообщений.
 */
export function formatMessageDayLabel(iso, now = new Date()) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const diff = dayDiff(then, now);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  if (diff === 2) return 'Позавчера';

  return then.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: then.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

/** Ключ дня YYYY-MM-DD в локальной зоне */
export function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Группирует сообщения по дням (сохраняет порядок).
 * @returns {{ key: string, label: string, messages: any[] }[]}
 */
export function groupMessagesByDay(messages) {
  const groups = [];
  let current = null;

  for (const msg of messages) {
    const key = dayKey(msg.sent_at);
    if (!current || current.key !== key) {
      current = {
        key,
        label: formatMessageDayLabel(msg.sent_at),
        messages: [],
      };
      groups.push(current);
    }
    current.messages.push(msg);
  }

  return groups;
}
