export function StickerView({
  sticker,
  size = 'md',
  className = '',
  title,
}) {
  if (!sticker) return null;

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

  return (
    <span
      className={rootClass}
      title={title || sticker.label}
      aria-label={sticker.label || sticker.emoji}
      role="img"
    >
      {sticker.emoji || '🧩'}
    </span>
  );
}
