import { useEffect, useMemo, useState } from 'react';
import emojiRegex from 'emoji-regex';
import { appleEmojiCandidateCount, twemojiUrl } from '../../utils/twemoji';

/**
 * Apple Color Emoji via emoji-datasource-apple (64px CDN sheet only).
 * Tries FE0F / stripped codepoint variants before falling back to native glyph.
 */
export function appleEmojiUrl(emoji, candidateIndex = 0) {
  // Only /64/ exists on jsDelivr for emoji-datasource-apple@15.1.2
  return twemojiUrl(emoji, candidateIndex, 'png');
}

export function emojiToAppleCodepoint(emoji) {
  return twemojiUrl(emoji, 0, 'png')
    .split('/')
    .pop()
    ?.replace(/\.png$/, '') || '';
}

export function AppleEmoji({
  emoji,
  size = 22,
  className = '',
  alt = '',
  ...rest
}) {
  const [candidate, setCandidate] = useState(0);
  const maxCandidates = useMemo(() => appleEmojiCandidateCount(emoji), [emoji]);
  const px = typeof size === 'number' ? size : 22;
  const src = useMemo(() => appleEmojiUrl(emoji, candidate), [emoji, candidate]);
  const failed = !emoji || !src || candidate >= maxCandidates;

  useEffect(() => {
    setCandidate(0);
  }, [emoji]);

  if (!emoji) return null;

  if (failed) {
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
      onError={() => {
        if (candidate + 1 < maxCandidates) {
          setCandidate((n) => n + 1);
          return;
        }
        setCandidate(maxCandidates);
      }}
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
