import { useEffect, useMemo, useState } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascriptLang from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import pythonLang from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { chatsApi } from '../../api/client';
import { warmMediaCache } from '../../utils/mediaCache';
import { downloadMediaFile, isVideoMessage } from '../../utils/videoMedia';
import { FileTypeIcon } from './FileTypeIcon';
import { PhotoGallery } from './PhotoGallery';
import { VideoMessage } from './VideoMessage';

SyntaxHighlighter.registerLanguage('python', pythonLang);
SyntaxHighlighter.registerLanguage('javascript', javascriptLang);

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileDownloadButton({ url, fileName, className = '' }) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url || downloading) return;
    setDownloading(true);
    try {
      await downloadMediaFile(url, fileName || 'file');
    } catch {
      // fallback: open in new tab if blob download fails
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className={`message-file-download ${className}`.trim()}
      onClick={handleClick}
      disabled={!url || downloading}
      aria-label="Скачать файл"
      title={downloading ? 'Скачивание…' : 'Скачать'}
    >
      <DownloadIcon />
    </button>
  );
}

const codeTextCache = new Map();

const codeHighlightStyle = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    margin: 0,
    padding: '10px 12px',
    background: 'transparent',
    fontSize: '12px',
    lineHeight: 1.45,
    fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
    textShadow: 'none',
  },
};

/** @returns {'python'|'javascript'|null} */
export function getCodeLanguage(message) {
  const name = (message.file_name || '').toLowerCase();
  const mime = (message.mime_type || '').toLowerCase();
  if (name.endsWith('.py') || mime.includes('python')) return 'python';
  if (
    name.endsWith('.js')
    || mime.includes('javascript')
    || mime === 'text/js'
    || mime === 'application/x-javascript'
  ) {
    return 'javascript';
  }
  return null;
}

export function MessageMedia({ message, chatId }) {
  const mediaKey = message.content;
  const remoteUrl = message.content_url;
  const [codeText, setCodeText] = useState(() => codeTextCache.get(mediaKey) || '');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState('');
  const [outputHidden, setOutputHidden] = useState(false);

  const codeLang = message.message_type === 'file' ? getCodeLanguage(message) : null;
  const hasOutput = Boolean(runResult || runError);

  useEffect(() => {
    if (message.message_type !== 'photo' || !mediaKey || !remoteUrl) return undefined;
    // Prefetch into media cache for PhotoGallery / lightbox.
    warmMediaCache(mediaKey, remoteUrl);
    return undefined;
  }, [mediaKey, remoteUrl, message.message_type]);

  useEffect(() => {
    let cancelled = false;

    if (!codeLang || !remoteUrl) return undefined;

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
  }, [codeLang, mediaKey, remoteUrl]);

  const handleRun = async () => {
    if (!chatId || !message.id || running) return;
    setRunning(true);
    setRunError('');
    setRunResult(null);
    setOutputHidden(false);
    try {
      const { data } = await chatsApi.runCode(chatId, message.id);
      setRunResult(data);
    } catch (err) {
      setRunError(err.response?.data?.detail || 'Ошибка запуска');
    } finally {
      setRunning(false);
    }
  };

  const galleryItems = useMemo(() => {
    if (message.message_type !== 'photo') return [];
    if (Array.isArray(message.attachments) && message.attachments.length) {
      return message.attachments;
    }
    if (message.content || message.content_url) {
      return [{
        path: message.content,
        content_url: message.content_url,
        file_name: message.file_name,
        mime_type: message.mime_type,
        file_size: message.file_size,
      }];
    }
    return [];
  }, [message]);

  if (message.message_type === 'photo') {
    if (!galleryItems.length) {
      return <span className="message-content">Фото</span>;
    }
    return <PhotoGallery items={galleryItems} />;
  }

  if (codeLang) {
    const label = message.file_name || (codeLang === 'python' ? 'script.py' : 'script.js');
    const langLabel = codeLang === 'python' ? 'Python' : 'JavaScript';
    return (
      <div className="message-code-wrap">
        <div className="message-code-toolbar">
          <FileTypeIcon
            className="message-code-file-icon"
            fileName={label}
            mimeType={message.mime_type}
            language={codeLang}
            size="sm"
          />
          <span className="message-code-name">{label}</span>
          <span className="message-code-lang">{langLabel}</span>
          <FileDownloadButton
            url={remoteUrl}
            fileName={message.file_name || label}
            className="message-code-download-btn"
          />
          <button
            type="button"
            className="message-code-run"
            onClick={handleRun}
            disabled={running || !chatId}
          >
            {running ? 'Запуск…' : hasOutput ? 'Запустить снова' : 'Запустить'}
          </button>
        </div>
        {codeLoading && <div className="message-code-status">Загрузка…</div>}
        {codeError && <div className="message-code-status error">{codeError}</div>}
        {!codeLoading && !codeError && (
          <div className="message-code">
            <SyntaxHighlighter
              language={codeLang}
              style={codeHighlightStyle}
              customStyle={{
                margin: 0,
                padding: 0,
                background: 'transparent',
                maxHeight: 'none',
                overflow: 'visible',
              }}
              codeTagProps={{ style: { fontFamily: 'inherit' } }}
              PreTag="div"
            >
              {codeText || ' '}
            </SyntaxHighlighter>
          </div>
        )}
        {hasOutput && (
          <div className="message-code-output-panel">
            <div className="message-code-output-toolbar">
              <span className="message-code-output-label">Вывод</span>
              <button
                type="button"
                className="message-code-output-toggle"
                onClick={() => setOutputHidden((v) => !v)}
              >
                {outputHidden ? 'Показать' : 'Скрыть'}
              </button>
            </div>
            {!outputHidden && (
              <>
                {runError && <div className="message-code-output error">{runError}</div>}
                {runResult && (
                  <div className="message-code-output">
                    {runResult.timed_out && (
                      <div className="message-code-status error">
                        Превышено время выполнения (5 с)
                      </div>
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
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (message.message_type === 'file') {
    if (isVideoMessage(message)) {
      return <VideoMessage message={message} />;
    }
    const label = message.file_name || 'Файл';
    const sizeLabel = message.file_size
      ? ` (${Math.round(message.file_size / 1024)} КБ)`
      : '';
    return (
      <div className="message-file">
        <FileTypeIcon
          className="message-file-icon"
          fileName={label}
          mimeType={message.mime_type}
          size="md"
        />
        <span className="message-file-name">
          {label}
          {sizeLabel}
        </span>
        <FileDownloadButton url={remoteUrl} fileName={label} />
      </div>
    );
  }

  return null;
}
