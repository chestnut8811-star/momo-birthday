import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeSettings, DEFAULT_SETTINGS, honSuffix, messageOf, defaultMessage, letterParagraphs, LINES, VOICE_KIND, LETTER_KIND, DIFFICULTY_KIND,
} from '../app/js/logic/config.js';
import {
  rmsDb, bandFeatures, blowScore, updateNoiseFloor, createCandles, stepCandles, GATE,
} from '../app/js/logic/blow-score.js';
import { candleSlots, heartPoints, fanPoints, fitPhoto, seeded } from '../app/js/logic/layout.js';

// ---- 設定 ----
test('設定: 空なら初期値（ももちゃん・4さい）', () => {
  const s = sanitizeSettings(null);
  assert.equal(s.name, 'ももちゃん');
  assert.equal(s.age, 4);
  assert.deepEqual(s, { ...DEFAULT_SETTINGS });
});

test('設定: 年齢は 1〜10 に丸め、名前は空白を除いて上限で切る', () => {
  assert.equal(sanitizeSettings({ age: 0 }).age, 1);
  assert.equal(sanitizeSettings({ age: 99 }).age, 10);
  assert.equal(sanitizeSettings({ age: '5' }).age, 5);
  assert.equal(sanitizeSettings({ age: 'abc' }).age, 4);
  assert.equal(sanitizeSettings({ name: '  ' }).name, 'ももちゃん');
  assert.equal(sanitizeSettings({ name: ' はなちゃん ' }).name, 'はなちゃん');
  assert.equal(sanitizeSettings({ name: 'あ'.repeat(30) }).name.length, 10);
});

test('設定: 不正な難易度や型は無視する', () => {
  const s = sanitizeSettings({ difficulty: 'extreme', sound: 'yes', voice: false, voiceKind: VOICE_KIND });
  assert.equal(s.difficulty, 'normal');
  assert.equal(s.sound, true);
  assert.equal(s.voice, false);
});

test('設定: 声は既定でオン。読み上げ時代に保存された「オフ」は引き継がない', () => {
  assert.equal(sanitizeSettings(null).voice, true);
  assert.equal(sanitizeSettings({ voice: false }).voice, true);
  assert.equal(sanitizeSettings({ voice: false, voiceKind: VOICE_KIND }).voice, false);
});

test('メッセージ: 空なら名前と年齢入りの手紙', () => {
  const s = sanitizeSettings({ name: 'ももちゃん', age: 4 });
  assert.equal(messageOf(s), defaultMessage('ももちゃん', 4));
  assert.match(messageOf(s), /^ももちゃんへ\n\n4さいの おたんじょうび、おめでとう！/);
  assert.match(defaultMessage('はなちゃん', 5), /はなちゃんの 5さいの一年が/);
  assert.equal(messageOf({ ...s, message: '  だいすき  ' }), 'だいすき');
});

test('手紙の段落: 空行で分け、❄ のある段落だけが雪の魔法の段落', () => {
  const ps = letterParagraphs(defaultMessage('ももちゃん', 4));
  assert.equal(ps.length, 11);
  assert.deepEqual(ps.filter((p) => p.magic).map((p) => p.text), ['❄️ キラキラ キラキラ…… ❄️']);
  assert.deepEqual(letterParagraphs('あ\n\n\n い\nう\n \n'), [
    { text: 'あ', magic: false },
    { text: ' い\nう', magic: false },
  ]);
});

test('消えやすさ: 初期値は「ふつう」。前の版で保存された初期値「やさしい」だけ置きかえる', () => {
  assert.equal(DEFAULT_SETTINGS.difficulty, 'normal');
  assert.equal(sanitizeSettings({ difficulty: 'easy' }).difficulty, 'normal');
  assert.equal(sanitizeSettings({ difficulty: 'easy', difficultyKind: DIFFICULTY_KIND }).difficulty, 'easy');
  assert.equal(sanitizeSettings({ difficulty: 'hard' }).difficulty, 'hard');
  assert.equal(sanitizeSettings(sanitizeSettings({ difficulty: 'easy', difficultyKind: DIFFICULTY_KIND })).difficulty, 'easy');
});

