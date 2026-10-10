// オルゴールの音色と効果音を Web Audio API で合成する（音源ファイルなし）
// 曲はパブリックドメインのみ（Happy Birthday to You / きらきら星）

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let voiceBus = null;
let reverbIn = null;
let noiseBuf = null;
let muted = false;
let song = null;

const MASTER_GAIN = 0.9;
const MUSIC_GAIN = 0.6;

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pick = (a) => a[(Math.random() * a.length) | 0];

// iOS 16.4+ の Audio Session API。playback にするとマナーモードでも音が出る
export function setSessionType(type) {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type;
  } catch {
    /* 未対応の端末では何もしない */
  }
}

// iOS ではユーザーの操作の中で呼ぶ必要がある
export function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      ctx = new AC();
    }
    build();
  }
  setSessionType('playback');
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  try {
    const b = ctx.createBuffer(1, 1, ctx.sampleRate);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
  } catch {
    /* 無音の再生に失敗しても続行 */
  }
  return ctx;
}

export const getCtx = () => ctx;
export const audioRunning = () => !!ctx && ctx.state === 'running';
export function resumeAudio() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

function build() {
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_GAIN;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);

  musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_GAIN;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.85;
  sfxBus.connect(master);
  voiceBus = ctx.createGain();
  voiceBus.gain.value = 1.1;
  voiceBus.connect(master);

  // 小さなホールの響き
  const conv = ctx.createConvolver();
  conv.buffer = impulse(2.6, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.34;
  conv.connect(wet);
  wet.connect(master);
  reverbIn = ctx.createGain();
  reverbIn.connect(conv);
  const ms = ctx.createGain();
  ms.gain.value = 0.7;
  musicBus.connect(ms);
  ms.connect(reverbIn);
  const ss = ctx.createGain();
  ss.gain.value = 0.4;
  sfxBus.connect(ss);
  ss.connect(reverbIn);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function impulse(seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.04);
}

// 音声ファイル（せりふ）をデコードする。古い Safari のコールバック形式にも対応
export function decodeAudio(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(arrayBuffer, resolve, reject);
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
}

export function playVoiceBuffer(buffer) {
  if (!ctx || !voiceBus) return null;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(voiceBus);
  src.start();
  return src;
}

// せりふの間は曲を小さくする
export function duck(on) {
  if (musicBus) musicBus.gain.setTargetAtTime(on ? MUSIC_GAIN * 0.35 : MUSIC_GAIN, ctx.currentTime, 0.12);
}

// ---------- 音色 ----------
// オルゴールの櫛（くし）の音: 基音＋倍音＋金属的な非整数倍音を、指数的に減衰させる
const PARTS = [[1, 1, 1], [2, 0.3, 0.5], [3, 0.09, 0.3], [5.43, 0.12, 0.07]];
const LITE = [[1, 1, 1], [2, 0.22, 0.45]];

function bell(t, midi, vel, out, opt = {}) {
  const f = mtof(midi);
  const L = opt.len ?? Math.min(2.8, 0.8 + 380 / f);
  for (const [ratio, amp, k] of opt.lite ? LITE : PARTS) {
    const fr = f * ratio;
    if (fr > 15000) continue;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = fr;
    const g = ctx.createGain();
    const d = Math.max(0.06, L * k);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * amp), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + d + 0.03);
  }
}

