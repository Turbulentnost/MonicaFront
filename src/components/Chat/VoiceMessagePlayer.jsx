import { useEffect, useMemo, useRef, useState } from 'react';

const FALLBACK_WAVEFORM = Array.from(
  { length: 30 },
  (_, index) => 0.28 + (((index * 17) % 11) / 10) * 0.62
);

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor((milliseconds || 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function VoiceMessagePlayer({ message }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [mediaDurationMs, setMediaDurationMs] = useState(0);
  const [hasError, setHasError] = useState(false);

  const source = message.content_url;
  const recordedDurationMs = Math.max(0, Number(message.voice_duration_ms) || 0);
  const durationMs = mediaDurationMs || recordedDurationMs;
  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const waveform = useMemo(() => {
    if (!Array.isArray(message.waveform) || message.waveform.length === 0) {
      return FALLBACK_WAVEFORM;
    }
    return message.waveform
      .slice(0, 128)
      .map((level) => Math.min(1, Math.max(0.08, Number(level) || 0)));
  }, [message.waveform]);

  useEffect(() => {
    setPlaying(false);
    setPositionMs(0);
    setMediaDurationMs(0);
    setHasError(false);
  }, [source]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setPlaying(false);
      setHasError(true);
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio || !durationMs) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    audio.currentTime = (durationMs * ratio) / 1000;
    setPositionMs(durationMs * ratio);
  };

  if (!source) {
    return <div className="voice-message-error">Голосовое сообщение недоступно</div>;
  }

  return (
    <div className="voice-message">
      <audio
        ref={audioRef}
        src={source}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setPositionMs(event.currentTarget.currentTime * 1000)}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds)) setMediaDurationMs(seconds * 1000);
        }}
        onEnded={() => {
          setPlaying(false);
          setPositionMs(0);
        }}
        onError={() => {
          setPlaying(false);
          setHasError(true);
        }}
      />
      <button
        type="button"
        className="voice-message-toggle"
        onClick={togglePlayback}
        aria-label={playing ? 'Поставить голосовое сообщение на паузу' : 'Воспроизвести голосовое сообщение'}
        disabled={hasError}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button
        type="button"
        className="voice-message-waveform"
        onClick={seek}
        aria-label="Перемотать голосовое сообщение"
        disabled={hasError}
      >
        {waveform.map((level, index) => (
          <span
            // Порядок и количество амплитуд неизменны в рамках сообщения.
            key={index}
            className={index / waveform.length <= progress ? 'active' : ''}
            style={{ height: `${level * 100}%` }}
          />
        ))}
      </button>
      <span className="voice-message-duration">
        {hasError ? 'Ошибка' : formatDuration(playing ? positionMs : durationMs)}
      </span>
    </div>
  );
}
