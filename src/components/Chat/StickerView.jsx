import { Twemoji } from './Twemoji';

/**
 * Display box sizes (CSS px).
 * Stickers use Noto 128 / SVG — never upscale Apple 64px (that causes blur).
 */
const STICKER_BOX = {
  sm: 28,
  md: 44,
  lg: 56,
  picker: 80,
  xl: 112,
  chat: 128,
};

function stickerAssetFormat(boxPx) {
  if (boxPx > 128) return 'svg';
  if (boxPx > 64) return 'noto';
  return 'png';
}

export function StickerView({
  sticker,
  size = 'md',
  className = '',
  title,
}) {
  if (!sticker) return null;

  const boxPx = STICKER_BOX[size] || STICKER_BOX.md;
  const sizeClass = size === 'chat' ? 'sticker-view--chat' : `sticker-view--${size}`;
  const rootClass = [
    'sticker-view',
    sizeClass,
    sticker.type === 'animated' || sticker.animation ? 'sticker-view--animated' : '',
    sticker.animation ? `sticker-view--${sticker.animation}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (sticker.type === 'image' && sticker.src) {
    return (
      <span className={rootClass} title={title || sticker.label}>
        <img src={sticker.src} alt={sticker.label || 'Стикер'} draggable={false} />
      </span>
    );
  }

  const emoji = sticker.emoji || '🧩';
  const format = stickerAssetFormat(boxPx);

  return (
    <span
      className={rootClass}
      title={title || sticker.label}
      aria-label={sticker.label || emoji}
      role="img"
      style={{ width: boxPx, height: boxPx }}
    >
      <Twemoji
        emoji={emoji}
        size={boxPx}
        format={format}
        className="sticker-view__glyph"
      />
    </span>
  );
}
