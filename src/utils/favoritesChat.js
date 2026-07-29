import { chatsApi } from '../api/client';
import { isFavoritesChat, isGroupChat } from './chatDisplay';

const ensureCache = new Map(); // userId -> { chat } | { promise }

export function favoritesStorageKey(userId) {
  return `monica_favorites_chat_${userId}`;
}

export function isPendingFavoritesId(chatId) {
  return String(chatId || '').startsWith('favorites-pending-');
}

export function getStoredFavoritesChatId(userId) {
  if (userId == null) return null;
  try {
    const id = localStorage.getItem(favoritesStorageKey(userId));
    if (!id || isPendingFavoritesId(id)) return null;
    return id;
  } catch {
    return null;
  }
}

export function setStoredFavoritesChatId(userId, chatId) {
  if (userId == null || chatId == null || isPendingFavoritesId(chatId)) return;
  try {
    localStorage.setItem(favoritesStorageKey(userId), String(chatId));
  } catch {
    /* ignore */
  }
}

export function clearStoredFavoritesChatId(userId) {
  if (userId == null) return;
  try {
    localStorage.removeItem(favoritesStorageKey(userId));
  } catch {
    /* ignore */
  }
  ensureCache.delete(String(userId));
}

export function invalidateFavoritesEnsureCache(userId) {
  if (userId == null) {
    ensureCache.clear();
    return;
  }
  ensureCache.delete(String(userId));
}

export function buildFavoritesChatStub(user, chatId = null) {
  const id = chatId && !isPendingFavoritesId(chatId)
    ? chatId
    : `favorites-pending-${user?.id || 'local'}`;
  return {
    id,
    is_favorites: true,
    chat_type: 'favorites',
    title: 'Избранное',
    is_group: false,
    partner: user
      ? {
        id: user.id,
        nickname: user.nickname,
        first_name: user.first_name,
        last_name: user.last_name,
        photo: user.photo,
        photo_url: user.photo_url,
        is_online: true,
      }
      : null,
    last_message: null,
    updated_at: new Date().toISOString(),
    members: user ? [user] : [],
    members_count: 1,
  };
}

function extractChatId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.id != null) return payload.id;
  if (payload.chat_id != null) return payload.chat_id;
  if (payload.chat?.id != null) return payload.chat.id;
  return null;
}

function unwrapChatPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.id != null) return payload;
  if (payload.chat && typeof payload.chat === 'object') return payload.chat;
  return payload;
}

export function findFavoritesInList(chats, userId) {
  const list = Array.isArray(chats) ? chats : [];
  const storedId = getStoredFavoritesChatId(userId);
  if (storedId) {
    const byId = list.find((chat) => String(chat.id) === String(storedId));
    if (byId) return byId;
  }
  const byFlag = list.find((chat) => isFavoritesChat(chat, userId) && !isPendingFavoritesId(chat.id));
  if (byFlag) return byFlag;

  // Self-chat without partner payload (some backends omit partner for notes).
  if (userId != null) {
    const selfOnly = list.find((chat) => {
      if (!chat?.id || isPendingFavoritesId(chat.id) || isGroupChat(chat)) return false;
      if (chat.partner?.id != null && String(chat.partner.id) === String(userId)) return true;
      const members = Array.isArray(chat.members) ? chat.members : [];
      return members.length > 0 && members.every((m) => String(m?.id) === String(userId));
    });
    if (selfOnly) return selfOnly;
  }
  return null;
}

function asFavoritesChat(chat, user, extras = {}) {
  const raw = unwrapChatPayload(chat);
  const id = extractChatId(raw);
  if (id == null) return null;
  return {
    ...raw,
    id,
    is_favorites: true,
    chat_type: raw.chat_type || 'favorites',
    title: 'Избранное',
    partner: raw.partner || user,
    last_message: raw.last_message ?? null,
    updated_at: raw.updated_at || new Date().toISOString(),
    ...extras,
  };
}

