import { useEffect, useState } from 'react';
import { getCachedAvatarSrc, warmAvatarCache } from '../../utils/avatarCache';

export function UserAvatar({ user, size = 40, className = '', showOnline = false, isOnline = false }) {
  const label = user?.nickname || user?.first_name || '?';
  const initials = label.slice(0, 2).toUpperCase();
  const wrapStyle = { width: size, height: size };
  const fallbackStyle = { fontSize: Math.max(12, size * 0.35) };
  const photoKey = user?.photo || (user?.id ? String(user.id) : null);
  const remoteUrl = user?.photo_url || null;

  const [src, setSrc] = useState(() => getCachedAvatarSrc(photoKey, remoteUrl));

  useEffect(() => {
    let cancelled = false;

    if (!remoteUrl && !photoKey) {
      setSrc(null);
      return undefined;
    }

    const cached = getCachedAvatarSrc(photoKey, remoteUrl);
    setSrc(cached);

    if (photoKey && remoteUrl) {
      warmAvatarCache(photoKey, remoteUrl).then((url) => {
        if (!cancelled && url) setSrc(url);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [photoKey, remoteUrl]);

  const online = showOnline && Boolean(isOnline);
  const dotSize = Math.max(10, Math.round(size * 0.26));

  return (
    <div className={`user-avatar-wrap ${className}`} style={wrapStyle}>
      {src ? (
        <img
          src={src}
          alt={label}
          className="user-avatar"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="user-avatar user-avatar-fallback" style={fallbackStyle}>
          {initials}
        </div>
      )}
      {online && (
        <span
          className="user-online-dot"
          style={{ width: dotSize, height: dotSize }}
          title="В сети"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