test('差出人: 初期値は手紙の差出人。前の版で保存された初期値「みんなより」だけ置きかえる', () => {
  assert.equal(DEFAULT_SETTINGS.from, 'エルサより ❄️');
  assert.equal(sanitizeSettings({ from: 'みんなより' }).from, 'エルサより ❄️');
  assert.equal(sanitizeSettings({ from: 'みんなより', letterKind: LETTER_KIND }).from, 'みんなより');
  assert.equal(sanitizeSettings({ from: 'ママより' }).from, 'ママより');
  assert.equal(sanitizeSettings({ from: '', letterKind: LETTER_KIND }).from, '');
  assert.equal(sanitizeSettings(sanitizeSettings({ from: 'みんなより', letterKind: LETTER_KIND })).from, 'みんなより');
});

test('ロウソクの数え方', () => {
  const want = ['ぽん', 'ほん', 'ぼん', 'ほん', 'ほん', 'ぽん', 'ほん', 'ぽん', 'ほん', 'ぽん'];
  for (let n = 1; n <= 10; n++) assert.equal(honSuffix(n), want[n - 1], `n=${n}`);
  assert.equal(LINES.remain(3), 'あと 3ぼん！ がんばれ！');
});

// ---- 息の判定 ----
const SR = 48000;
const FFT = 1024;
const BINS = FFT / 2;
const toDb = (p) => p.map((v) => 10 * Math.log10(v));

function brownSpectrum() {
  // 風切り音に近い 1/f^2 の雑音
  return toDb(Array.from({ length: BINS }, (_, i) => 1 / Math.pow(Math.max(i, 1) * (SR / FFT), 2)));
}
function voiceSpectrum(f0 = 300) {
  // 声: 基音と倍音だけが立つ
  const p = new Array(BINS).fill(1e-9);
  for (let k = 1; k * f0 < 8000; k++) p[Math.round((k * f0) / (SR / FFT))] = 1 / k;
  return toDb(p);
}

test('RMS: 無音はとても小さく、振幅1の正弦波は約 -3dB', () => {
  assert.ok(rmsDb(new Float32Array(1024)) <= -99);
  const sine = Float32Array.from({ length: 4800 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / SR));
  assert.ok(Math.abs(rmsDb(sine) + 3.01) < 0.1);
});

test('特徴量: 息っぽい雑音は低域比が高く、声は低く平坦度も小さい', () => {
  const blow = bandFeatures(brownSpectrum(), SR, FFT);
  const voice = bandFeatures(voiceSpectrum(), SR, FFT);
  assert.ok(blow.lowRatio > 0.8, `blow lowRatio ${blow.lowRatio}`);
  assert.ok(voice.lowRatio < 0.4, `voice lowRatio ${voice.lowRatio}`);
  assert.ok(blow.flatness > voice.flatness * 5, `flatness ${blow.flatness} vs ${voice.flatness}`);
});

test('特徴量: 無音（-Infinity）でも NaN にならない', () => {
  const f = bandFeatures(new Array(BINS).fill(-Infinity), SR, FFT);
  assert.equal(f.lowRatio, 0);
  assert.equal(f.flatness, 0);
});

test('スコア: 大きな息は高く、同じ音量の声は低く、静かなら 0', () => {
  const blowF = { levelDb: -20, ...bandFeatures(brownSpectrum(), SR, FFT) };
  const voiceF = { levelDb: -20, ...bandFeatures(voiceSpectrum(), SR, FFT) };
  const quiet = { levelDb: -60, ...bandFeatures(brownSpectrum(), SR, FFT) };
  const b = blowScore(blowF, -60, 'easy');
  const v = blowScore(voiceF, -60, 'easy');
  assert.ok(b > 0.9, `blow ${b}`);
  assert.ok(v < b * 0.6, `voice ${v}`);
  assert.equal(blowScore(quiet, -60, 'easy'), 0);
});

test('スコア: 「むずかしい」ほど同じ息でもスコアが低い', () => {
  const f = { levelDb: -30, ...bandFeatures(brownSpectrum(), SR, FFT) };
  const e = blowScore(f, -60, 'easy');
  const n = blowScore(f, -60, 'normal');
  const h = blowScore(f, -60, 'hard');
  assert.ok(e > n && n > h, `${e} ${n} ${h}`);
});

