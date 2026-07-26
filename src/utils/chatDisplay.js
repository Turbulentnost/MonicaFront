export function isGroupChat(chat) {
  if (!chat) return false;
  if (chat.is_group === true) return true;
  if (chat.chat_type === 'group') return true;
  return false;
}

export function getChatTitle(chat) {
  if (!chat) return '—';
  if (isGroupChat(chat)) {
    return (chat.title || '').trim() || 'Группа';
  }
  const partner = chat.partner;
  const fullName = [partner?.first_name, partner?.last_name].filter(Boolean).join(' ');
  return fullName || partner?.nickname || '—';
}

export function getChatListName(chat) {
  if (!chat) return '—';
  if (isGroupChat(chat)) {
    return (chat.title || '').trim() || 'Группа';
  }
  return chat.partner?.nickname ? `@${chat.partner.nickname}` : '—';
}

export function getMembersCount(chat) {
  if (!chat) return 0;
  if (typeof chat.members_count === 'number') return chat.members_count;
  if (Array.isArray(chat.members)) return chat.members.length;
  if (isGroupChat(chat)) return 0;
  return chat.partner ? 2 : 0;
}

export function formatMembersCount(count) {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} участник`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} участника`;
  return `${n} участников`;
}

export function getChatSubtitle(chat, { isOnline = false, lastSeenText = '' } = {}) {
  if (!chat) return '';
  if (isGroupChat(chat)) {
    return formatMembersCount(getMembersCount(chat));
  }
  if (isOnline) return 'в сети';
  return lastSeenText || '';
}

export function getGroupAvatarUser(chat) {
  if (!isGroupChat(chat)) return chat?.partner || null;
  const title = (chat.title || 'Г').trim();
  return {
    id: `group-${chat.id}`,
    nickname: title,
    first_name: title.slice(0, 2),
    photo: chat.photo || null,
    photo_url: chat.photo_url || chat.avatar_url || null,
  };
}

/** Unique partners from existing 1:1 chats, excluding current user. */
export function getDirectChatPartners(chats, currentUserId) {
  const byId = new Map();
  (Array.isArray(chats) ? chats : []).forEach((chat) => {
    if (isGroupChat(chat)) return;
    const partner = chat.partner;
    if (!partner?.id) return;
    if (currentUserId != null && String(partner.id) === String(currentUserId)) return;
    byId.set(String(partner.id), partner);
  });
  return Array.from(byId.values()).sort((a, b) => {
    const an = (a.nickname || a.first_name || '').toLowerCase();
    const bn = (b.nickname || b.first_name || '').toLowerCase();
    return an.localeCompare(bn, 'ru');
  });
}
