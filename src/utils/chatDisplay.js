export function isGroupChat(chat) {
  if (!chat) return false;
  if (chat.is_group === true) return true;
  if (chat.chat_type === 'group') return true;
  return false;
}

/** Chat with yourself / Saved Messages. */
export function isFavoritesChat(chat, currentUserId) {
  if (!chat) return false;
  if (chat.is_favorites === true) return true;
  if (chat.chat_type === 'favorites' || chat.chat_type === 'saved') return true;
  if ((chat.title || '').trim() === 'Избранное') return true;
  if (currentUserId != null) {
    try {
      const stored = localStorage.getItem(`monica_favorites_chat_${currentUserId}`);
      if (stored && String(chat.id) === String(stored)) return true;
    } catch {
      /* ignore */
    }
  }
  if (isGroupChat(chat)) return false;
  if (currentUserId == null || chat.partner?.id == null) return false;
  return String(chat.partner.id) === String(currentUserId);
}

export function getChatTitle(chat, currentUserId) {
  if (!chat) return '—';
  if (isFavoritesChat(chat, currentUserId)) return 'Избранное';
  if (isGroupChat(chat)) {
    return (chat.title || '').trim() || 'Группа';
  }
  const partner = chat.partner;
  const fullName = [partner?.first_name, partner?.last_name].filter(Boolean).join(' ');
  return fullName || partner?.nickname || '—';
}

export function getChatListName(chat, currentUserId) {
  if (!chat) return '—';
  if (isFavoritesChat(chat, currentUserId)) return 'Избранное';
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

export function getChatSubtitle(chat, { isOnline = false, lastSeenText = '', currentUserId } = {}) {
  if (!chat) return '';
  if (isFavoritesChat(chat, currentUserId)) return 'Заметки и сохранённое';
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

/** Pin Избранное to the top of the chat list. */
export function sortChatsWithFavoritesFirst(chats, currentUserId) {
  const list = Array.isArray(chats) ? [...chats] : [];
  return list.sort((a, b) => {
    const af = isFavoritesChat(a, currentUserId) ? 0 : 1;
    const bf = isFavoritesChat(b, currentUserId) ? 0 : 1;
    if (af !== bf) return af - bf;
    const at = new Date(a.updated_at || a.last_message?.sent_at || 0).getTime();
    const bt = new Date(b.updated_at || b.last_message?.sent_at || 0).getTime();
    return bt - at;
  });
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
