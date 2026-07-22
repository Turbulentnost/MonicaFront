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

function isMobileUa() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

function classifyOutputDevice(device) {
  const label = (device.label || '').toLowerCase();
  if (
    label.includes('bluetooth')
    || label.includes('airpods')
    || label.includes('headset')
    || label.includes('hands-free')
  ) {
    return 'bluetooth';
  }
  if (
    label.includes('speaker')
    || label.includes('динамик')
    || label.includes('loud')
  ) {
    return 'speaker';
  }
  return 'other';
}

function mediaErrorMessage(error, wantVideo = false) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return wantVideo
      ? 'Разрешите доступ к камере и микрофону в настройках браузера.'
      : 'Разрешите доступ к микрофону в настройках браузера и попробуйте снова.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return wantVideo
      ? 'Камера или микрофон не найдены. Подключите устройство и попробуйте снова.'
      : 'Микрофон не найден. Подключите устройство и попробуйте снова.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return wantVideo
      ? 'Камера или микрофон заняты другим приложением.'
      : 'Микрофон занят другим приложением или недоступен.';
  }
  return error?.response?.data?.detail
    || error?.message
    || (wantVideo ? 'Не удалось начать видеозвонок.' : 'Не удалось начать аудиозвонок.');
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
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaMode, setMediaMode] = useState('audio');
  const [audioOutputMode, setAudioOutputMode] = useState('earpiece');
  const [devices, setDevices] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState('default');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [outputSupported] = useState(
    () => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype
  );

  const mountedRef = useRef(true);
  const callRef = useRef(null);
  const statusRef = useRef('idle');
  const mediaModeRef = useRef('audio');
  const streamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const peerPromiseRef = useRef(null);
  const wsRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const pendingIceRef = useRef([]);
  const timerRef = useRef(null);
  const socketOpenPromiseRef = useRef(null);
  const acceptedRef = useRef(false);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const disconnectTimerRef = useRef(null);
  const signalingRetryTimerRef = useRef(null);
  const signalingRetryRef = useRef(0);
  const allowSignalingReconnectRef = useRef(false);
  const clientInstanceIdRef = useRef(getClientInstanceId());
  const audioOutputModeRef = useRef('earpiece');

  const isPolite = useCallback(() => {
    const current = callRef.current;
    if (!current || !currentUser) return false;
    return String(current.callee?.id) === String(currentUser.id);
  }, [currentUser]);

  const updateStatus = useCallback((next) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const updateCall = useCallback((next) => {
    callRef.current = next;
    if (next?.media_mode) {
      mediaModeRef.current = next.media_mode;
      if (mountedRef.current) setMediaMode(next.media_mode);
    }
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

  const attachLocalVideo = useCallback(() => {
    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  const attachRemoteMedia = useCallback(() => {
    const remote = remoteStreamRef.current;
    if (!remote) return;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remote;
      remoteAudioRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remote;
      remoteVideoRef.current.playsInline = true;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, []);

  const applySinkId = useCallback(async (deviceId) => {
    if (!outputSupported) return false;
    const targets = [remoteAudioRef.current, remoteVideoRef.current].filter(Boolean);
    if (!targets.length) return false;
    const sink = !deviceId || deviceId === 'default' ? '' : deviceId;
    try {
      await Promise.all(targets.map((el) => el.setSinkId?.(sink)));
      setSelectedOutputId(deviceId || 'default');
      return true;
    } catch {
      return false;
    }
  }, [outputSupported]);

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

  const pickDeviceForMode = useCallback((mode, outputDevices) => {
    if (!outputDevices?.length) return 'default';
    if (mode === 'bluetooth') {
      const bt = outputDevices.find((d) => classifyOutputDevice(d) === 'bluetooth');
      return bt?.deviceId || 'default';
    }
    if (mode === 'speaker') {
      const speaker = outputDevices.find((d) => classifyOutputDevice(d) === 'speaker');
      if (speaker) return speaker.deviceId;
      const nonBt = outputDevices.find((d) => classifyOutputDevice(d) !== 'bluetooth');
      return nonBt?.deviceId || outputDevices[0]?.deviceId || 'default';
    }
    return 'default';
  }, []);

  const setOutputMode = useCallback(async (mode, outputDevices = devices) => {
    audioOutputModeRef.current = mode;
    if (mountedRef.current) setAudioOutputMode(mode);
    const deviceId = pickDeviceForMode(mode, outputDevices);
    await applySinkId(deviceId);
  }, [applySinkId, devices, pickDeviceForMode]);

  const reattachMedia = useCallback(() => {
    attachLocalVideo();
    attachRemoteMedia();
    const deviceId = pickDeviceForMode(audioOutputModeRef.current, devices);
    applySinkId(deviceId);
  }, [applySinkId, attachLocalVideo, attachRemoteMedia, devices, pickDeviceForMode]);

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
    ignoreOfferRef.current = false;
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
      pc.onnegotiationneeded = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [stopTimer]);

  const finish = useCallback((message = '') => {
    closeMedia();
    callRef.current = null;
    if (mountedRef.current) {
      setCall(null);
      if (message) setError(message);
      else setError('');
    }
    updateStatus(message ? 'ended' : 'idle');
    setMuted(false);
    setCameraEnabled(false);
    setMediaMode('audio');
    mediaModeRef.current = 'audio';
    setAudioOutputMode('earpiece');
    audioOutputModeRef.current = 'earpiece';
    setElapsedSeconds(0);
  }, [closeMedia, updateStatus]);

  const failCall = useCallback((message, reason = 'connection_failed') => {
    const callId = callRef.current?.id;
    finish(message);
    if (callId) {
      callsApi.hangup(callId, { end_reason: reason }).catch(() => {});
    }
  }, [finish]);

  const restoreIncoming = useCallback((message) => {
    closeMedia();
    acceptedRef.current = false;
    if (mountedRef.current) {
      if (message) setError(message);
      setMuted(false);
      setCameraEnabled(false);
    }
    updateStatus('incoming');
  }, [closeMedia, updateStatus]);

  const ensureLocalMedia = useCallback(async (wantVideo) => {
    const existing = streamRef.current;
    if (existing?.active) {
      const hasVideo = existing.getVideoTracks().some((t) => t.readyState === 'live');
      if (!wantVideo || hasVideo) {
        if (mountedRef.current) setCameraEnabled(wantVideo && hasVideo);
        attachLocalVideo();
        return existing;
      }
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Звонки не поддерживаются этим браузером.');
    }
    const constraints = {
      audio: true,
      video: wantVideo ? { facingMode: 'user' } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((track) => track.stop());
      const noDevice = new Error('Микрофон не найден.');
      noDevice.name = 'NotFoundError';
      throw noDevice;
    }
    if (wantVideo && !stream.getVideoTracks().length) {
      stream.getTracks().forEach((track) => track.stop());
      const noCam = new Error('Камера не найдена.');
      noCam.name = 'NotFoundError';
      throw noCam;
    }
    if (existing) {
      existing.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = stream;
    if (mountedRef.current) setCameraEnabled(wantVideo);
    await refreshDevices();
    attachLocalVideo();
    return stream;
  }, [attachLocalVideo, refreshDevices]);

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

  const createPeer = useCallback(async (wantVideo) => {
    if (pcRef.current) return pcRef.current;
    if (peerPromiseRef.current) return peerPromiseRef.current;
    peerPromiseRef.current = (async () => {
      const needVideo = wantVideo ?? (mediaModeRef.current === 'video');
      const [{ data: iceData }, stream] = await Promise.all([
        callsApi.iceConfig(),
        ensureLocalMedia(needVideo),
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
        let remoteStream = remoteStreamRef.current;
        if (!remoteStream) {
          remoteStream = event.streams?.[0] || new MediaStream();
          remoteStreamRef.current = remoteStream;
        }
        if (event.track && !remoteStream.getTracks().includes(event.track)) {
          remoteStream.addTrack(event.track);
        }
        attachRemoteMedia();
        markActive();
      };
      pc.onnegotiationneeded = async () => {
        try {
          if (makingOfferRef.current || !acceptedRef.current) return;
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          sendSignal('call.offer', { data: { sdp: pc.localDescription } });
        } catch {
          // Ignore glare/negotiation races.
        } finally {
          makingOfferRef.current = false;
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
          markActive();
          sendSignal('call.connected');
          setOutputMode(audioOutputModeRef.current);
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
  }, [attachRemoteMedia, ensureLocalMedia, failCall, markActive, sendSignal, setOutputMode]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // stale candidate
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
      failCall(mediaErrorMessage(err, mediaModeRef.current === 'video'), 'offer_failed');
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
        const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
        ignoreOfferRef.current = !isPolite() && offerCollision;
        if (ignoreOfferRef.current) return;
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
      } else if (signal.action === 'call.media_mode') {
        const next = normalizeCall(signal) || callRef.current;
        if (next) updateCall({ ...callRef.current, ...next, media_mode: next.media_mode || 'video' });
        mediaModeRef.current = 'video';
        setMediaMode('video');
        if (audioOutputModeRef.current !== 'bluetooth') {
          setOutputMode('speaker');
        }
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
      failCall(mediaErrorMessage(err, mediaModeRef.current === 'video'), 'signaling_failed');
    }
  }, [
    createPeer,
    currentUser?.id,
    failCall,
    finish,
    flushIce,
    isPolite,
    makeOffer,
    markActive,
    sendSignal,
    setOutputMode,
    updateCall,
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
          // ignore
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

  const startCall = useCallback(async (chatId, mode = 'audio') => {
    if (!chatId || !['idle', 'ended'].includes(statusRef.current)) return;
    const wantVideo = mode === 'video';
    setError('');
    mediaModeRef.current = wantVideo ? 'video' : 'audio';
    setMediaMode(mediaModeRef.current);
    const initialOutput = wantVideo ? 'speaker' : (isMobileUa() ? 'earpiece' : 'speaker');
    audioOutputModeRef.current = initialOutput;
    setAudioOutputMode(initialOutput);
    updateStatus('outgoing');
    try {
      await ensureLocalMedia(wantVideo);
      const { data } = await callsApi.start(chatId, {
        client_instance_id: clientInstanceIdRef.current,
        media_mode: mediaModeRef.current,
      });
      const nextCall = normalizeCall(data);
      updateCall(nextCall);
      await openSignaling(nextCall.id);
      await setOutputMode(initialOutput);
    } catch (err) {
      const callId = callRef.current?.id;
      finish(mediaErrorMessage(err, wantVideo));
      // Never leave the callee ringing if we failed after creating the session.
      if (callId) {
        callsApi.cancel(callId, { end_reason: 'media_failed' }).catch(() => {});
      }
    }
  }, [ensureLocalMedia, finish, openSignaling, setOutputMode, updateCall, updateStatus]);

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || statusRef.current !== 'incoming') return false;
    setError('');
    const wantVideo = current.media_mode === 'video';
    mediaModeRef.current = wantVideo ? 'video' : 'audio';
    setMediaMode(mediaModeRef.current);
    const initialOutput = wantVideo ? 'speaker' : (isMobileUa() ? 'earpiece' : 'speaker');
    audioOutputModeRef.current = initialOutput;
    setAudioOutputMode(initialOutput);
    updateStatus('connecting');
    let acceptedOnServer = false;
    try {
      try {
        await ensureLocalMedia(wantVideo);
      } catch (mediaErr) {
        // Video answer without a camera is fine; keep ringing if even mic is missing.
        if (!wantVideo) throw mediaErr;
        await ensureLocalMedia(false);
        if (mountedRef.current) {
          setError('Камера недоступна — входящий звонок без вашего видео.');
        }
      }
      await openSignaling(current.id);
      const { data } = await callsApi.accept(current.id, {
        client_instance_id: clientInstanceIdRef.current,
      });
      acceptedOnServer = true;
      updateCall(normalizeCall(data) || current);
      await setOutputMode(initialOutput);
      return true;
    } catch (err) {
      if (acceptedOnServer) {
        failCall(mediaErrorMessage(err, wantVideo), 'accept_failed');
      } else {
        // Keep the incoming UI — caller is still ringing us.
        restoreIncoming(mediaErrorMessage(err, wantVideo));
      }
      return false;
    }
  }, [
    ensureLocalMedia,
    failCall,
    openSignaling,
    restoreIncoming,
    setOutputMode,
    updateCall,
    updateStatus,
  ]);

  const rejectCall = useCallback(async () => {
    const id = callRef.current?.id;
    finish();
    if (id) callsApi.reject(id, { end_reason: 'rejected' }).catch(() => {});
  }, [finish]);

  const cancelCall = useCallback(async () => {
    const id = callRef.current?.id;
    finish();
    if (id) callsApi.cancel(id, { end_reason: 'cancelled' }).catch(() => {});
  }, [finish]);

  const hangup = useCallback(async () => {
    const id = callRef.current?.id;
    finish();
    if (id) callsApi.hangup(id, { end_reason: 'hangup' }).catch(() => {});
  }, [finish]);

  const toggleMute = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() || [];
    if (!tracks.length) return;
    const nextMuted = !muted;
    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const replaceOrAddVideoTrack = useCallback(async (videoTrack) => {
    const pc = await createPeer(true);
    const videoSender = pc.getSenders().find((item) => item.track?.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(videoTrack);
    } else if (videoTrack) {
      const stream = streamRef.current || new MediaStream([videoTrack]);
      if (streamRef.current && !streamRef.current.getVideoTracks().includes(videoTrack)) {
        streamRef.current.addTrack(videoTrack);
      }
      pc.addTrack(videoTrack, streamRef.current || stream);
    }
    attachLocalVideo();
    if (acceptedRef.current) {
      await makeOffer();
    }
  }, [attachLocalVideo, createPeer, makeOffer]);

  const toggleCamera = useCallback(async () => {
    try {
      setError('');
      if (cameraEnabled) {
        const tracks = streamRef.current?.getVideoTracks() || [];
        tracks.forEach((track) => {
          track.enabled = false;
          track.stop();
          streamRef.current?.removeTrack(track);
        });
        const pc = pcRef.current;
        const sender = pc?.getSenders().find((item) => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(null);
        setCameraEnabled(false);
        attachLocalVideo();
        if (acceptedRef.current) await makeOffer();
        return;
      }
      if (mediaModeRef.current !== 'video' && callRef.current?.id) {
        const { data } = await callsApi.setMediaMode(callRef.current.id, { media_mode: 'video' });
        updateCall(normalizeCall(data) || { ...callRef.current, media_mode: 'video' });
        mediaModeRef.current = 'video';
        setMediaMode('video');
        if (audioOutputModeRef.current !== 'bluetooth') {
          await setOutputMode('speaker');
        }
      }
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      const videoTrack = camStream.getVideoTracks()[0];
      if (!videoTrack) throw Object.assign(new Error('Камера не найдена.'), { name: 'NotFoundError' });
      if (!streamRef.current) {
        await ensureLocalMedia(true);
      } else {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.stop();
          streamRef.current.removeTrack(track);
        });
        streamRef.current.addTrack(videoTrack);
      }
      setCameraEnabled(true);
      await replaceOrAddVideoTrack(videoTrack);
    } catch (err) {
      if (mountedRef.current) setError(mediaErrorMessage(err, true));
    }
  }, [
    attachLocalVideo,
    cameraEnabled,
    ensureLocalMedia,
    makeOffer,
    replaceOrAddVideoTrack,
    setOutputMode,
    updateCall,
  ]);

  const upgradeToVideo = useCallback(async () => {
    if (mediaModeRef.current === 'video' && cameraEnabled) return;
    await toggleCamera();
  }, [cameraEnabled, toggleCamera]);

  const onCallEvent = useCallback((event) => {
    const nextCall = normalizeCall(event);
    if (event.action === 'call.incoming') {
      if (!nextCall?.id) return;
      if (statusRef.current !== 'idle' && statusRef.current !== 'ended') return;
      updateCall(nextCall);
      mediaModeRef.current = nextCall.media_mode || 'audio';
      setMediaMode(mediaModeRef.current);
      updateStatus('incoming');
      return;
    }
    if (event.action === 'call.ringing') {
      if (nextCall) updateCall(nextCall);
      if (statusRef.current === 'outgoing') updateStatus('outgoing');
      return;
    }
    if (event.action === 'call.accepted') {
      if (nextCall) updateCall(nextCall);
      if (
        nextCall?.accepted_client_instance_id
        && String(nextCall.accepted_client_instance_id) !== String(clientInstanceIdRef.current)
        && String(nextCall.callee?.id) === String(currentUser?.id)
      ) {
        finish('Звонок принят на другом устройстве.');
        return;
      }
      acceptedRef.current = true;
      updateStatus('connecting');
      openSignaling(nextCall?.id || callRef.current?.id).then(() => {
        if (String(nextCall?.caller?.id || callRef.current?.caller?.id) === String(currentUser?.id)) {
          makeOffer();
        }
      }).catch((err) => finish(mediaErrorMessage(err)));
      return;
    }
    if (event.action === 'call.media_mode') {
      if (nextCall) updateCall({ ...callRef.current, ...nextCall });
      mediaModeRef.current = 'video';
      setMediaMode('video');
      if (audioOutputModeRef.current !== 'bluetooth') {
        setOutputMode('speaker');
      }
      return;
    }
    if (TERMINAL_ACTIONS.has(event.action)) {
      finish();
    }
  }, [currentUser?.id, finish, makeOffer, openSignaling, setOutputMode, updateCall, updateStatus]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  // Auto-dismiss call errors; return to idle after a failed start/end.
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      setError('');
      if (statusRef.current === 'ended') {
        updateStatus('idle');
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [error, updateStatus]);

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
      mediaModeRef.current = activeCall.media_mode || 'audio';
      setMediaMode(mediaModeRef.current);
      const isIncoming = String(activeCall.callee?.id) === String(currentUser.id)
        && ['pending', 'ringing'].includes(activeCall.status);
      updateStatus(isIncoming ? 'incoming' : 'connecting');
      if (!isIncoming) {
        acceptedRef.current = activeCall.status === 'active';
        openSignaling(activeCall.id).then(() => {
          if (String(activeCall.caller?.id) === String(currentUser.id)) makeOffer();
        }).catch((err) => finish(mediaErrorMessage(err, mediaModeRef.current === 'video')));
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

  const bluetoothAvailable = devices.some((d) => classifyOutputDevice(d) === 'bluetooth');

  return {
    status,
    call,
    partner: otherParticipant(call, currentUser?.id),
    error,
    muted,
    cameraEnabled,
    mediaMode,
    audioOutputMode,
    bluetoothAvailable,
    devices,
    selectedOutputId,
    outputSupported,
    elapsedSeconds,
    remoteAudioRef,
    remoteVideoRef,
    localVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    hangup,
    toggleMute,
    toggleCamera,
    upgradeToVideo,
    setOutputMode,
    reattachMedia,
    onCallEvent,
  };
}
