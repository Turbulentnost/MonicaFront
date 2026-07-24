const STORAGE_PREFIX = 'monica:chat-bg:v1:';
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function storageKey(chatId) {
  return `${STORAGE_PREFIX}${chatId}`;
}

export function getChatBackground(chatId) {
  if (!chatId) return null;
  try {
    const value = localStorage.getItem(storageKey(chatId));
    return value || null;
  } catch {
    return null;
  }
}

export function setChatBackground(chatId, dataUrl) {
  if (!chatId) return false;
  try {
    if (!dataUrl) {
      localStorage.removeItem(storageKey(chatId));
      return true;
    }
    localStorage.setItem(storageKey(chatId), dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function clearChatBackground(chatId) {
  return setChatBackground(chatId, null);
}

/**
 * Сжимает изображение в data URL (JPEG), чтобы уместить в localStorage.
 */
export function fileToBackgroundDataUrl(file) {
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
        try {
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