function noise(t, dur, { type = 'bandpass', f0 = 1000, f1 = f0, q = 0.8, gain = 0.3, attack = 0.01, out = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt);
  flt.connect(g);
  g.connect(out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// ---------- 効果音 ----------
const HI = [84, 86, 88, 91, 93, 96, 98, 100]; // ペンタトニック（どの順でもきれいに聞こえる）
const TAP = [91, 93, 96, 98, 100, 103];
let lastTap = 0;

const SFX = {
  tap() {
    const now = ctx.currentTime;
    if (now - lastTap < 0.07) return;
    lastTap = now;
    bell(now, pick(TAP), 0.045, sfxBus, { len: 0.7, lite: true });
  },
  sparkle(n = 6, vel = 0.07) {
    const t = ctx.currentTime;
    for (let i = 0; i < n; i++) bell(t + i * 0.055, pick(HI), vel * (1 - i / (n * 1.6)), sfxBus, { len: 1.1 });
  },
  light() {
    const t = ctx.currentTime;
    noise(t, 0.14, { f0: 2600, f1: 700, gain: 0.07 });
    bell(t + 0.02, 88 + ((Math.random() * 3) | 0) * 2, 0.06, sfxBus, { len: 0.7 });
  },
  puff() {
    const t = ctx.currentTime;
    noise(t, 0.34, { f0: 950, f1: 240, q: 0.7, gain: 0.3, attack: 0.012 });
    noise(t, 0.2, { type: 'lowpass', f0: 420, f1: 110, gain: 0.22, attack: 0.006 });
  },
  whoosh() {
    noise(ctx.currentTime, 0.75, { f0: 320, f1: 2800, q: 1.1, gain: 0.14, attack: 0.28 });
  },
  popper() {
    const t = ctx.currentTime;
    noise(t, 0.36, { type: 'highpass', f0: 1200, f1: 2600, gain: 0.42, attack: 0.003 });
    noise(t, 0.14, { type: 'lowpass', f0: 650, f1: 110, gain: 0.45, attack: 0.002 });
    for (let i = 0; i < 14; i++) {
      noise(t + 0.08 + Math.random() * 0.75, 0.035, { type: 'highpass', f0: 3000 + Math.random() * 3000, gain: 0.06 + Math.random() * 0.1, attack: 0.002 });
    }
  },
  fanfare() {
    const t = ctx.currentTime + 0.05;
    [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => bell(t + i * 0.065, m, 0.15, sfxBus, { len: 1.6 }));
    [72, 76, 79, 84].forEach((m) => bell(t + 0.56, m, 0.1, sfxBus, { len: 2.6 }));
    [48, 55].forEach((m) => bell(t + 0.56, m + 12, 0.12, sfxBus, { len: 2.6, lite: true }));
  },
  drop() {
    const t = ctx.currentTime;
    noise(t, 0.6, { f0: 2400, f1: 500, q: 1, gain: 0.08, attack: 0.2 });
    bell(t + 0.5, 84, 0.07, sfxBus, { len: 1.2 });
    bell(t + 0.58, 91, 0.05, sfxBus, { len: 1.2 });
  },
  reveal() {
    const t = ctx.currentTime;
    [79, 84, 88, 91, 96].forEach((m, i) => bell(t + i * 0.08, m, 0.12, sfxBus, { len: 1.8 }));
    for (let i = 0; i < 6; i++) bell(t + 0.45 + i * 0.05, pick(HI) + 12, 0.035, sfxBus, { len: 0.8 });
  },
  ding() {
    bell(ctx.currentTime, 96, 0.04, sfxBus, { len: 0.5, lite: true });
  },
};

export function sfx(name, ...args) {
  if (!audioRunning() || muted) return;
  try {
    SFX[name]?.(...args);
  } catch {
    /* 効果音の失敗で止めない */
  }
}

// 指でこする音（こする速さで音量が変わる）
export function rubSound() {
  if (!audioRunning()) return { set() {}, stop() {} };
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = 3200;
  flt.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(flt);
  flt.connect(g);
  g.connect(sfxBus);
  src.start();
  return {
    set(level) {
      g.gain.setTargetAtTime(Math.min(0.09, level * 0.09), ctx.currentTime, 0.04);
    },
    stop() {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => {
        try { src.stop(); } catch { /* 停止済み */ }
        g.disconnect();
      }, 300);
    },
  };
}

// ---------- 曲 ----------
function happyBirthday() {
  const T = 12; // オルゴールらしく1オクターブ上で鳴らす
  const ev = [];
  const mel = [
    [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
    [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
    [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2], // 「ディア ○○」はのばす
    [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
  ];
  let t = 0;
  for (const [m, d] of mel) {
    ev.push({ t, m: m + T, v: 0.2 });
    t += d;
  }
  const C = [55, 60, 64];
  const C7 = [55, 58, 64];
  const G7 = [53, 59, 62];
  const F = [57, 60, 65];
  const bar = (t0, bass, chords) => {
    ev.push({ t: t0, m: bass + T, v: 0.12, lite: true });
    for (const [dt, ch] of chords) for (const m of ch) ev.push({ t: t0 + dt, m: m + T, v: 0.045, lite: true });
  };
  bar(1, 48, [[1, C], [2, C]]);
  bar(4, 43, [[1, G7], [2, G7]]);
  bar(7, 43, [[1, G7], [2, G7]]);
  bar(10, 48, [[1, C], [2, C]]);
  bar(13, 48, [[1, C], [2, C7]]);
  bar(16, 41, [[1, F], [2, F], [3, F]]);
  bar(20, 43, [[1, C], [2, G7]]);
  [48, 55, 60, 64, 67, 72].forEach((m, i) => ev.push({ t: 23 + i * 0.12, m: m + T, v: 0.07, lite: true, len: 3 }));
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, length: 26, bpm: 100, gap: 2 };
}

function twinkleStar() {
  const T = 12;
  const ev = [];
  const A1 = [72, 72, 79, 79, 81, 81, [79, 2]];
  const A2 = [77, 77, 76, 76, 74, 74, [72, 2]];
  const B = [79, 79, 77, 77, 76, 76, [74, 2]];
  let t = 0;
  for (const line of [A1, A2, B, B, A1, A2]) {
    for (const n of line) {
      const [m, d] = Array.isArray(n) ? n : [n, 1];
      ev.push({ t, m: m + T, v: 0.16 });
      t += d;
    }
  }
  const CH = { C: [48, 55, 64], F: [53, 60, 69], G: [43, 50, 59] };
  ['CC', 'FC', 'FC', 'GC', 'CF', 'CG', 'CF', 'CG', 'CC', 'FC', 'FC', 'GC'].forEach((pair, b) => {
    [...pair].forEach((name, h) => {
      const [r, f5, t3] = CH[name];
      const t0 = b * 4 + h * 2;
      [r, f5, t3, f5].forEach((m, k) => ev.push({ t: t0 + k * 0.5, m: m + T, v: k === 0 ? 0.07 : 0.045, lite: true }));
    });
  });
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, length: 48, bpm: 84, gap: 2 };
}

const SONGS = { birthday: happyBirthday(), twinkle: twinkleStar() };

// 先読みスケジューラ（0.6 秒先までの音だけを予約していく）
export function playSong(name, { loop = false, bpm, gain = 1, onEnd } = {}) {
  if (!ctx) return null;
  stopSong(0.15);
  const def = SONGS[name];
  const spb = 60 / (bpm || def.bpm);
  const out = ctx.createGain();
  out.gain.value = gain;
  out.connect(musicBus);
  let idx = 0;
  let base = ctx.currentTime + 0.12;
  let timer = 0;
  let done = false;
  const loopLen = def.length + (def.gap || 0);

  const handle = {
    duration: def.length * spb,
    startTime: base,
    stop(fade = 0.4) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade / 3));
      setTimeout(() => out.disconnect(), fade * 1000 + 600);
      if (song === handle) song = null;
    },
  };

  const tick = () => {
    if (done) return;
    const horizon = ctx.currentTime + 0.6;
    for (;;) {
      if (idx >= def.events.length) {
        if (!loop) break;
        idx = 0;
        base += loopLen * spb;
      }
      const e = def.events[idx];
      const t = base + e.t * spb;
      if (t > horizon) break;
      if (t >= ctx.currentTime - 0.05) bell(Math.max(t, ctx.currentTime), e.m, e.v, out, e);
      idx++;
    }
    if (!loop && idx >= def.events.length) {
      const wait = Math.max(0, (base + def.length * spb - ctx.currentTime) * 1000);
      timer = setTimeout(() => {
        if (done) return;
        done = true;
        if (song === handle) song = null;
        setTimeout(() => out.disconnect(), 4000);
        onEnd?.();
      }, wait);
      return;
    }
    timer = setTimeout(tick, 200);
  };
  tick();
  song = handle;
  return handle;
}

export function stopSong(fade = 0.4) {
  if (song) song.stop(fade);
  song = null;
}
