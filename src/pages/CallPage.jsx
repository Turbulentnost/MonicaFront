import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CallScreen } from '../components/Chat/CallScreen';
import { useCallContext } from '../context/CallContext';

function callChatId(call) {
  if (!call) return null;
  return call.chat_id
    || (typeof call.chat === 'object' ? call.chat?.id : call.chat)
    || null;
}

export default function CallPage() {
  const navigate = useNavigate();
  const call = useCallContext();
  const visible = ['outgoing', 'connecting', 'active'].includes(call.status);
  const lastChatIdRef = useRef(null);

  useEffect(() => {
    const id = callChatId(call.call);
    if (id) lastChatIdRef.current = id;
  }, [call.call]);

  useEffect(() => {
    if (visible) return undefined;
    const chatId = lastChatIdRef.current;
    navigate(chatId ? `/chats/${chatId}` : '/chats', { replace: true });
    return undefined;
  }, [navigate, visible]);

  if (!visible) return null;

  return (
    <div className="call-page">
      <CallScreen
        partner={call.partner}
        status={call.status}
        elapsedSeconds={call.elapsedSeconds}
        muted={call.muted}
        cameraEnabled={call.cameraEnabled}
        mediaMode={call.mediaMode}
        audioOutputMode={call.audioOutputMode}
        bluetoothAvailable={call.bluetoothAvailable}
        outputSupported={call.outputSupported}
        error={call.error}
        remoteAudioRef={call.remoteAudioRef}
        remoteVideoRef={call.remoteVideoRef}
        localVideoRef={call.localVideoRef}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        onUpgradeToVideo={call.upgradeToVideo}
        onSetOutputMode={call.setOutputMode}
        onReattachMedia={call.reattachMedia}
        onEnd={call.status === 'outgoing' ? call.cancelCall : call.hangup}
        fullscreen
      />
    </div>
  );
}
