// 思い出の写真は端末の IndexedDB にだけ保存する（どこにも送信しない）
// iOS の古い版で Blob を直接しまうと読めなくなる不具合があったため、ArrayBuffer で保存する

import { txn, request, finished } from './db.js';

const STORE = 'photos';
const MAX_SIDE = 1600;
const QUALITY = 0.85;

export async function listPhotos() {
  const all = await request((await txn(STORE)).objectStore(STORE).getAll());
  return all.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export async function countPhotos() {
  try {
    return await request((await txn(STORE)).objectStore(STORE).count());
  } catch {
    return 0;
  }
}

async function putAll(records) {
  const tx = await txn(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const r of records) store.put(r);
  return finished(tx);
}

export async function updateCaption(id, caption) {
  const tx = await txn(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const rec = await request(store.get(id));
  if (rec) store.put({ ...rec, caption });
  return finished(tx);
}

export async function deletePhoto(id) {
  const tx = await txn(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  return finished(tx);
}

export async function clearPhotos() {
  const tx = await txn(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  return finished(tx);
}

// 並べ替え: ids の順に order を振り直す
export async function saveOrder(ids) {
  const all = await listPhotos();
  const byId = new Map(all.map((p) => [p.id, p]));
  const updated = ids.map((id, i) => ({ ...byId.get(id), order: i })).filter((p) => p.id);
  return putAll(updated);
}

export function photoBlob(rec) {
  return new Blob([rec.data], { type: rec.type || 'image/jpeg' });
}

export function thumbBlob(rec) {
  return rec.thumb ? new Blob([rec.thumb], { type: 'image/jpeg' }) : photoBlob(rec);
}

const newId = () =>
  (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const toJpeg = (canvas, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/jpeg', quality),
  );

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode-failed'));
    img.src = url;
  });
}

// 長辺 1600px の JPEG に縮小する。<img> 経由で描くと写真の向き（EXIF）も反映される
export async function resizeImage(blob, maxSide = MAX_SIDE, quality = QUALITY) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error('decode-failed');
    const k = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k));
    const h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    const out = await toJpeg(c, quality);
    // 正方形のサムネイル（フィナーレと設定の一覧用）
    const T = 240;
    const side = Math.min(w, h);
    c.width = T;
    c.height = T;
    const tg = c.getContext('2d');
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(img, ((w - side) / 2) / k, ((h - side) / 2) / k, side / k, side / k, 0, 0, T, T);
    const thumb = await toJpeg(c, 0.8);
    c.width = 0; // iOS のキャンバス用メモリをすぐ返す
    c.height = 0;
    return { blob: out, thumb, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function addPhotoBlobs(items, onProgress) {
  const existing = await listPhotos().catch(() => []);
  let order = existing.length ? Math.max(...existing.map((p) => p.order)) + 1 : 0;
  let added = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i++) {
    const { blob, caption = '' } = items[i];
    try {
      const r = await resizeImage(blob);
      const data = await r.blob.arrayBuffer();
      const thumb = await r.thumb.arrayBuffer();
      await putAll([{ id: newId(), data, thumb, type: 'image/jpeg', w: r.w, h: r.h, caption, order: order++, createdAt: Date.now() }]);
      added++;
    } catch (e) {
      failed++;
      console.warn('写真を取り込めませんでした', e);
    }
    onProgress?.(i + 1, items.length);
  }
  requestPersist();
  return { added, failed };
}

// 写真を勝手に消されないよう、永続化をお願いする（iOS ではホーム画面のアプリで許可されやすい）
export function requestPersist() {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    /* 未対応 */
  }
}