async function chatAcceptsMessages(chatId) {
  if (!chatId || isPendingFavoritesId(chatId)) return false;
  try {
    await chatsApi.messages(chatId, { limit: 1 });
    return true;
  } catch {
    return false;
  }
}

async function createFavoritesChat(user) {
  // 1) Dedicated favorites endpoint (chat_type=favorites)
  try {
    const { data } = await chatsApi.favorites();
    const chat = asFavoritesChat(data, user, {
      is_group: false,
      chat_type: 'favorites',
    });
    if (chat?.id) {
      setStoredFavoritesChatId(user.id, chat.id);
      return chat;
    }
  } catch {
    /* older backends may not have /chats/favorites/ */
  }

  // 2) Self start — backend maps recipient=self → favorites
  try {
    const { data } = await chatsApi.start(user.id);
    const chat = asFavoritesChat(data, user, {
      is_group: false,
      chat_type: data?.chat_type || 'favorites',
    });
    if (chat?.id) {
      setStoredFavoritesChatId(user.id, chat.id);
      return chat;
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function ensureFavoritesChatUncached(user) {
  if (!user?.id) return null;

  // Stored id may still be valid even if temporarily missing from list.
  const storedId = getStoredFavoritesChatId(user.id);
  if (storedId && await chatAcceptsMessages(storedId)) {
    return asFavoritesChat(buildFavoritesChatStub(user, storedId), user);
  }

  let list = [];
  try {
    const { data } = await chatsApi.list();
    list = Array.isArray(data) ? data : [];
  } catch {
    // List failed — still try create / stored recovery below.
    list = [];
  }

  const existing = findFavoritesInList(list, user.id);
  if (existing?.id && !isPendingFavoritesId(existing.id)) {
    setStoredFavoritesChatId(user.id, existing.id);
    return asFavoritesChat(existing, user);
  }

  const created = await createFavoritesChat(user);
  if (created?.id) return created;

  // Last resort: re-list in case another tab created it.
  try {
    const { data } = await chatsApi.list();
    const again = findFavoritesInList(Array.isArray(data) ? data : [], user.id);
    if (again?.id && !isPendingFavoritesId(again.id)) {
      setStoredFavoritesChatId(user.id, again.id);
      return asFavoritesChat(again, user);
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * Ensure a real backend chat for Избранное exists.
 * Dedupes concurrent calls per user.
 */
export function ensureFavoritesChat(user, { force = false } = {}) {
  if (!user?.id) return Promise.resolve(null);
  const key = String(user.id);
  if (force) ensureCache.delete(key);

  const cached = ensureCache.get(key);
  if (cached?.chat) return Promise.resolve(cached.chat);
  if (cached?.promise) return cached.promise;

  const promise = ensureFavoritesChatUncached(user)
    .then((chat) => {
      if (chat?.id && !isPendingFavoritesId(chat.id)) {
        ensureCache.set(key, { chat });
      } else {
        ensureCache.delete(key);
      }
      return chat;
    })
    .catch((err) => {
      ensureCache.delete(key);
      throw err;
    });

  ensureCache.set(key, { promise });
  return promise;
}

/** Merge favorites into chat list (always visible at top). */
export function withFavoritesChat(chats, user, favoritesChat) {
  const list = Array.isArray(chats) ? [...chats] : [];
  const userId = user?.id;
  const fav = favoritesChat || findFavoritesInList(list, userId) || buildFavoritesChatStub(user);
  const favId = String(fav.id);

  const withoutDupes = list.filter((chat) => {
    if (String(chat.id) === favId) return false;
    if (isFavoritesChat(chat, userId)) return false;
    // Avoid a second "self" direct chat next to Избранное
    if (
      !isGroupChat(chat)
      && userId != null
      && chat.partner?.id != null
      && String(chat.partner.id) === String(userId)
    ) {
      return false;
    }
    return true;
  });

  return [{ ...fav, is_favorites: true }, ...withoutDupes];
}
