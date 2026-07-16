import { useEffect, useState } from 'react';
import { getCachedAvatarSrc, warmAvatarCache } from '../../utils/avatarCache';

export function UserAvatar({ user, size = 40, className = '' }) {
  const label = user?.nickname || user?.first_name || '?';
  const initials = label.slice(0, 2).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.35) };
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

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`user-avatar ${className}`}
        style={style}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className={`user-avatar user-avatar-fallback ${className}`} style={style}>
      {initials}
    </div>
  );
}
