/**
 * Built-in sticker catalog.
 *
 * How to add packs in code:
 * 1) Append an object to BUILTIN_STICKER_PACKS below.
 * 2) For static stickers use type: 'emoji' + emoji.
 * 3) For animated stickers use type: 'animated' + emoji + animation
 *    (bounce | pulse | spin | wiggle | float | pop).
 * 4) For image/GIF put files in public/stickers/ and use
 *    type: 'image', src: '/stickers/your-file.webp'.
 * 5) Set pack.kind to 'static' or 'animated'.
 *
 * Users can also create packs/stickers in the Sticker Store UI
 * (saved in localStorage).
 */

export const STICKER_ANIMATIONS = ['bounce', 'pulse', 'spin', 'wiggle', 'float', 'pop'];

export const BUILTIN_STICKER_PACKS = [
  {
    id: 'cats',
    title: 'Котики',
    description: 'Мягкие кошачьи реакции',
    cover: '🐱',
    kind: 'static',
    stickers: [
      { id: 'cats-1', type: 'emoji', emoji: '🐱', label: 'Котик' },
      { id: 'cats-2', type: 'emoji', emoji: '😺', label: 'Улыбка' },
      { id: 'cats-3', type: 'emoji', emoji: '😻', label: 'Влюблён' },
    ],
  },
  {
    id: 'hype',
    title: 'Хайп',
    description: 'Яркие реакции на успех',
    cover: '🔥',
    kind: 'static',
    stickers: [
      { id: 'hype-1', type: 'emoji', emoji: '🔥', label: 'Огонь' },
      { id: 'hype-2', type: 'emoji', emoji: '💯', label: 'Сто' },
      { id: 'hype-3', type: 'emoji', emoji: '✨', label: 'Блеск' },
    ],
  },
  {
    id: 'hands',
    title: 'Жесты',
    description: 'Быстрые ответы руками',
    cover: '👍',
    kind: 'static',
    stickers: [
      { id: 'hands-1', type: 'emoji', emoji: '👍', label: 'Лайк' },
      { id: 'hands-2', type: 'emoji', emoji: '✌️', label: 'Пир' },
      { id: 'hands-3', type: 'emoji', emoji: '🤝', label: 'Рукопожатие' },
    ],
  },
  {
    id: 'party-live',
    title: 'Праздник Live',
    description: 'Анимированные праздничные стикеры',
    cover: '🎉',
    kind: 'animated',
    stickers: [
      { id: 'party-1', type: 'animated', emoji: '🎉', animation: 'bounce', label: 'Ура' },
      { id: 'party-2', type: 'animated', emoji: '🥳', animation: 'spin', label: 'Вечеринка' },
      { id: 'party-3', type: 'animated', emoji: '🎈', animation: 'float', label: 'Шарик' },
    ],
  },
  {
    id: 'mood-live',
    title: 'Настроение Live',
    description: 'Живые эмоции с анимацией',
    cover: '😂',
    kind: 'animated',
    stickers: [
      { id: 'mood-1', type: 'animated', emoji: '😂', animation: 'wiggle', label: 'Смех' },
      { id: 'mood-2', type: 'animated', emoji: '😍', animation: 'pulse', label: 'Влюблённость' },
      { id: 'mood-3', type: 'animated', emoji: '😱', animation: 'pop', label: 'Шок' },
    ],
  },
];

/** @deprecated use getStickerCatalog() from stickerLibrary */
export const STICKER_CATALOG = BUILTIN_STICKER_PACKS;

export function normalizeSticker(sticker, packKind = 'static') {
  if (!sticker || typeof sticker !== 'object') return null;
  const id = String(sticker.id || '').trim();
  if (!id) return null;

  const label = String(sticker.label || sticker.emoji || 'Стикер').trim() || 'Стикер';
  const emoji = String(sticker.emoji || '').trim();
  const src = String(sticker.src || '').trim();
  let type = String(sticker.type || '').trim();

  if (!type) {
    if (src) type = 'image';
    else if (packKind === 'animated' || sticker.animation) type = 'animated';
    else type = 'emoji';
  }

  if (type === 'image') {
    if (!src) return null;
    const animation = packKind === 'animated' || sticker.animation
      ? (STICKER_ANIMATIONS.includes(sticker.animation) ? sticker.animation : 'pulse')
      : null;
    return { id, type: 'image', src, emoji: emoji || '🖼️', label, animation };
  }

  if (!emoji) return null;

  if (type === 'animated') {
    const animation = STICKER_ANIMATIONS.includes(sticker.animation)
      ? sticker.animation
      : 'bounce';
    return { id, type: 'animated', emoji, animation, label, src: '' };
  }

  return { id, type: 'emoji', emoji, label, animation: null, src: '' };
}

export function normalizePack(pack) {
  if (!pack || typeof pack !== 'object') return null;
  const id = String(pack.id || '').trim();
  const title = String(pack.title || '').trim();
  if (!id || !title) return null;

  const kind = pack.kind === 'animated' ? 'animated' : 'static';
  const stickers = (Array.isArray(pack.stickers) ? pack.stickers : [])
    .map((item) => normalizeSticker(item, kind))
    .filter(Boolean);

  return {
    id,
    title,
    description: String(pack.description || '').trim(),
    cover: String(pack.cover || stickers[0]?.emoji || '🧩').trim() || '🧩',
    kind,
    custom: Boolean(pack.custom),
    stickers,
  };
}

export function getBuiltinStickerPacks() {
  return BUILTIN_STICKER_PACKS.map((pack) => normalizePack(pack)).filter(Boolean);
}

export function getStickerPackById(packId, catalog = getBuiltinStickerPacks()) {
  return catalog.find((pack) => pack.id === packId) || null;
}
