const VIDEO_EXTS = [
  '.mp4', '.webm', '.mov', '.mkv', '.m4v', '.avi', '.ogv', '.3gp',
];

export function isVideoFile({ fileName = '', mimeType = '' } = {}) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  const name = String(fileName || '').toLowerCase();
  return VIDEO_EXTS.some((ext) => name.endsWith(ext));
}

export function isVideoMessage(message) {
  if (!message) return false;
  if (message.message_type === 'file') {
    return isVideoFile({
      fileName: message.file_name,
      mimeType: message.mime_type,
    });
  }
  return false;
}

/** Build quality menu from source height (single stored file). */
export function buildVideoQualities(sourceHeight) {
  const h = Math.round(Number(sourceHeight) || 0);
  const steps = [1080, 720, 480, 360];
  const options = [{ id: 'auto', label: 'Авто', height: 0 }];
  if (h > 0) {
    options.push({ id: 'original', label: `Оригинал (${h}p)`, height: h });
    steps.forEach((step) => {
      if (step < h) {
        options.push({ id: `${step}p`, label: `${step}p`, height: step });
      }
    });
  }
  return options;
}

export function formatVideoDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function downloadMediaFile(url, fileName = 'video.mp4') {
  if (!url) throw new Error('Нет ссылки для скачивания');
  const safeName = String(fileName || 'file')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .trim() || 'file';
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) throw new Error('Не удалось скачать файл');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}
