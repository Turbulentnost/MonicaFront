import twemoji from '@twemoji/api';
import emojiRegex from 'emoji-regex';

/** Apple-style emoji (Telegram/VK-like), not Windows Fluent. */
const APPLE_EMOJI_BASE =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/';

/** Noto Color Emoji 128px — sharp stickers without upscaling 64px Apple PNGs. */
const NOTO_EMOJI_128_BASE =
  'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/png/128/';

/** Scalable Twemoji SVG — for sizes above 128px. */
const TWEMOJI_SVG_BASE =
  'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';

/**
 * Keep FE0F in the codepoint — Apple assets often require `2764-fe0f.png`,
 * while stripped `2764.png` 404s and falls back to Windows emoji.
 */
export function twemojiCodePoint(emoji) {
  if (!emoji) return '';
  return twemoji.convert.toCodePoint(emoji);
}

export function appleEmojiCandidates(emoji) {
  if (!emoji) return [];
  const primary = twemoji.convert.toCodePoint(emoji).toLowerCase();
  const stripped = twemoji.convert
    .toCodePoint(emoji.replace(/\uFE0F/g, ''))
    .toLowerCase();
  const list = [primary];
  if (stripped && stripped !== primary) list.push(stripped);
  // Some assets use fe0f even when the character was stored without it.
  if (!primary.includes('fe0f') && !primary.includes('-') && primary.length <= 4) {
    list.push(`${primary}-fe0f`);
  }
  return list;
}

/**
 * @param {string} emoji
 * @param {number} [candidateIndex]
 * @param {'png' | 'noto' | 'svg'} [format]
 *   png  = Apple 64px (inline emoji)
 *   noto = Noto Color 128px (stickers ≈1:1)
 *   svg  = Twemoji SVG (any size, crisp)
 */
export function twemojiUrl(emoji, candidateIndex = 0, format = 'png') {
  const codes = appleEmojiCandidates(emoji);
  const code = codes[candidateIndex] || codes[0];
  if (!code) return '';
  if (format === 'svg') return `${TWEMOJI_SVG_BASE}${code}.svg`;
  if (format === 'noto') {
    // 1f469-200d-1f4bb → emoji_u1f469_200d_1f4bb
    return `${NOTO_EMOJI_128_BASE}emoji_u${code.replace(/-/g, '_')}.png`;
  }
  return `${APPLE_EMOJI_BASE}${code}.png`;
}

export function appleEmojiCandidateCount(emoji) {
  return appleEmojiCandidates(emoji).length;
}

/** Split plain text into text / emoji segments (safe for React, no HTML). */
export function splitTextAndEmoji(text) {
  const source = String(text ?? '');
  if (!source) return [];
  const re = emojiRegex();
  const parts = [];
  let last = 0;
  let match = re.exec(source);
  while (match) {
    if (match.index > last) {
      parts.push({ type: 'text', value: source.slice(last, match.index) });
    }
    parts.push({ type: 'emoji', value: match[0] });
    last = match.index + match[0].length;
    match = re.exec(source);
  }
  if (last < source.length) {
    parts.push({ type: 'text', value: source.slice(last) });
  }
  return parts;
}
