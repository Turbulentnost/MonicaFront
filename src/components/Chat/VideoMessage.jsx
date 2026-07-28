import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildVideoQualities,
  downloadMediaFile,
  formatVideoDuration,
} from '../../utils/videoMedia';

function getLightboxHost() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('.chats-page .chat-main') || document.body;
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function VideoLightbox({ src, fileName, fileSize, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [host, setHost] = useState(null);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [qualityId, setQualityId] = useState('auto');
  const [qualityOpen, setQualityOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const qualities = useMemo(() => buildVideoQualities(sourceHeight), [sourceHeight]);
  const activeQuality = qualities.find((q) => q.id === qualityId) || qualities[0];
  const useCanvas = Boolean(
    activeQuality?.height
    && sourceHeight
    && activeQuality.height > 0
    && activeQuality.height < sourceHeight
    && qualityId !== 'auto'
    && qualityId !== 'original',
  );

  useEffect(() => {
    setHost(getLightboxHost());
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (qualityOpen) {
          setQualityOpen(false);
          return;
        }
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        onClose();
      }
      if (event.key === ' ' && event.target === document.body) {
        event.preventDefault();
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play();
        else video.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen, onClose, qualityOpen]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !useCanvas) return;
    const targetH = activeQuality.height;
    const scale = Math.min(1, targetH / video.videoHeight);
    const width = Math.max(2, Math.round(video.videoWidth * scale));
    const height = Math.max(2, Math.round(video.videoHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0, width, height);
    rafRef.current = requestAnimationFrame(drawFrame);
  }, [activeQuality?.height, useCanvas]);

  useEffect(() => {
    stopLoop();
    if (!useCanvas) return undefined;
    rafRef.current = requestAnimationFrame(drawFrame);
    return stopLoop;
  }, [drawFrame, stopLoop, useCanvas]);

  const toggleQualityPanel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);
    setQualityOpen((open) => !open);
  };

  const handleDownload = async (event) => {
    event.stopPropagation();
    if (!src || downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadMediaFile(src, fileName || 'video.mp4');
      setMenuOpen(false);
    } catch {
      setDownloadError('Не удалось скачать');
    } finally {
      setDownloading(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  if (!host || !src) return null;
  const inChat = host !== document.body;
  const sizeLabel = fileSize ? `${Math.round((fileSize / (1024 * 1024)) * 10) / 10} МБ` : '';

  return createPortal(
    <div
      className={`photo-lightbox video-lightbox${inChat ? ' photo-lightbox--chat' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="photo-lightbox__toolbar video-lightbox__toolbar" onClick={(e) => e.stopPropagation()}>
        <div className="video-lightbox__title">
          <span className="video-lightbox__name">{fileName || 'Видео'}</span>
          {sizeLabel ? <span className="video-lightbox__meta">{sizeLabel}</span> : null}
          {activeQuality ? <span className="video-lightbox__meta">{activeQuality.label}</span> : null}
          {downloadError ? <span className="video-lightbox__error">{downloadError}</span> : null}
        </div>
        <div className="video-lightbox__actions">
          <div className="video-lightbox__menu-wrap">
            <button
              type="button"
              className={`video-lightbox__menu-btn${menuOpen ? ' is-open' : ''}`}
              aria-label="Меню"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                setQualityOpen(false);
                setMenuOpen((open) => !open);
              }}
            >
              <MoreIcon />
            </button>
            {menuOpen && (
              <div className="video-lightbox__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="video-lightbox__menu-item"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? 'Скачивание…' : 'Скачать'}
                </button>
              </div>
            )}
          </div>
          <button type="button" className="photo-lightbox__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
      </div>

      <div className="photo-lightbox__stage video-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <div className="video-lightbox__player">
          <video
            ref={videoRef}
            className={`video-lightbox__video${useCanvas ? ' is-source' : ''}`}
            src={src}
            controls={!useCanvas}
            playsInline
            autoPlay
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (!video) return;
              setSourceHeight(video.videoHeight || 0);
              setDuration(video.duration || 0);
            }}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onPlay={() => {
              setPaused(false);
              if (useCanvas) rafRef.current = requestAnimationFrame(drawFrame);
            }}
            onPause={() => {
              setPaused(true);
              stopLoop();
            }}
            onClick={(event) => {
              if (useCanvas) return;
              if (event.target !== videoRef.current) return;
              toggleQualityPanel(event);
            }}
          />
          {useCanvas && (
            <button
              type="button"
              className="video-lightbox__canvas-hit"
              onClick={toggleQualityPanel}
              aria-label="Выбрать качество"
            >
              <canvas ref={canvasRef} className="video-lightbox__canvas" />
            </button>
          )}
          {useCanvas && (
            <div className="video-lightbox__bar" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="video-lightbox__bar-btn" onClick={togglePlay}>
                {paused ? '▶' : '❚❚'}
              </button>
              <input
                type="range"
                className="video-lightbox__seek"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  const video = videoRef.current;
                  if (!video) return;
                  video.currentTime = next;
                  setCurrentTime(next);
                }}
              />
              <span className="video-lightbox__time">
                {formatVideoDuration(currentTime)} / {formatVideoDuration(duration)}
              </span>
            </div>
          )}
          {qualityOpen && (
            <div className="video-lightbox__quality" onClick={(e) => e.stopPropagation()}>
              <div className="video-lightbox__quality-title">Качество воспроизведения</div>
              {qualities.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`video-lightbox__quality-item${option.id === qualityId ? ' is-active' : ''}`}
                  onClick={() => {
                    setQualityId(option.id);
                    setQualityOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="video-lightbox__hint">Нажмите на видео, чтобы выбрать качество</p>
      </div>
    </div>,
    host,
  );
}

export function VideoMessage({ message }) {
  const src = message.content_url;
  const previewRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(0);

  if (!src) {
    return <span className="message-content">Видео</span>;
  }

  return (
    <>
      <button
        type="button"
        className="message-video"
        onClick={() => setOpen(true)}
        aria-label="Открыть видео"
      >
        <video
          ref={previewRef}
          className="message-video__preview"
          src={src}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            setDuration(previewRef.current?.duration || 0);
          }}
        />
        <span className="message-video__play" aria-hidden="true">
          <PlayIcon />
        </span>
        <span className="message-video__badge">
          {duration ? formatVideoDuration(duration) : 'Видео'}
        </span>
      </button>
      {open && (
        <VideoLightbox
          src={src}
          fileName={message.file_name}
          fileSize={message.file_size}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
