// 雪だるまのせりふを読み上げる（Web Speech API・日本語）

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let enabled = false;
let voice = null;
let primed = false;

function pickVoice() {
  if (!synth) return null;
  const list = synth.getVoices().filter((v) => /^ja([-_]|$)/i.test(v.lang));
  if (!list.length) return null;
  const score = (v) =>
    (/(premium|enhanced|プレミアム|拡張)/i.test(v.name) ? 4 : 0) +
    (/(kyoko|o-?ren|sayaka|haruka|nanami)/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0);
  return list.sort((a, b) => score(b) - score(a))[0];
}

// 音声合成は、声を使うと決めたときに初めて触る（端末によっては準備で固まることがあるため）
let inited = false;
function init() {
  if (inited || !synth) return;
  inited = true;
  voice = pickVoice();
  synth.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
  });
}

export const voiceSupported = () => !!synth;

export function setVoiceEnabled(on) {
  enabled = !!on;
  if (!enabled) cancelSpeech();
}

// iOS ではユーザー操作の中で一度話させておく必要がある
export function primeVoice() {
  if (!synth || primed) return;
  init();
  primed = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'ja-JP';
    synth.speak(u);
  } catch {
    /* 未対応 */
  }
}

// 話し終わったら（または一定時間で）解決する
export function speak(text, { pitch = 1.3, rate = 0.95 } = {}) {
  return new Promise((resolve) => {
    if (!enabled || !synth || !text) {
      resolve(false);
      return;
    }
    init();
    const say = () => {
      try {
        const u = new SpeechSynthesisUtterance(text.replace(/[\s　]+/g, ''));
        u.lang = 'ja-JP';
        if (voice) u.voice = voice;
        u.pitch = pitch;
        u.rate = rate;
        u.volume = 1;
        let finished = false;
        const finish = (ok) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve(ok);
        };
        const timer = setTimeout(() => finish(true), 1800 + text.length * 230);
        u.onend = () => finish(true);
        u.onerror = () => finish(false);
        synth.speak(u);
      } catch {
        resolve(false);
      }
    };
    if (synth.speaking || synth.pending) {
      synth.cancel();
      setTimeout(say, 90);
    } else {
      say();
    }
  });
}

export function cancelSpeech() {
  if (!primed && !enabled) return; // 一度も使っていなければ音声合成に触れない
  try {
    synth?.cancel();
  } catch {
    /* 未対応 */
  }
}
