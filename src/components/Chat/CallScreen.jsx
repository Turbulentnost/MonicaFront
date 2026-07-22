import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UserAvatar } from './UserAvatar';

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, totalSeconds || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const STATUS_TEXT = {
  outgoing: 'Вызов…',
  connecting: 'Соединение…',
  active: 'Идёт звонок',
};

function hasLiveVideo(stream) {
  return Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live' && track.enabled));
}

export function CallScreen({
  partner,
  status,
  elapsedSeconds,
  muted,
  cameraEnabled,
  mediaMode,
  audioOutputMode,
  bluetoothAvailable,
  outputSupported,
  error,
  remoteAudioRef,
  remoteVideoRef,
  localVideoRef,
  onToggleMute,
  onToggleCamera,
  onUpgradeToVideo,
  onSetOutputMode,
  onReattachMedia,
  onEnd,
  specialMode = false,
  fullscreen = false,
}) {
  const callAccepted = status === 'connecting' || status === 'active';
  const isVideo = mediaMode === 'video';
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const reattachRef = useRef(onReattachMedia);
  reattachRef.current = onReattachMedia;

  useLayoutEffect(() => {
    reattachRef.current?.();
  }, [isVideo, status]);

  useEffect(() => {
    if (!isVideo) {
      setRemoteHasVideo(false);
      return undefined;
    }
    const el = remoteVideoRef?.current;
    const sync = () => {
      setRemoteHasVideo(hasLiveVideo(el?.srcObject));
    };
    sync();
    const timer = setInterval(sync, 700);
    el?.addEventListener?.('loadedmetadata', sync);
    el?.addEventListener?.('playing', sync);
    return () => {
      clearInterval(timer);
      el?.removeEventListener?.('loadedmetadata', sync);
      el?.removeEventListener?.('playing', sync);
    };
  }, [isVideo, remoteVideoRef, status]);

  return (
    <aside
      className={[
        'call-screen',
        specialMode ? 'call-screen--special' : '',
        fullscreen ? 'call-screen--fullscreen' : '',
        isVideo ? 'call-screen--video' : '',
      ].filter(Boolean).join(' ')}
      aria-label={isVideo ? 'Видеозвонок' : 'Аудиозвонок'}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="call-remote-audio">
        <track kind="captions" />
      </audio>

      <div className="call-screen__header">
        <h2 className="call-screen__title">
          {specialMode ? 'call' : (isVideo ? 'Видеозвонок' : 'Звонок')}
        </h2>
        {callAccepted && status === 'active' && (
          <span className="call-screen__timer">{formatDuration(elapsedSeconds)}</span>
        )}
      </div>

      <div className="call-screen__body">
        {isVideo ? (
          <div className="call-video-stage">
            <video
              ref={remoteVideoRef}
              className={`call-video call-video--remote ${remoteHasVideo ? 'is-visible' : ''}`}
              autoPlay
              playsInline
            />
            {!remoteHasVideo && (
              <div className="call-video-fallback">
                <UserAvatar user={partner} size={fullscreen ? 120 : 88} />
                <p>У пользователя отключена камера</p>
              </div>
            )}
            <div className="call-video-pip">
              <video
                ref={localVideoRef}
                className="call-video call-video--local"
                autoPlay
                playsInline
                muted
              />
              {!cameraEnabled && <span className="call-video-pip-label">Камера выкл.</span>}
            </div>
          </div>
        ) : (
          <>
            <div className="call-screen-glow" aria-hidden="true" />
            <div className={`call-avatar ${status !== 'active' ? 'is-calling' : ''}`}>
              <UserAvatar user={partner} size={fullscreen ? 120 : 96} />
            </div>
            <h3 className="call-screen__nickname">@{partner?.nickname || 'Пользователь'}</h3>
            <p className="call-partner-name">
              {[partner?.first_name, partner?.last_name].filter(Boolean).join(' ')}
            </p>
            <div className="call-status" aria-live="polite">
              {status === 'active' ? formatDuration(elapsedSeconds) : STATUS_TEXT[status]}
            </div>
          </>
        )}

        {isVideo && (
          <div className="call-status call-status--overlay" aria-live="polite">
            @{partner?.nickname || 'Пользователь'}
            {' · '}
            {status === 'active' ? formatDuration(elapsedSeconds) : STATUS_TEXT[status]}
          </div>
        )}

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
                className={`call-control ${cameraEnabled ? '' : 'is-active'}`}
                onClick={onToggleCamera}
                aria-pressed={!cameraEnabled}
                title={cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <rect x="3" y="7" width="13" height="10" rx="2" />
                  <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
                  {!cameraEnabled && <path d="M3 3l18 18" strokeLinecap="round" />}
                </svg>
                <span>{cameraEnabled ? 'Камера' : 'Камера выкл.'}</span>
              </button>

              {!isVideo && (
                <button
                  type="button"
                  className="call-control"
                  onClick={onUpgradeToVideo}
                  title="Включить видео"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                    <rect x="3" y="7" width="13" height="10" rx="2" />
                    <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
                  </svg>
                  <span>Видео</span>
                </button>
              )}

              {outputSupported && (
                <div className="call-output-modes" role="group" aria-label="Вывод звука">
                  <button
                    type="button"
                    className={`call-control call-control--compact ${audioOutputMode === 'earpiece' ? 'is-active' : ''}`}
                    onClick={() => onSetOutputMode('earpiece')}
                    title="На ухо"
                  >
                    <span>Ухо</span>
                  </button>
                  <button
                    type="button"
                    className={`call-control call-control--compact ${audioOutputMode === 'speaker' ? 'is-active' : ''}`}
                    onClick={() => onSetOutputMode('speaker')}
                    title="Динамик"
                  >
                    <span>Динамик</span>
                  </button>
                  {bluetoothAvailable && (
                    <button
                      type="button"
                      className={`call-control call-control--compact ${audioOutputMode === 'bluetooth' ? 'is-active' : ''}`}
                      onClick={() => onSetOutputMode('bluetooth')}
                      title="Bluetooth"
                    >
                      <span>BT</span>
                    </button>
                  )}
                </div>
              )}
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
