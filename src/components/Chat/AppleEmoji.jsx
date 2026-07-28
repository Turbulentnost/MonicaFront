import { useState } from 'react';
import emojiRegex from 'emoji-regex';

const APPLE_EMOJI_VERSION = '15.1.2';

export function emojiToAppleCodepoint(emoji) {
  const parts = [];
  for (const char of String(emoji || '')) {
    const cp = char.codePointAt(0);
    if (cp == null || cp === 0xfe0f) continue;
    parts.push(cp.toString(16));
  }
  return parts.join('-');
}

export function appleEmojiUrl(emoji, sheetSize = 64) {
  const codepoint = emojiToAppleCodepoint(emoji);
  if (!codepoint) return '';
  const size = sheetSize <= 20 ? 20 : sheetSize <= 32 ? 32 : 64;
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@${APPLE_EMOJI_VERSION}/img/apple/${size}/${codepoint}.png`;
}

export function AppleEmoji({
  emoji,
  size = 22,
  className = '',
  alt = '',
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const px = typeof size === 'number' ? size : 22;
  const src = appleEmojiUrl(emoji, px <= 24 ? 32 : 64);

  if (!emoji) return null;

  if (failed || !src) {
    return (
      <span
        className={`apple-emoji apple-emoji--fallback ${className}`.trim()}
        style={{ fontSize: px, lineHeight: 1 }}
        {...rest}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      className={`apple-emoji ${className}`.trim()}
      src={src}
      alt={alt || emoji}
      title={emoji}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

export function renderTextWithAppleEmoji(text, keyPrefix = 'ae') {
  if (text == null || text === '') return null;
  const source = String(text);
  const re = emojiRegex();
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  let match = re.exec(source);
  while (match) {
    if (match.index > lastIndex) {
      parts.push(source.slice(lastIndex, match.index));
    }
    const emoji = match[0];
    parts.push(
      <AppleEmoji
        key={`${keyPrefix}-${key++}`}
        emoji={emoji}
        size={18}
      />
    );
    lastIndex = match.index + emoji.length;
    match = re.exec(source);
  }
  if (lastIndex < source.length) {
    parts.push(source.slice(lastIndex));
  }
  if (!parts.length) return source;
  if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
  return parts;
}
