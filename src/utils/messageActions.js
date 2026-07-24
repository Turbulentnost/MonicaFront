/** Окно «удалить у всех» — 48 часов. */
export const DELETE_FOR_ALL_MS = 48 * 60 * 60 * 1000;
/** Окно редактирования — 7 суток. */
export const EDIT_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export function canDeleteForEveryone(message, isOwn) {
  if (!isOwn || !message?.sent_at) return false;
  if (String(message.id).startsWith('temp-')) return false;
  return Date.now() - new Date(message.sent_at).getTime() < DELETE_FOR_ALL_MS;
}

export function canEditMessage(message, isOwn) {
  if (!isOwn || !message?.sent_at) return false;
  if (String(message.id).startsWith('temp-')) return false;
  if (message.message_type !== 'text' && message.message_type !== 'photo') return false;
  return Date.now() - new Date(message.sent_at).getTime() < EDIT_FOR_MS;
}
