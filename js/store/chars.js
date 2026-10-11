// キャラクター画像。アプリに入っているオリジナルの絵を、家族が自分の iPhone の中だけで差し替えられる
// （差し替えた画像は IndexedDB に保存し、公開サイトには置かない）

import { txn, request, finished } from './db.js';
import { cutoutBackground, alphaBounds } from '../logic/image.js';

const STORE = 'chars';
const MAX_SIDE = 1200;

// slot: 場所 / file: アプリに入っている絵 / label・where: 設定画面の表示
export const CHAR_SLOTS = [
  { slot: 'main', file: 'img/chars/queen_main.webp', label: '主役（雪の女王さま）', where: 'タイトル・フィナーレ' },
  { slot: 'cheer', file: 'img/chars/queen_cheer.webp', label: 'お祝いの主役', where: 'ロウソクが全部消えたとき' },
  { slot: 'friend1', file: 'img/chars/bunny.webp', label: 'なかま1（ゆきうさぎ）', where: 'タイトル・思い出・フィナーレ' },
  { slot: 'friend2', file: 'img/chars/reindeer.webp', label: 'なかま2（こトナカイ）', where: 'お祝い・思い出・フィナーレ' },
];

export async function listCustomChars() {
  const all = await request((await txn(STORE)).objectStore(STORE).getAll());
  return Object.fromEntries(all.map((r) => [r.slot, r]));
}

export function charBlob(rec) {
  return new Blob([rec.data], { type: rec.type || 'image/png' });
}

// 戻り値は背景をどうしたか（cutoutBackground の戻り値）
export async function setCustomChar(slot, file) {
  const r = await prepareCharImage(file);
  const data = await r.blob.arrayBuffer();
  const tx = await txn(STORE, 'readwrite');
  tx.objectStore(STORE).put({ slot, data, type: 'image/png', w: r.w, h: r.h, updatedAt: Date.now() });
  await finished(tx);
  return r.mode;
}

export async function deleteCustomChar(slot) {
  const tx = await txn(STORE, 'readwrite');
  tx.objectStore(STORE).delete(slot);
  return finished(tx);
}

export async function clearCustomChars() {
  const tx = await txn(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  return finished(tx);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode-failed'));
    img.src = url;
  });
}

// 透明な背景の PNG はそのまま、まわりが一色の背景（白など）は縁から消す。写真はそのまま。まわりの余白を詰めて PNG にする
export async function prepareCharImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    const pixels = g.getImageData(0, 0, w, h);
    const mode = cutoutBackground(pixels);
    if (mode === 'removed') g.putImageData(pixels, 0, 0);
    const box = alphaBounds(pixels);
    const pad = Math.round(Math.max(box.w, box.h) * 0.02);
    const x0 = Math.max(0, box.x - pad);
    const y0 = Math.max(0, box.y - pad);
    const cw = Math.min(w - x0, box.w + pad * 2);
    const ch = Math.min(h - y0, box.h + pad * 2);
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    const blob = await new Promise((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/png'),
    );
    c.width = c.height = out.width = out.height = 0; // iOS のキャンバス用メモリをすぐ返す
    return { blob, w: cw, h: ch, mode };
  } finally {
    URL.revokeObjectURL(url);
  }
}
