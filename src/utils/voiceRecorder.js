const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

export function canUseMicrophone() {
  return Boolean(
    typeof navigator !== 'undefined'
      && window.isSecureContext
      && navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof MediaRecorder !== 'undefined'
  );
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function extensionForMime(mimeType) {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

function normalizeAmplitude(value) {
  return Math.min(1, Math.max(0.05, value));
}

export class VoiceRecorder {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.mimeType = '';
    this.startedAt = 0;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.rafId = null;
    this.waveform = [];
    this.onTick = null;
  }

  async start(onTick) {
    if (this.recorder) {
      throw new Error('Запись уже идёт');
    }
    if (!canUseMicrophone()) {
      throw new Error('Микрофон недоступен');
    }

    this.onTick = onTick || null;
    this.chunks = [];
    this.waveform = [];
    this.mimeType = pickMimeType();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });

    this.recorder = new MediaRecorder(
      this.stream,
      this.mimeType ? { mimeType: this.mimeType } : undefined
    );
    this.mimeType = this.recorder.mimeType || this.mimeType || 'audio/webm';

    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this._startAnalyser();
    this.startedAt = Date.now();
    this.recorder.start(100);
    this._tick();
  }

  _startAnalyser() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.audioContext = new AudioCtx();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.sourceNode.connect(this.analyser);
  }

  _sampleAmplitude() {
    if (!this.analyser) return 0.2;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const centered = (data[i] - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / data.length);
    return normalizeAmplitude(rms * 3.2);
  }

  _tick = () => {
    if (!this.recorder) return;
    const amplitude = this._sampleAmplitude();
    this.waveform.push(amplitude);
    if (this.waveform.length > 96) {
      this.waveform = this.waveform.slice(-96);
    }
    if (this.onTick) {
      this.onTick({
        elapsedMs: Date.now() - this.startedAt,
        amplitude,
        waveform: [...this.waveform],
      });
    }
    this.rafId = window.setTimeout(this._tick, 80);
  };

  async stop(send) {
    if (!this.recorder) return null;

    const recorder = this.recorder;
    const mimeType = this.mimeType || 'audio/webm';
    const durationMs = Math.max(0, Date.now() - this.startedAt);
    const waveform = this.waveform
      .slice(-64)
      .map((level) => Number(level.toFixed(3)));

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: mimeType }));
      };
      try {
        if (recorder.state !== 'inactive') recorder.stop();
        else resolve(new Blob(this.chunks, { type: mimeType }));
      } catch {
        resolve(new Blob(this.chunks, { type: mimeType }));
      }
    });

    this._cleanup();

    if (!send || !blob.size || durationMs < 400) {
      return null;
    }

    const ext = extensionForMime(mimeType);
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
    return { file, waveform, voiceDurationMs: durationMs, mimeType };
  }

  async cancel() {
    await this.stop(false);
  }

  _cleanup() {
    if (this.rafId) {
      window.clearTimeout(this.rafId);
      this.rafId = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.onTick = null;
  }
}
