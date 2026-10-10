// マイクで息を聞き取る。計算は logic/blow-score.js（Node でテスト済み）

import { getCtx, setSessionType } from './engine.js';
import { rmsDb, bandFeatures, blowScore, updateNoiseFloor } from '../logic/blow-score.js';

export function micSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false;
}

export class BlowListener {
  constructor({ difficulty = 'easy', onFrame } = {}) {
    this.difficulty = difficulty;
    this.onFrame = onFrame;
    this.stream = null;
    this.running = false;
    this.floor = NaN;
    this.score = 0;
    this.raf = 0;
  }

  // 本物のマイク。許可されなければ例外（NotAllowedError など）
  async start() {
    const ctx = getCtx();
    if (!ctx) throw new Error('no-audio');
    if (!micSupported()) throw new Error('unsupported');
    setSessionType('play-and-record');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // ノイズ除去などを切らないと、息の「ザーッ」という音が消されてしまう
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
    } catch (e) {
      setSessionType('playback');
      throw e;
    }
    if (ctx.state !== 'running') {
      try { await ctx.resume(); } catch { /* 次のタッチで再開 */ }
    }
    this.stream = stream;
    this.attach(ctx.createMediaStreamSource(stream));
  }

  // 任意の音源をつなぐ（デバッグ用の合成ノイズなど）
  attach(src) {
    const ctx = getCtx();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.5;
    // 解析ノードを確実に動かすため、音量0で出力までつなぐ（スピーカーからは鳴らない）
    this.sink = ctx.createGain();
    this.sink.gain.value = 0;
    src.connect(this.analyser);
    this.analyser.connect(this.sink);
    this.sink.connect(ctx.destination);
    this.src = src;
    this.timeBuf = new Float32Array(this.analyser.fftSize);
    this.freqBuf = new Float32Array(this.analyser.frequencyBinCount);
    this.running = true;
    this.warm = 0;
    this.last = performance.now();
    this.loop();
  }

  loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
    this.last = now;
    this.analyser.getFloatTimeDomainData(this.timeBuf);
    this.analyser.getFloatFrequencyData(this.freqBuf);
    const levelDb = rmsDb(this.timeBuf);
    const { lowRatio, flatness } = bandFeatures(this.freqBuf, getCtx().sampleRate, this.analyser.fftSize);
    this.warm += dt;
    this.floor = updateNoiseFloor(this.floor, levelDb, dt);
    // 最初の 0.4 秒はまわりの音の大きさを測るだけ
    const raw = this.warm < 0.4 ? 0 : blowScore({ levelDb, lowRatio, flatness }, this.floor, this.difficulty);
    // 立ち上がりは速く、下がるときはなめらかに
    const k = raw > this.score ? Math.min(1, dt * 18) : Math.min(1, dt * 5);
    this.score += (raw - this.score) * k;
    this.onFrame?.({ score: this.score, raw, levelDb, lowRatio, flatness, floor: this.floor, dt });
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    try {
      this.src?.disconnect();
      this.analyser?.disconnect();
      this.sink?.disconnect();
    } catch {
      /* 切断済み */
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      // 録音モードのままだと iOS で音が小さくなるので戻す
      setSessionType('playback');
    }
  }
}

// デバッグ用: 息に似た音（低域が強い雑音）と、声に似た音を合成する
export function createFakeBreath() {
  const ctx = getCtx();
  const out = ctx.createGain();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // ブラウンノイズ
    d[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const breath = ctx.createGain();
  breath.gain.value = 0;
  src.connect(breath);
  breath.connect(out);
  src.start();
  return {
    node: out,
    blow(level = 0.6, seconds = 1.2) {
      const t = ctx.currentTime;
      breath.gain.cancelScheduledValues(t);
      breath.gain.setTargetAtTime(level, t, 0.05);
      breath.gain.setTargetAtTime(0, t + seconds, 0.08);
    },
    voice(level = 0.3, seconds = 1.2) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 300;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(lp);
      lp.connect(g);
      g.connect(out);
      o.start();
      o.stop(ctx.currentTime + seconds);
    },
  };
}
