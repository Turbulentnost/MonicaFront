/** Telegram-style bookmark avatar for Saved Messages / Избранное. */
export function FavoritesAvatar({ size = 44, className = '' }) {
  const icon = Math.round(size * 0.46);
  return (
    <div
      className={['favorites-avatar', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6.5 3.75h11A1.75 1.75 0 0 1 19.25 5.5v14.2a.75.75 0 0 1-1.2.6L12 16.35l-6.05 3.95a.75.75 0 0 1-1.2-.6V5.5A1.75 1.75 0 0 1 6.5 3.75Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
