import { UserAvatar } from './UserAvatar';

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, totalSeconds || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const STATUS_TEXT = {
  outgoing: 'Вызов…',
  connecting: 'Соединение…',
  active: 'Идёт аудиозвонок',
};

export function CallScreen({
  partner,
  status,
  elapsedSeconds,
  muted,
  speakerMuted,
  error,
  remoteAudioRef,
  onToggleMute,
  onToggleSpeakerMute,
  onEnd,
  specialMode = false,
}) {
  const callAccepted = status === 'connecting' || status === 'active';

  return (
    <aside
      className={`call-screen ${specialMode ? 'call-screen--special' : ''}`}
      aria-label="Аудиозвонок"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="call-remote-audio" muted={speakerMuted}>
        <track kind="captions" />
      </audio>

      <div className="call-screen__header">
        <h2 className="call-screen__title">{specialMode ? 'call' : 'Звонок'}</h2>
      </div>

      <div className="call-screen__body">
        <div className="call-screen-glow" aria-hidden="true" />
        <div className={`call-avatar ${status !== 'active' ? 'is-calling' : ''}`}>
          <UserAvatar user={partner} size={96} />
        </div>
        <h3 className="call-screen__nickname">@{partner?.nickname || 'Пользователь'}</h3>
        <p className="call-partner-name">
          {[partner?.first_name, partner?.last_name].filter(Boolean).join(' ')}
        </p>
        <div className="call-status" aria-live="polite">
          {status === 'active' ? formatDuration(elapsedSeconds) : STATUS_TEXT[status]}
        </div>
        {error && <div className="call-error" role="alert">{error}</div>}

        <div className={`call-controls ${callAccepted ? '' : 'call-controls--ringing'}`.trim()}>
          {callAccepted && (
            <>
              <button
                type="button"
                className={`call-control ${muted ? 'is-active' : ''}`}
                onClick={onToggleMute}
                aria-pressed={muted}
                title={muted ? 'Включить микрофон' : 'Выключить микрофон'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M6 11a6 6 0 0 0 10.5 4M12 17v4M9 21h6" strokeLinecap="round" />
                  {muted && <path d="M4 4l16 16" strokeLinecap="round" />}
                </svg>
                <span>{muted ? 'Микрофон выкл.' : 'Микрофон'}</span>
              </button>
              <button
                type="button"
                className={`call-control ${speakerMuted ? 'is-active' : ''}`}
                onClick={onToggleSpeakerMute}
                aria-pressed={speakerMuted}
                title={speakerMuted ? 'Включить звук' : 'Выключить звук'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="M5 9v6h4l5 4V5L9 9H5Z" strokeLinejoin="round" />
                  {speakerMuted ? (
                    <path d="M16 9.5l5 5M21 9.5l-5 5" strokeLinecap="round" />
                  ) : (
                    <path d="M17 9.2a4 4 0 0 1 0 5.6M19.5 6.5a8 8 0 0 1 0 11" strokeLinecap="round" />
                  )}
                </svg>
                <span>{speakerMuted ? 'Звук выкл.' : 'Звук'}</span>
              </button>
            </>
          )}
          <button type="button" className="call-control call-end" onClick={onEnd} title="Завершить звонок">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
              <path d="M5.3 15.2c3.9-3.3 9.5-3.3 13.4 0l-2.3 3.1-3-1.4v-2.2h-2.8v2.2l-3 1.4-2.3-3.1Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Завершить</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
