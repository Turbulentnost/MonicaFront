import { useEffect, useState } from 'react';
import { chatsApi } from '../../api/client';
import { getCachedMediaSrc, warmMediaCache } from '../../utils/mediaCache';

const codeTextCache = new Map();

function isPythonFile(message) {
  const name = (message.file_name || '').toLowerCase();
  const mime = (message.mime_type || '').toLowerCase();
  return name.endsWith('.py') || mime.includes('python');
}

export function MessageMedia({ message, chatId }) {
  const mediaKey = message.content;
  const remoteUrl = message.content_url;
  const [src, setSrc] = useState(() => getCachedMediaSrc(mediaKey, remoteUrl));
  const [codeText, setCodeText] = useState(() => codeTextCache.get(mediaKey) || '');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState('');

  const python = message.message_type === 'file' && isPythonFile(message);

  useEffect(() => {
    let cancelled = false;

    if (message.message_type === 'photo') {
      const cached = getCachedMediaSrc(mediaKey, remoteUrl);
      setSrc(cached);
      if (mediaKey && remoteUrl) {
        warmMediaCache(mediaKey, remoteUrl).then((url) => {
          if (!cancelled && url) setSrc(url);
        });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [mediaKey, remoteUrl, message.message_type]);

  useEffect(() => {
    let cancelled = false;

    if (!python || !remoteUrl) return undefined;

    const cached = codeTextCache.get(mediaKey);
    if (cached != null) {
      setCodeText(cached);
      return undefined;
    }

    setCodeLoading(true);
    setCodeError('');
    fetch(remoteUrl, { mode: 'cors', credentials: 'omit' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Не удалось загрузить файл');
        const text = await res.text();
        codeTextCache.set(mediaKey, text);
        if (!cancelled) setCodeText(text);
      })
      .catch(() => {
        if (!cancelled) setCodeError('Не удалось показать код');
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [python, mediaKey, remoteUrl]);

  const handleRun = async () => {
    if (!chatId || !message.id || running) return;
    setRunning(true);
    setRunError('');
    setRunResult(null);
    try {
      const { data } = await chatsApi.runCode(chatId, message.id);
      setRunResult(data);
    } catch (err) {
      setRunError(err.response?.data?.detail || 'Ошибка запуска');
    } finally {
      setRunning(false);
    }
  };

  if (message.message_type === 'photo') {
    if (!src) return <span className="message-content">Фото</span>;
    return (
      <img
        src={src}
        alt={message.file_name || 'Фото'}
        className="message-image"
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (python) {
    const label = message.file_name || 'script.py';
    return (
      <div className="message-code-wrap">
        <div className="message-code-toolbar">
          <span className="message-code-name">{label}</span>
          <a
            href={remoteUrl || '#'}
            className="message-code-download"
            target="_blank"
            rel="noopener noreferrer"
            download={message.file_name || undefined}
          >
            Скачать
          </a>
          <button
            type="button"
            className="message-code-run"
            onClick={handleRun}
            disabled={running || !chatId}
          >
            {running ? 'Запуск…' : 'Запустить'}
          </button>
        </div>
        {codeLoading && <div className="message-code-status">Загрузка…</div>}
        {codeError && <div className="message-code-status error">{codeError}</div>}
        {!codeLoading && !codeError && (
          <pre className="message-code">
            <code>{codeText}</code>
          </pre>
        )}
        {runError && <div className="message-code-output error">{runError}</div>}
        {runResult && (
          <div className="message-code-output">
            {runResult.timed_out && (
              <div className="message-code-status error">Превышено время выполнения (5 с)</div>
            )}
            {runResult.memory_exceeded && (
              <div className="message-code-status error">Превышен лимит памяти</div>
            )}
            {!runResult.timed_out && (
              <div className="message-code-status">
                exit code: {runResult.exit_code}
              </div>
            )}
            {runResult.stdout ? (
              <pre className="message-code-stdout">{runResult.stdout}</pre>
            ) : null}
            {runResult.stderr ? (
              <pre className="message-code-stderr">{runResult.stderr}</pre>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (message.message_type === 'file') {
    const label = message.file_name || 'Файл';
    const sizeLabel = message.file_size
      ? ` (${Math.round(message.file_size / 1024)} КБ)`
      : '';
    return (
      <a
        href={remoteUrl || '#'}
        className="message-file"
        target="_blank"
        rel="noopener noreferrer"
        download={message.file_name || undefined}
      >
        <span className="message-file-icon">📎</span>
        <span className="message-file-name">
          {label}
          {sizeLabel}
        </span>
      </a>
    );
  }

  return null;
}
