import { getCachedMediaSrc, warmMediaCache } from './mediaCache';

function blobToPng(blob) {
  if (blob.type === 'image/png') return Promise.resolve(blob);

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) {
            reject(new Error('PNG encode failed'));
            return;
          }
          resolve(png);
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

export function getMessagePhotoSource(message) {
  if (!message || message.message_type !== 'photo') return null;
  const items = Array.isArray(message.attachments) && message.attachments.length
    ? message.attachments
    : [{ path: message.content, content_url: message.content_url }];
  const first = items.find((item) => item?.path || item?.content_url);
  if (!first) return null;
  return {
    path: first.path || null,
    content_url: first.content_url || message.content_url || null,
  };
}

/** Copy photo message image to the system clipboard (image/png). */
export async function copyMessagePhoto(message) {
  const source = getMessagePhotoSource(message);
  if (!source?.content_url && !source?.path) {
    throw new Error('Нет изображения для копирования');
  }

  let src = getCachedMediaSrc(source.path, source.content_url);
  if (source.path && source.content_url) {
    src = (await warmMediaCache(source.path, source.content_url)) || src;
  }
  if (!src) throw new Error('Не удалось загрузить изображение');

  const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) throw new Error('Не удалось загрузить изображение');
  const blob = await response.blob();
  const png = await blobToPng(blob);

  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Копирование изображений не поддерживается');
  }

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': png }),
  ]);
}
