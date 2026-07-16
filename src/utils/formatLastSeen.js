/**
 * Относительный статус «был в сети».
 * @param {string|Date|null|undefined} iso
 * @param {Date} [now]
 */
export function formatLastSeen(iso, now = new Date()) {
  if (!iso) return 'не в сети';

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'не в сети';

  const diffMs = Math.max(0, now.getTime() - then.getTime());
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'был(а) только что';
  if (minutes < 60) return `был(а) ${minutes} мин. назад`;
  if (hours === 1) return 'был(а) час назад';
  if (hours < 24) return `был(а) ${hours} ч. назад`;
  if (days === 1) return 'был(а) день назад';
  if (days < 7) return `был(а) ${days} дн. назад`;
  return 'был(а) давно';
}