test('スコア: うるさい部屋ではノイズフロアに合わせて反応点が上がる', () => {
  const f = { levelDb: -40, ...bandFeatures(brownSpectrum(), SR, FFT) };
  assert.ok(blowScore(f, -70, 'easy') > blowScore(f, -45, 'easy'));
});

test('ノイズフロア: 下がるのは速く、上がるのは遅い', () => {
  let floor = updateNoiseFloor(NaN, -60, 0.016);
  assert.equal(floor, -60);
  for (let i = 0; i < 60; i++) floor = updateNoiseFloor(floor, -20, 1 / 60); // 1秒吹き続けても
  assert.ok(floor < -55, `rises slowly: ${floor}`);
  for (let i = 0; i < 60; i++) floor = updateNoiseFloor(floor, -80, 1 / 60);
  assert.ok(floor < -75, `drops fast: ${floor}`);
});

test('ロウソク: やさしいモードで全力1秒吹けば全部消える', () => {
  const candles = createCandles(4, 'easy', seeded(7));
  const out = [];
  for (let t = 0; t < 1; t += 1 / 60) out.push(...stepCandles(candles, 1, 1 / 60));
  assert.equal(out.length, 4);
  assert.ok(candles.every((c) => !c.lit));
});

test('ロウソク: 弱い息（ゲート以下）では消えず、休むと回復する', () => {
  const candles = createCandles(4, 'easy', seeded(3));
  for (let t = 0; t < 3; t += 1 / 60) stepCandles(candles, GATE * 0.9, 1 / 60);
  assert.ok(candles.every((c) => c.lit && c.health === 1));
  for (let t = 0; t < 0.15; t += 1 / 60) stepCandles(candles, 0.6, 1 / 60);
  const h = candles[0].health;
  assert.ok(h < 1);
  for (let t = 0; t < 1; t += 1 / 60) stepCandles(candles, 0, 1 / 60);
  assert.ok(candles[0].health > h);
});

test('ロウソク: 中くらいの息でも数秒で消える（子どもでも消せる）', () => {
  const candles = createCandles(4, 'easy', seeded(11));
  let t = 0;
  while (candles.some((c) => c.lit) && t < 10) {
    stepCandles(candles, 0.5, 1 / 60);
    t += 1 / 60;
  }
  assert.ok(t < 3, `took ${t.toFixed(2)}s`);
});

// ---- 配置 ----
test('ロウソク配置: 本数ぶん返り、天面の楕円内で奥→手前の順', () => {
  const top = { cx: 180, cy: 152, rx: 84, ry: 14 };
  for (const n of [1, 4, 6, 7, 10]) {
    const s = candleSlots(n, top);
    assert.equal(s.length, n);
    for (const p of s) {
      const v = ((p.x - top.cx) / top.rx) ** 2 + ((p.y - top.cy) / top.ry) ** 2;
      assert.ok(v < 1, `n=${n} outside: ${JSON.stringify(p)}`);
    }
    for (let i = 1; i < s.length; i++) assert.ok(s[i].y >= s[i - 1].y);
  }
});

test('ハート配置: n 点、範囲内、左右対称', () => {
  const pts = heartPoints(12);
  assert.equal(pts.length, 12);
  for (const p of pts) assert.ok(Math.abs(p.x) <= 1.01 && Math.abs(p.y) <= 1.01);
  const sumX = pts.reduce((a, p) => a + p.x, 0);
  assert.ok(Math.abs(sumX) < 0.05, `sumX ${sumX}`);
});

test('扇形の配置: 左右対称で、下半分に並び、外側ほど傾く', () => {
  for (const n of [1, 2, 3, 5]) {
    const pts = fanPoints(n);
    assert.equal(pts.length, n);
    assert.ok(Math.abs(pts.reduce((a, p) => a + p.x, 0)) < 1e-9);
    for (const p of pts) assert.ok(p.y > 0.5 && p.y < 1 && Math.abs(p.x) <= 1);
  }
  const five = fanPoints(5);
  assert.ok(five[0].r < 0 && five[4].r > 0 && five[2].r === 0);
});

test('写真の枠: 縦横比を保って枠内に収まる', () => {
  const a = fitPhoto(3000, 4000, 300, 300);
  assert.deepEqual(a, { w: 225, h: 300 });
  const b = fitPhoto(4000, 3000, 300, 500);
  assert.deepEqual(b, { w: 300, h: 225 });
});
