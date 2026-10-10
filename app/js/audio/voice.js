// 雪だるまのせりふを再生する（VOICEVOX で作った音声ファイル。tools/make-voices.py で生成）
// iPhone の音声合成は使わない（端末によっては準備で Safari ごと固まることがあったため）

import { getCtx, decodeAudio, playVoiceBuffer, duck } from './engine.js';

let meta = null;
let metaPromise = null;
const buffers = new Map();
let enabled = true;
let current = null;

function loadMeta() {
  if (!metaPromise) {
    metaPromise = fetch('voice/voice.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((m) => {
        meta = m;
        return m;
      });
  }
  return metaPromise;
}

export function initVoice() {
  return loadMeta();
}

export const voiceCredit = () => meta?.credit || '';

export function setVoiceEnabled(on) {
  enabled = !!on;
  if (!enabled) cancelSpeech();
}

// 名前・年齢が音声を作ったときと同じならその言い方、違えば名前なしの言い方を選ぶ
export function resolveLine(id, settings) {
  const line = meta?.lines?.[id];
  if (!line) return null;
  const needs = line.needs || [];
  const ok = (!needs.includes('name') || settings.name === meta.name) && (!needs.includes('age') || settings.age === meta.age);
  return ok ? id : line.fallback || null;
}

function bufferFor(id) {
  if (buffers.has(id)) return buffers.get(id);
  const p = (async () => {
    const line = meta?.lines?.[id];
    if (!line || !getCtx()) return null;
    const res = await fetch(`voice/${line.file}`);
    if (!res.ok) return null;
    return decodeAudio(await res.arrayBuffer());
  })().catch(() => null);
  buffers.set(id, p);
  p.then((b) => {
    if (!b) buffers.delete(id); // 失敗したら次の機会に読み直す
  });
  return p;
}

// 音が使えるようになったら先に全部読み込んでおく（話しはじめが遅れないように）
export async function preloadVoices() {
  await loadMeta();
  if (!meta || !getCtx()) return;
  await Promise.all(Object.keys(meta.lines).map(bufferFor));
}

// せりふを再生し、話し終わったら true で解決する（再生できなければすぐ false）
export async function speakLine(id, settings) {
  if (!enabled) return false;
  await loadMeta();
  const key = resolveLine(id, settings);
  if (!key) return false;
  const buf = await bufferFor(key);
  if (!buf || !enabled) return false;
  cancelSpeech();
  return new Promise((resolve) => {
    const src = playVoiceBuffer(buf);
    if (!src) {
      resolve(false);
      return;
    }
    duck(true);
    const finish = (ok) => {
      if (current?.src !== src) return;
      current = null;
      duck(false);
      resolve(ok);
    };
    current = { src, finish };
    src.onended = () => finish(true);
    setTimeout(() => finish(true), buf.duration * 1000 + 600); // onended が来ないときの保険
  });
}

export function cancelSpeech() {
  if (!current) return;
  const { src, finish } = current;
  try {
    src.stop();
  } catch {
    /* 停止済み */
  }
  finish(false);
}
