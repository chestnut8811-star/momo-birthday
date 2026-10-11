// キャラクターの表示（アプリの絵 or 家族が差し替えた絵）

import { CHAR_SLOTS, listCustomChars, charBlob } from './store/chars.js';

let urls = {}; // slot -> 画像の URL
let custom = {}; // slot -> 家族の画像かどうか

// 起動時と設定を閉じたときに呼ぶ。家族の画像があればそちらを使う
export async function loadCharacters() {
  const old = Object.entries(urls).filter(([slot]) => custom[slot]).map(([, u]) => u);
  const recs = await listCustomChars().catch(() => ({}));
  const nextUrls = {};
  const nextCustom = {};
  for (const { slot, file } of CHAR_SLOTS) {
    if (recs[slot]) {
      nextUrls[slot] = URL.createObjectURL(charBlob(recs[slot]));
      nextCustom[slot] = true;
    } else {
      nextUrls[slot] = file;
    }
  }
  urls = nextUrls;
  custom = nextCustom;
  // 古い画像の URL は、画面が新しい URL に切り替わったあとで解放する
  setTimeout(() => old.forEach((u) => URL.revokeObjectURL(u)), 5000);
}

export const charURL = (slot) => urls[slot] || null;
export const isCustomChar = (slot) => !!custom[slot];

// 白いふちとかげをつけたキャラクターの要素。位置は .char、ふわふわ揺れるのは .char-float、白いふちは img
export function charEl(slot, cls = '') {
  const url = urls[slot];
  if (!url) return null;
  const wrap = document.createElement('div');
  wrap.className = `char ${cls}`.trim();
  wrap.setAttribute('aria-hidden', 'true');
  const float = document.createElement('div');
  float.className = 'char-float';
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';
  img.src = url;
  // 読み込めなかったら（アプリの絵がまだない等）そっと消す
  img.addEventListener('error', () => wrap.remove(), { once: true });
  float.appendChild(img);
  wrap.appendChild(float);
  return wrap;
}
