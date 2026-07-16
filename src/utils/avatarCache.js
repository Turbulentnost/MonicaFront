/** Object URLs (blob) keyed by stable photo path */
const blobUrls = new Map();
/** Sticky MinIO signed URLs — same key keeps same src for browser HTTP cache */
const stickyUrls = new Map();
const inflight = new Map();
const CACHE_NAME = 'monica-avatars-v1';

function cacheRequestKey(photoKey) {
  return `https://monica.local/avatar/${encodeURIComponent(photoKey)}`;
}

/** Sync: prefer blob, else sticky remote URL */
export function getCachedAvatarSrc(photoKey, remoteUrl = null) {
  if (!photoKey) return remoteUrl;
  const blob = blobUrls.get(photoKey);
  if (blob) return blob;
  if (stickyUrls.has(photoKey)) return stickyUrls.get(photoKey);
  if (remoteUrl) {
    stickyUrls.set(photoKey, remoteUrl);
    return remoteUrl;
  }
  return null;
}

/**
 * Cache photo in memory + Cache API under stable key (`user.photo`),
 * not under rotating signed query string.
 */
export async function warmAvatarCache(photoKey, remoteUrl) {
  if (!photoKey || !remoteUrl) return remoteUrl || null;

  if (!stickyUrls.has(photoKey)) {
    stickyUrls.set(photoKey, remoteUrl);
  }

  const hit = blobUrls.get(photoKey);
  if (hit) return hit;

  if (inflight.has(photoKey)) {
    return inflight.get(photoKey);
  }

  const task = (async () => {
    try {
      if (typeof caches !== 'undefined') {
        const cache = await caches.open(CACHE_NAME);
        const request = cacheRequestKey(photoKey);
        let response = await cache.match(request);
        if (!response) {
          response = await fetch(remoteUrl, { mode: 'cors', credentials: 'omit' });
          if (!response.ok) {
            return stickyUrls.get(photoKey) || remoteUrl;
          }
          await cache.put(request, response.clone());
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrls.set(photoKey, objectUrl);
        return objectUrl;
      }

      const response = await fetch(remoteUrl, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) return stickyUrls.get(photoKey) || remoteUrl;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrls.set(photoKey, objectUrl);
      return objectUrl;
    } catch {
      // MinIO без CORS — остаёмся на sticky URL; браузер кэширует <img>
      return stickyUrls.get(photoKey) || remoteUrl;
    } finally {
      inflight.delete(photoKey);
    }
  })();

  inflight.set(photoKey, task);
  return task;
}

export function invalidateAvatarCache(photoKey) {
  if (!photoKey) return;
  const prev = blobUrls.get(photoKey);
  if (prev) {
    URL.revokeObjectURL(prev);
    blobUrls.delete(photoKey);
  }
  stickyUrls.delete(photoKey);
  if (typeof caches !== 'undefined') {
    caches.open(CACHE_NAME).then((cache) => cache.delete(cacheRequestKey(photoKey)));
  }
}
