const STORAGE_PREFIX = 'monica:chat-bg:v1:';
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function storageKey(chatId) {
  return `${STORAGE_PREFIX}${chatId}`;
}

/** Legacy localStorage helper — kept for one-time MinIO migration. */
export function getChatBackground(chatId) {
  if (!chatId) return null;
  try {
    const value = localStorage.getItem(storageKey(chatId));
    return value || null;
  } catch {
    return null;
  }
}

export function clearChatBackground(chatId) {
  if (!chatId) return false;
  try {
    localStorage.removeItem(storageKey(chatId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Сжимает изображение в JPEG File для загрузки в MinIO.
 */
export function fileToBackgroundFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Нужно изображение'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Некорректное изображение'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas недоступен'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Не удалось сжать изображение'));
              return;
            }
            resolve(new File([blob], 'background.jpg', { type: 'image/jpeg' }));
          },
          'image/jpeg',
          JPEG_QUALITY,
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function dataUrlToBackgroundFile(dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith('data:')) {
    throw new Error('Некорректный фон');
  }
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], 'background.jpg', { type: blob.type || 'image/jpeg' });
}
