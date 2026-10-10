import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasTransparency, borderColor, removeBackground, alphaBounds } from '../app/js/logic/image.js';

// 白い背景の中央に赤い四角（キャラクターの代わり）
function makeImage(w, h, { bg = [255, 255, 255, 255], box = [10, 10, 20, 30], fg = [220, 40, 60, 255] } = {}) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = x >= box[0] && x < box[0] + box[2] && y >= box[1] && y < box[1] + box[3];
      data.set(inside ? fg : bg, (y * w + x) * 4);
    }
  }
  return { data, width: w, height: h };
}

test('透明の判定: 不透明な画像は false、透明な余白がある画像は true', () => {
  assert.equal(hasTransparency(makeImage(40, 50)), false);
  assert.equal(hasTransparency(makeImage(40, 50, { bg: [0, 0, 0, 0] })), true);
});

test('背景色の推定: 縁の色の中央値', () => {
  assert.deepEqual(borderColor(makeImage(40, 50, { bg: [250, 248, 246, 255] })), [250, 248, 246]);
});

test('背景の除去: 縁とつながった白だけを消し、キャラクターは残す', () => {
  const img = makeImage(40, 50);
  const ratio = removeBackground(img);
  assert.ok(ratio > 0.6, `removed ${ratio}`);
  const at = (x, y) => img.data[(y * 40 + x) * 4 + 3];
  assert.equal(at(0, 0), 0); // 背景
  assert.equal(at(20, 25), 255); // キャラクター
  const b = alphaBounds(img);
  assert.deepEqual(b, { x: 10, y: 10, w: 20, h: 30 });
});

test('背景の除去: キャラクターの中の白（縁とつながっていない）は消さない', () => {
  const img = makeImage(40, 50);
  // 赤い四角の中に白い点（目のハイライトなど）
  img.data.set([255, 255, 255, 255], (20 * 40 + 20) * 4);
  removeBackground(img);
  assert.equal(img.data[(20 * 40 + 20) * 4 + 3], 255);
});

test('不透明部分の四角: 何もなければ全体', () => {
  assert.deepEqual(alphaBounds(makeImage(8, 6, { bg: [0, 0, 0, 0], box: [0, 0, 0, 0] })), { x: 0, y: 0, w: 8, h: 6 });
});
