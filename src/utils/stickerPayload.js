const PREFIX_V1 = 'monica-sticker:1:';
const PREFIX_V2 = 'monica-sticker|';

/**
 * Compact pipe format — less likely to be mangled than JSON in transit:
 * monica-sticker|id|type|animation|emoji|src
 */
export function encodeStickerMessage(sticker) {
  if (!sticker) return '';
  const id = encodeURIComponent(String(sticker.id || ''));
  const type = sticker.type === 'animated' || sticker.type === 'image'
    ? sticker.type
    : 'emoji';
  const animation = encodeURIComponent(String(sticker.animation || ''));
  const emoji = String(sticker.emoji || '');
  const src = sticker.src && !String(sticker.src).startsWith('data:')
    ? encodeURIComponent(String(sticker.src))
    : '';
  return `${PREFIX_V2}${id}|${type}|${animation}|${emoji}|${src}`;
}

function parseV2(content) {
  if (!content.startsWith(PREFIX_V2)) return null;
  const body = content.slice(PREFIX_V2.length);
  // emoji may contain `|` rarely; split limited fields from the right for src
  const parts = body.split('|');
  if (parts.length < 4) return null;
  const id = decodeURIComponent(parts[0] || '');
  const typeRaw = parts[1] || 'emoji';
  const animationRaw = decodeURIComponent(parts[2] || '');
  const src = parts.length >= 5 ? decodeURIComponent(parts[parts.length - 1] || '') : '';
  const emoji = parts.length >= 5
    ? parts.slice(3, -1).join('|')
    : parts.slice(3).join('|');
  const type = typeRaw === 'animated' || typeRaw === 'image' ? typeRaw : 'emoji';
  if (!id && !emoji && !src) return null;
  return {
    id,
    type,
    emoji,
    animation: animationRaw || null,
    src,
    label: emoji || 'Стикер',
  };
}

function parseV1(content) {
  if (!content.startsWith(PREFIX_V1)) return null;
  try {
    const raw = JSON.parse(content.slice(PREFIX_V1.length));
    if (!raw || typeof raw !== 'object') return null;
    return {
      id: String(raw.id || ''),
      type: raw.type === 'animated' || raw.type === 'image' ? raw.type : 'emoji',
      emoji: String(raw.emoji || ''),
      animation: raw.animation || null,
      src: String(raw.src || ''),
      label: String(raw.label || raw.emoji || 'Стикер'),
    };
  } catch {
    return null;
  }
}

export function parseStickerMessage(content) {
  if (typeof content !== 'string') return null;
  const trimmed = content.trim();
  return parseV2(trimmed) || parseV1(trimmed);
}

export function isStickerMessageContent(content) {
  return Boolean(parseStickerMessage(content));
}
