import { useEffect, useMemo, useState } from 'react';
import { appleEmojiCandidateCount, twemojiUrl } from '../../utils/twemoji';

/**
 * Renders a single emoji asset.
 * format: png (Apple 64) | noto (Noto 128) | svg (Twemoji vector)
 * On failure walks codepoint variants, then falls back to native glyph.
 */
export function Twemoji({ emoji, className = '', title, size, format = 'png' }) {
  const [candidate, setCandidate] = useState(0);
  const [assetFormat, setAssetFormat] = useState(format);
  const maxCandidates = useMemo(() => appleEmojiCandidateCount(emoji), [emoji]);
  const src = useMemo(
    () => twemojiUrl(emoji, candidate, assetFormat),
    [emoji, candidate, assetFormat]
  );
  const style = size
    ? { width: size, height: size, maxWidth: size, maxHeight: size }
    : undefined;
  const failed = candidate >= maxCandidates || !src;

  useEffect(() => {
    setCandidate(0);
    setAssetFormat(format);
  }, [emoji, format]);

  if (!emoji) return null;
  if (failed) {
    return (
      <span
        className={['twemoji-fallback', className].filter(Boolean).join(' ')}
        style={{
          ...style,
          fontSize: size ? `${size}px` : undefined,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      className={[
        'twemoji',
        assetFormat === 'svg' ? 'twemoji--svg' : '',
        assetFormat === 'noto' ? 'twemoji--noto' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      src={src}
      alt={emoji}
      title={title || emoji}
      draggable={false}
      loading="lazy"
      decoding="async"
      style={style}
      onError={() => {
        // Next codepoint variant, then noto → svg → png → native glyph.
        if (candidate + 1 < maxCandidates) {
          setCandidate((n) => n + 1);
          return;
        }
        if (assetFormat === 'noto') {
          setAssetFormat('svg');
          setCandidate(0);
          return;
        }
        if (assetFormat === 'svg') {
          setAssetFormat('png');
          setCandidate(0);
          return;
        }
        setCandidate(maxCandidates);
      }}
    />
  );
}
