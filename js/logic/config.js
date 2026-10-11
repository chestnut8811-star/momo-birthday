// 設定の初期値・検証と、画面に出す文言（DOM に依存しない）

export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const NAME_MAX = 10;
export const FROM_MAX = 20;
export const MESSAGE_MAX = 400;
export const CAPTION_MAX = 30;
export const AGE_MIN = 1;
export const AGE_MAX = 10;

// 声の方式。読み上げ（音声合成）時代に保存された voice の値は引き継がない
export const VOICE_KIND = 'voicevox';

// 手紙の版。これより前に保存された差出人「みんなより」（当時の初期値）は、今の初期値に置きかえる
export const LETTER_KIND = 'snow-letter';
const LEGACY_FROM = 'みんなより';

// ロウソクの消えやすさの初期値の版。これより前に保存された「やさしい」（当時の初期値）は、今の初期値「ふつう」に置きかえる
export const DIFFICULTY_KIND = 'normal-default';
const LEGACY_DIFFICULTY = 'easy';

export const DEFAULT_SETTINGS = Object.freeze({
  name: 'ももちゃん',
  age: 4,
  message: '', // 空なら名前と年齢から自動で作る（雪の女王からの手紙）
  from: 'エルサより ❄️',
  difficulty: 'normal',
  sound: true,
  voice: true,
  voiceKind: VOICE_KIND,
  letterKind: LETTER_KIND,
  difficultyKind: DIFFICULTY_KIND,
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
  if (typeof raw.from === 'string') {
    const from = raw.from.trim().slice(0, FROM_MAX);
    if (raw.letterKind === LETTER_KIND || from !== LEGACY_FROM) s.from = from;
  }
  if (DIFFICULTIES.includes(raw.difficulty) && (raw.difficultyKind === DIFFICULTY_KIND || raw.difficulty !== LEGACY_DIFFICULTY)) {
    s.difficulty = raw.difficulty;
  }
  if (typeof raw.sound === 'boolean') s.sound = raw.sound;
  if (typeof raw.voice === 'boolean' && raw.voiceKind === VOICE_KIND) s.voice = raw.voice;
  return s;
}

// 初期の手紙。名前と年齢は設定から入る。空行で段落を分け、❄ のある段落で雪の魔法がはじける
export function defaultMessage(name, age) {
  return [
    `${name}へ`,
    '',
    `${age}さいの おたんじょうび、おめでとう！`,
    '',
    `きょうは、${name}の`,
    'とっても とっても たいせつな日だね。',
    '',
    'アレンデールのおしろでも、',
    `みんなで ${name}のことを`,
    'おいわいしているよ。',
    '',
    `${name}が`,
    'いっぱいわらって、',
    'いっぱいあそんで、',
    'まいにち たのしくすごせますように。',
    '',
    'そして、やさしいきもちを',
    'ずっと たいせつにしてね。',
    '',
    'きょうは とくべつに、',
    `${name}のために`,
    '雪のまほうをプレゼント！',
    '',
    '❄️ キラキラ キラキラ…… ❄️',
    '',
    `${name}の ${age}さいの一年が、`,
    'すてきなことと、',
    'たのしいことで',
    'いっぱいになりますように。',
    '',
    `${name}、`,
    'おたんじょうび',
    'ほんとうに おめでとう！',
    '',
    'だいすきだよ。',
  ].join('\n');
}

export function messageOf(settings) {
  const m = (settings.message || '').trim();
  return m || defaultMessage(settings.name, settings.age);
}

// 手紙を段落に分ける（1行以上の空行で区切る）。❄ のある段落は「雪の魔法の段落」
export function letterParagraphs(msg) {
  return String(msg)
    .split(/\n(?:[ \t\u3000]*\n)+/)
    .map((p) => p.replace(/^\n+|\n+$/g, ''))
    .filter((p) => p.trim())
    .map((text) => ({ text, magic: text.includes('❄') }));
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
