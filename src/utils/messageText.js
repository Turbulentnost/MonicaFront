export function looksLikeStoragePath(value) {
  if (!value || typeof value !== 'string') return false;
  const text = value.trim();
  if (!text || text.includes(' ') || text.includes('\n') || text.includes('\t')) {
    return false;
  }
  return text.startsWith('chat-files/') || text.startsWith('user-avatars/');
}

export function getPhotoCaption(message) {
  if (!message || message.message_type !== 'photo') return '';
  if (typeof message.caption === 'string' && message.caption.trim()) {
    return message.caption.trim();
  }
  const content = (message.content || '').trim();
  if (!content) return '';
  const paths = new Set(
    (Array.isArray(message.attachments) ? message.attachments : [])
      .map((item) => (item?.path || '').trim())
      .filter(Boolean)
  );
  if (paths.has(content) || looksLikeStoragePath(content)) return '';
  return content;
}

export function getEditableMessageText(message) {
  if (!message) return '';
  if (message.message_type === 'text') return message.content || '';
  if (message.message_type === 'photo') return getPhotoCaption(message);
  return '';
}
