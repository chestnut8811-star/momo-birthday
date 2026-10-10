// 設定の初期値・検証と、画面に出す文言（DOM に依存しない）

export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const NAME_MAX = 10;
export const FROM_MAX = 20;
export const MESSAGE_MAX = 200;
export const CAPTION_MAX = 30;
export const AGE_MIN = 1;
export const AGE_MAX = 10;

// 声の方式。読み上げ（音声合成）時代に保存された voice の値は引き継がない
export const VOICE_KIND = 'voicevox';

export const DEFAULT_SETTINGS = Object.freeze({
  name: 'ももちゃん',
  age: 4,
  message: '', // 空なら名前と年齢から自動で作る
  from: 'みんなより',
  difficulty: 'easy',
  sound: true,
  voice: true,
  voiceKind: VOICE_KIND,
});

export function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.name === 'string') {
    const name = raw.name.trim().slice(0, NAME_MAX);
    if (name) s.name = name;
  }
  const age = Number.parseInt(raw.age, 10);
  if (Number.isFinite(age)) s.age = Math.min(AGE_MAX, Math.max(AGE_MIN, age));
  if (typeof raw.message === 'string') s.message = raw.message.slice(0, MESSAGE_MAX);
  if (typeof raw.from === 'string') s.from = raw.from.trim().slice(0, FROM_MAX);
  if (DIFFICULTIES.includes(raw.difficulty)) s.difficulty = raw.difficulty;
  if (typeof raw.sound === 'boolean') s.sound = raw.sound;
  if (typeof raw.voice === 'boolean' && raw.voiceKind === VOICE_KIND) s.voice = raw.voice;
  return s;
}

export function defaultMessage(name, age) {
  return `${name}、${age}さいの おたんじょうび おめでとう！\nこれからも たくさん わらって、たくさん あそぼうね。\nだいすきだよ。`;
}

export function messageOf(settings) {
  const m = (settings.message || '').trim();
  return m || defaultMessage(settings.name, settings.age);
}

// ロウソクの数え方: 1ぽん 2ほん 3ぼん 4ほん 5ほん 6ぽん 7ほん 8ぽん 9ほん 10ぽん
export function honSuffix(n) {
  const r = n % 10;
  if (r === 0 || r === 1 || r === 6 || r === 8) return 'ぽん';
  if (r === 3) return 'ぼん';
  return 'ほん';
}

// 案内役の雪だるまのせりふ（4歳向けにひらがな中心）
export const LINES = {
  hello: (s) => `${s.name}、${s.age}さいの おたんじょうび おめでとう！`,
  sing: () => 'まずは みんなで おうたを うたおう♪',
  singing: () => '♪ ハッピー バースデー ♪',
  blow: () => 'さあ、ろうそくを ふーって けしてね！',
  remain: (n) => `あと ${n}${honSuffix(n)}！ がんばれ！`,
  allOut: () => 'やったー！ ぜんぶ きえたよ！',
  tapHint: () => 'ひを タッチしても けせるよ！',
  again: () => 'もういっかい ふーって してね！',
  toMemories: (s) => `${s.name}の おもいでを みてみよう！`,
};
