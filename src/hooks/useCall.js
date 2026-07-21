import { useCallback, useEffect, useRef, useState } from 'react';
import { callsApi } from '../api/client';
import { WS_URL } from '../config';

const TERMINAL_ACTIONS = new Set([
  'call.rejected',
  'call.cancelled',
  'call.ended',
  'call.missed',
  'call.failed',
]);

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getClientInstanceId() {
  const key = 'monica_call_client_instance_id';
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : fallbackUuid();
    sessionStorage.setItem(key, value);
  }
  return value;
}

function mediaErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Разрешите доступ к микрофону в настройках браузера и попробуйте снова.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'Микрофон не найден. Подключите устройство и попробуйте снова.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'Микрофон занят другим приложением или недоступен.';
  }
  return error?.response?.data?.detail || error?.message || 'Не удалось начать аудиозвонок.';
}

function normalizeCall(payload) {
  return payload?.call || payload || null;
}

function otherParticipant(call, userId) {
  if (!call) return null;
  return String(call.caller?.id) === String(userId) ? call.callee : call.caller;
}

export function useCall(currentUser) {
  const [status, setStatus] = useState('idle');
  const [call, setCall] = useState(null);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState('default');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [outputSupported] = useState(
    () => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype
  );

  const mountedRef = useRef(true);
  const callRef = useRef(null);
  const statusRef = useRef('idle');
  const streamRef = useRef(null);
  const pcRef = useRef(null);
  const peerPromiseRef = useRef(null);
  const wsRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingIceRef = useRef([]);
  const timerRef = useRef(null);
  const socketOpenPromiseRef = useRef(null);
  const acceptedRef = useRef(false);
  const makingOfferRef = useRef(false);
  const disconnectTimerRef = useRef(null);
  const signalingRetryTimerRef = useRef(null);
  const signalingRetryRef = useRef(0);
  const allowSignalingReconnectRef = useRef(false);
  const clientInstanceIdRef = useRef(getClientInstanceId());

  const updateStatus = useCallback((next) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const updateCall = useCallback((next) => {
    callRef.current = next;
    if (mountedRef.current) setCall(next);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const startedAt = Date.now();
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      if (mountedRef.current) setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }, [stopTimer]);

  const closeMedia = useCallback(() => {
    stopTimer();
    allowSignalingReconnectRef.current = false;
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    disconnectTimerRef.current = null;
    if (signalingRetryTimerRef.current) clearTimeout(signalingRetryTimerRef.current);
    signalingRetryTimerRef.current = null;
    signalingRetryRef.current = 0;
    pendingIceRef.current = [];
    peerPromiseRef.current = null;
    acceptedRef.current = false;
    makingOfferRef.current = false;
    socketOpenPromiseRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      if (ws.readyState < WebSocket.CLOSING) ws.close();
    }
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, [stopTimer]);

  const finish = useCallback((message = '') => {
    closeMedia();
    if (message && mountedRef.current) setError(message);
    updateStatus('ended');
    setMuted(false);
    setSpeakerMuted(false);
    setElapsedSeconds(0);
  }, [closeMedia, updateStatus]);

  const failCall = useCallback((message, reason = 'connection_failed') => {
    const callId = callRef.current?.id;
    finish(message);
    if (callId) {
      callsApi.hangup(callId, { end_reason: reason }).catch(() => {});
    }
  }, [finish]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      if (mountedRef.current) {
        setDevices(all.filter((device) => device.kind === 'audiooutput'));
      }
    } catch {
      if (mountedRef.current) setDevices([]);
    }
  }, []);

  const ensureLocalAudio = useCallback(async () => {
    if (streamRef.current?.active) return streamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Аудиозвонки не поддерживаются этим браузером.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((track) => track.stop());
      const noDevice = new Error('Микрофон не найден.');
      noDevice.name = 'NotFoundError';
      throw noDevice;
    }
    streamRef.current = stream;
    await refreshDevices();
    return stream;
  }, [refreshDevices]);

  const markActive = useCallback(() => {
    if (statusRef.current !== 'active') {
      updateStatus('active');
      startTimer();
    }
  }, [startTimer, updateStatus]);

  const sendSignal = useCallback((action, payload = {}) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ action, ...payload }));
    return true;
  }, []);

  const createPeer = useCallback(async () => {
    if (pcRef.current) return pcRef.current;
    if (peerPromiseRef.current) return peerPromiseRef.current;
    peerPromiseRef.current = (async () => {
      const [{ data: iceData }, stream] = await Promise.all([
        callsApi.iceConfig(),
        ensureLocalAudio(),
      ]);
      if (pcRef.current) return pcRef.current;
      const iceServers = iceData?.iceServers || iceData?.ice_servers || iceData || [];
      const pc = new RTCPeerConnection({ iceServers: Array.isArray(iceServers) ? iceServers : [] });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('call.ice', {
            data: { candidate: event.candidate.toJSON?.() || event.candidate },
          });
        }
      };
      pc.ontrack = (event) => {
        const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
        markActive();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
          markActive();
          sendSignal('call.connected');
        } else if (pc.connectionState === 'disconnected') {
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = setTimeout(() => {
            if (pcRef.current === pc && ['disconnected', 'failed'].includes(pc.connectionState)) {
              failCall('Соединение звонка прервано.', 'ice_disconnected');
            }
          }, 8000);
        } else if (pc.connectionState === 'failed' && statusRef.current !== 'ended') {
          failCall('Соединение звонка прервано.', 'peer_connection_failed');
        }
      };
      pcRef.current = pc;
      return pc;
    })();
    try {
      return await peerPromiseRef.current;
    } finally {
      peerPromiseRef.current = null;
    }
  }, [ensureLocalAudio, failCall, markActive, sendSignal]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // A stale candidate can arrive after renegotiation.
      }
    }
  }, []);

  const makeOffer = useCallback(async () => {
    if (makingOfferRef.current || !acceptedRef.current) return;
    makingOfferRef.current = true;
    try {
      const pc = await createPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal('call.offer', { data: { sdp: pc.localDescription } });
      updateStatus('connecting');
    } catch (err) {
      failCall(mediaErrorMessage(err), 'offer_failed');
    } finally {
      makingOfferRef.current = false;
    }
  }, [createPeer, failCall, sendSignal, updateStatus]);

  const handleSignal = useCallback(async (data) => {
    try {
      const signal = data?.data && typeof data.data === 'object'
        ? { ...data, ...data.data }
        : data;
      if (signal.action === 'call.offer') {
        const pc = await createPeer();
        const offer = typeof signal.sdp === 'string'
          ? { type: 'offer', sdp: signal.sdp }
          : signal.sdp;
        await pc.setRemoteDescription(offer);
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('call.answer', { data: { sdp: pc.localDescription } });
        updateStatus('connecting');
      } else if (signal.action === 'call.answer') {
        const pc = await createPeer();
        const answer = typeof signal.sdp === 'string'
          ? { type: 'answer', sdp: signal.sdp }
          : signal.sdp;
        await pc.setRemoteDescription(answer);
        await flushIce();
      } else if (signal.action === 'call.ice' && signal.candidate) {
        const pc = await createPeer();
        if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
        else pendingIceRef.current.push(signal.candidate);
      } else if (signal.action === 'call.connected') {
        markActive();
      } else if (
        signal.action === 'call.rejoin'
        && callRef.current?.status === 'active'
        && String(callRef.current?.caller?.id) === String(currentUser?.id)
      ) {
        acceptedRef.current = true;
        makeOffer();
      } else if (TERMINAL_ACTIONS.has(signal.action)) {
        finish();
      }
    } catch (err) {
      failCall(mediaErrorMessage(err), 'signaling_failed');
    }
  }, [
    createPeer,
    currentUser?.id,
    failCall,
    finish,
    flushIce,
    makeOffer,
    markActive,
    sendSignal,
    updateStatus,
  ]);

  const openSignaling = useCallback((callId) => {
    if (wsRef.current && callRef.current?.id === callId) {
      return socketOpenPromiseRef.current || Promise.resolve();
    }
    if (!localStorage.getItem('access_token')) {
      return Promise.reject(new Error('Сессия истекла. Войдите снова.'));
    }
    allowSignalingReconnectRef.current = true;
    let initialSettled = false;
    const connect = (resolve, reject) => {
      if (!allowSignalingReconnectRef.current) return;
      const token = localStorage.getItem('access_token');
      if (!token) {
        reject(new Error('Сессия истекла. Войдите снова.'));
        return;
      }
      const ws = new WebSocket(`${WS_URL}/ws/call/${callId}/?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onopen = () => {
        signalingRetryRef.current = 0;
        sendSignal('call.rejoin');
        if (!initialSettled) {
          initialSettled = true;
          resolve();
        }
      };
      ws.onerror = () => {
        if (!initialSettled) {
          initialSettled = true;
          reject(new Error('Не удалось открыть канал звонка.'));
        }
      };
      ws.onmessage = (event) => {
        try {
          handleSignal(JSON.parse(event.data));
        } catch {
          // Ignore malformed signaling payloads.
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!allowSignalingReconnectRef.current) return;
        const attempt = signalingRetryRef.current;
        if (attempt >= 5) {
          failCall('Соединение с сервером звонка потеряно.', 'signaling_lost');
          return;
        }
        signalingRetryRef.current += 1;
        signalingRetryTimerRef.current = setTimeout(() => {
          callsApi.active()
            .catch(() => {})
            .finally(() => connect(() => {}, () => {}));
        }, Math.min(1000 * 2 ** attempt, 8000));
      };
    };
    socketOpenPromiseRef.current = new Promise((resolve, reject) => connect(resolve, reject));
    return socketOpenPromiseRef.current;
  }, [failCall, handleSignal, sendSignal]);

  const startCall = useCallback(async (chatId) => {
    if (!chatId || !['idle', 'ended'].includes(statusRef.current)) return;
    setError('');
    updateStatus('outgoing');
    try {
      await ensureLocalAudio();
      const { data } = await callsApi.start(chatId, {
        client_instance_id: clientInstanceIdRef.current,
      });
      const nextCall = normalizeCall(data);
      updateCall(nextCall);
      await openSignaling(nextCall.id);
    } catch (err) {
      finish(mediaErrorMessage(err));
    }
  }, [ensureLocalAudio, finish, openSignaling, updateCall, updateStatus]);

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || statusRef.current !== 'incoming') return;
    setError('');
    updateStatus('connecting');
    try {
      await ensureLocalAudio();
      await openSignaling(current.id);
      const { data } = await callsApi.accept(current.id, {
        client_instance_id: clientInstanceIdRef.current,
      });
      updateCall(normalizeCall(data) || current);
    } catch (err) {
      finish(mediaErrorMessage(err));
    }
  }, [ensureLocalAudio, finish, openSignaling, updateCall, updateStatus]);

  const rejectCall = useCallback(async () => {
    const id = callRef.current?.id;
    if (!id) return;
    finish();
    try {
      await callsApi.reject(id, { end_reason: 'rejected' });
    } catch {
      // Presence terminal event may already have resolved it.
    }
  }, [finish]);

  const cancelCall = useCallback(async () => {
    const id = callRef.current?.id;
    if (!id) return;
    finish();
    try {
      await callsApi.cancel(id, { end_reason: 'cancelled' });
    } catch {
      // Presence terminal event may already have resolved it.
    }
  }, [finish]);

  const hangup = useCallback(async () => {
    const id = callRef.current?.id;
    if (!id) return;
    finish();
    try {
      await callsApi.hangup(id, { end_reason: 'hangup' });
    } catch {
      // Local cleanup must not depend on the request.
    }
  }, [finish]);

  const onCallEvent = useCallback((event) => {
    const nextCall = normalizeCall(event);
    if (!nextCall?.id) return;
    if (
      String(nextCall.caller?.id) === String(currentUser?.id)
      && nextCall.client_instance_id
      && String(nextCall.client_instance_id) !== String(clientInstanceIdRef.current)
    ) {
      return;
    }
    const currentId = callRef.current?.id;
    if (event.action === 'call.incoming') {
      if (currentId && String(currentId) !== String(nextCall.id)
          && !['idle', 'ended'].includes(statusRef.current)) return;
      closeMedia();
      setError('');
      updateCall(nextCall);
      updateStatus('incoming');
      return;
    }
    if (currentId && String(currentId) !== String(nextCall.id)) return;
    updateCall(nextCall);
    if (event.action === 'call.ringing') {
      updateStatus('outgoing');
    } else if (event.action === 'call.accepted') {
      if (
        String(nextCall.callee?.id) === String(currentUser?.id)
        && nextCall.accepted_client_instance_id
        && String(nextCall.accepted_client_instance_id) !== String(clientInstanceIdRef.current)
      ) {
        finish('Звонок принят в другой вкладке.');
        return;
      }
      acceptedRef.current = true;
      updateStatus('connecting');
      openSignaling(nextCall.id).then(() => {
        if (String(nextCall.caller?.id) === String(currentUser?.id)) makeOffer();
      }).catch((err) => finish(mediaErrorMessage(err)));
    } else if (TERMINAL_ACTIONS.has(event.action)) {
      finish();
    }
  }, [closeMedia, currentUser?.id, finish, makeOffer, openSignaling, updateCall, updateStatus]);

  const toggleMute = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() || [];
    if (!tracks.length) return;
    const nextMuted = !muted;
    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const toggleSpeakerMute = useCallback(() => {
    const next = !speakerMuted;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = next;
    }
    setSpeakerMuted(next);
  }, [speakerMuted]);

  const selectOutput = useCallback(async (deviceId) => {
    if (!outputSupported || !remoteAudioRef.current?.setSinkId) return false;
    try {
      await remoteAudioRef.current.setSinkId(deviceId);
      setSelectedOutputId(deviceId);
      setError('');
      return true;
    } catch {
      setError('Не удалось переключить устройство вывода. Используется системное устройство.');
      return false;
    }
  }, [outputSupported]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) return undefined;
    callsApi.active().then(({ data }) => {
      if (cancelled) return;
      const activeCall = normalizeCall(Array.isArray(data) ? data[0] : data);
      if (!activeCall?.id) return;
      const isCaller = String(activeCall.caller?.id) === String(currentUser.id);
      if (
        isCaller
        && String(activeCall.client_instance_id) !== String(clientInstanceIdRef.current)
      ) {
        return;
      }
      if (
        !isCaller
        && activeCall.accepted_client_instance_id
        && String(activeCall.accepted_client_instance_id) !== String(clientInstanceIdRef.current)
      ) {
        return;
      }
      updateCall(activeCall);
      const isIncoming = String(activeCall.callee?.id) === String(currentUser.id)
        && ['pending', 'ringing'].includes(activeCall.status);
      updateStatus(isIncoming ? 'incoming' : 'connecting');
      if (!isIncoming) {
        acceptedRef.current = activeCall.status === 'active';
        openSignaling(activeCall.id).then(() => {
          if (String(activeCall.caller?.id) === String(currentUser.id)) makeOffer();
        }).catch((err) => finish(mediaErrorMessage(err)));
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser, finish, makeOffer, openSignaling, updateCall, updateStatus]);

  useEffect(() => () => {
    mountedRef.current = false;
    closeMedia();
  }, [closeMedia]);

  return {
    status,
    call,
    partner: otherParticipant(call, currentUser?.id),
    error,
    muted,
    speakerMuted,
    devices,
    selectedOutputId,
    outputSupported,
    elapsedSeconds,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    hangup,
    toggleMute,
    toggleSpeakerMute,
    selectOutput,
    onCallEvent,
  };
}
