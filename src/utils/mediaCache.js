const blobUrls = new Map();
const stickyUrls = new Map();
const inflight = new Map();
const CACHE_NAME = 'monica-media-v1';

function cacheRequestKey(mediaKey) {
  return `https://monica.local/media/${encodeURIComponent(mediaKey)}`;
}

export function getCachedMediaSrc(mediaKey, remoteUrl = null) {
  if (!mediaKey) return remoteUrl;
  const blob = blobUrls.get(mediaKey);
  if (blob) return blob;
  if (stickyUrls.has(mediaKey)) return stickyUrls.get(mediaKey);
  if (remoteUrl) {
    stickyUrls.set(mediaKey, remoteUrl);
    return remoteUrl;
  }
  return null;
}

export async function warmMediaCache(mediaKey, remoteUrl) {
  if (!mediaKey || !remoteUrl) return remoteUrl || null;

  if (!stickyUrls.has(mediaKey)) {
    stickyUrls.set(mediaKey, remoteUrl);
  }

  const hit = blobUrls.get(mediaKey);
  if (hit) return hit;

  if (inflight.has(mediaKey)) {
    return inflight.get(mediaKey);
  }

  const task = (async () => {
    try {
      if (typeof caches !== 'undefined') {
        const cache = await caches.open(CACHE_NAME);
        const request = cacheRequestKey(mediaKey);
        let response = await cache.match(request);
        if (!response) {
          response = await fetch(remoteUrl, { mode: 'cors', credentials: 'omit' });
          if (!response.ok) {
            return stickyUrls.get(mediaKey) || remoteUrl;
          }
          await cache.put(request, response.clone());
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrls.set(mediaKey, objectUrl);
        return objectUrl;
      }

      const response = await fetch(remoteUrl, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) return stickyUrls.get(mediaKey) || remoteUrl;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrls.set(mediaKey, objectUrl);
      return objectUrl;
    } catch {
      return stickyUrls.get(mediaKey) || remoteUrl;
    } finally {
      inflight.delete(mediaKey);
    }
  })();

  inflight.set(mediaKey, task);
  return task;
}

export function invalidateMediaCache(mediaKey) {
  if (!mediaKey) return;
  const prev = blobUrls.get(mediaKey);
  if (prev) {
    URL.revokeObjectURL(prev);
    blobUrls.delete(mediaKey);
  }
  stickyUrls.delete(mediaKey);
  if (typeof caches !== 'undefined') {
    caches.open(CACHE_NAME).then((cache) => cache.delete(cacheRequestKey(mediaKey)));
  }
}
