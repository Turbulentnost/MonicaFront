import { getBuiltinStickerPacks, normalizePack, normalizeSticker } from '../data/stickerPacks';

const INSTALLED_KEY = 'monica_installed_sticker_packs';
const CUSTOM_KEY = 'monica_custom_sticker_packs';
const DEFAULT_INSTALLED = ['cats', 'party-live'];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getCustomStickerPacks() {
  const parsed = readJson(CUSTOM_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((pack) => normalizePack({ ...pack, custom: true }))
    .filter(Boolean);
}

export function getStickerCatalog() {
  const builtin = getBuiltinStickerPacks();
  const custom = getCustomStickerPacks();
  const customIds = new Set(custom.map((pack) => pack.id));
  return [...builtin.filter((pack) => !customIds.has(pack.id)), ...custom];
}

function readInstalled() {
  const catalogIds = new Set(getStickerCatalog().map((pack) => pack.id));
  const parsed = readJson(INSTALLED_KEY, null);
  if (!Array.isArray(parsed)) return [...DEFAULT_INSTALLED].filter((id) => catalogIds.has(id));
  const valid = parsed.filter((id) => catalogIds.has(id));
  return valid.length ? valid : [...DEFAULT_INSTALLED].filter((id) => catalogIds.has(id));
}

function writeInstalled(ids) {
  writeJson(INSTALLED_KEY, ids);
}

function writeCustomPacks(packs) {
  writeJson(
    CUSTOM_KEY,
    packs.map((pack) => ({
      id: pack.id,
      title: pack.title,
      description: pack.description,
      cover: pack.cover,
      kind: pack.kind,
      custom: true,
      stickers: pack.stickers,
    }))
  );
}

export function getInstalledStickerPackIds() {
  return readInstalled();
}

export function getInstalledStickerPacks() {
  const catalog = getStickerCatalog();
  return readInstalled()
    .map((id) => catalog.find((pack) => pack.id === id))
    .filter(Boolean);
}

export function isStickerPackInstalled(packId) {
  return readInstalled().includes(packId);
}

export function installStickerPack(packId) {
  if (!getStickerCatalog().some((pack) => pack.id === packId)) return readInstalled();
  const next = Array.from(new Set([...readInstalled(), packId]));
  writeInstalled(next);
  return next;
}

export function uninstallStickerPack(packId) {
  const next = readInstalled().filter((id) => id !== packId);
  const catalogIds = new Set(getStickerCatalog().map((pack) => pack.id));
  const fallback = DEFAULT_INSTALLED.find((id) => catalogIds.has(id))
    || getStickerCatalog()[0]?.id;
  const safe = next.length ? next : (fallback ? [fallback] : []);
  writeInstalled(safe);
  return safe;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function createCustomStickerPack({ title, description = '', kind = 'static', cover = '' }) {
  const base = slugify(title) || `pack-${Date.now()}`;
  const existing = new Set(getStickerCatalog().map((pack) => pack.id));
  let id = `custom-${base}`;
  let n = 1;
  while (existing.has(id)) {
    id = `custom-${base}-${n}`;
    n += 1;
  }

  const pack = normalizePack({
    id,
    title,
    description,
    cover: cover || (kind === 'animated' ? '✨' : '🧩'),
    kind: kind === 'animated' ? 'animated' : 'static',
    custom: true,
    stickers: [],
  });
  if (!pack) return null;

  const packs = [...getCustomStickerPacks(), pack];
  writeCustomPacks(packs);
  installStickerPack(pack.id);
  return pack;
}

export function addStickerToCustomPack(packId, stickerInput) {
  const packs = getCustomStickerPacks();
  const index = packs.findIndex((pack) => pack.id === packId);
  if (index < 0) return null;

  const pack = packs[index];
  const sticker = normalizeSticker(
    {
      id: stickerInput.id || `${packId}-${Date.now()}`,
      ...stickerInput,
    },
    pack.kind
  );
  if (!sticker) return null;

  const nextPack = {
    ...pack,
    stickers: [...pack.stickers, sticker],
    cover: pack.cover || sticker.emoji || pack.cover,
  };
  packs[index] = nextPack;
  writeCustomPacks(packs);
  return nextPack;
}

export function removeStickerFromCustomPack(packId, stickerId) {
  const packs = getCustomStickerPacks();
  const index = packs.findIndex((pack) => pack.id === packId);
  if (index < 0) return null;
  const nextPack = {
    ...packs[index],
    stickers: packs[index].stickers.filter((item) => item.id !== stickerId),
  };
  packs[index] = nextPack;
  writeCustomPacks(packs);
  return nextPack;
}

export function deleteCustomStickerPack(packId) {
  const packs = getCustomStickerPacks().filter((pack) => pack.id !== packId);
  writeCustomPacks(packs);
  return uninstallStickerPack(packId);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}
