// 息の検出とロウソクの消え方（DOM に依存しない計算部分）
//
// 息をマイクに吹きかけると、マイクの穴で乱流が起きて「大きく・低い・雑音っぽい」音になる。
// 話し声や歌は倍音が並ぶ（スペクトルがとがる）ので、音量に加えて
//   低域比（40〜400Hz が全体に占める割合）と スペクトル平坦度（雑音らしさ）
// で息らしさを見分ける。4歳児の弱い息でも反応するよう、判定は甘めにしてある。

export const DIFFICULTY_PARAMS = Object.freeze({
  // startDb: 反応し始める音量 / fullDb: 最大スコアになる音量（RMS, dBFS）/ toughness: 全力で吹いて消えるまでの秒数の目安
  easy: { startDb: -48, fullDb: -26, toughness: 0.45 },
  normal: { startDb: -42, fullDb: -18, toughness: 0.75 },
  hard: { startDb: -34, fullDb: -10, toughness: 1.15 },
});

// これ未満のスコアはロウソクを削らない（物音・遠くの話し声よけ）
export const GATE = 0.12;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// 時間波形（-1〜1）の RMS を dBFS で返す
export function rmsDb(timeData) {
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i];
  const rms = Math.sqrt(sum / Math.max(1, timeData.length));
  return Math.max(-100, 20 * Math.log10(rms + 1e-12));
}

// AnalyserNode.getFloatFrequencyData() の dB 配列から特徴量を出す
export function bandFeatures(freqDb, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  let low = 0;
  let mid = 0;
  let high = 0;
  let logSum = 0;
  let linSum = 0;
  let count = 0;
  for (let i = 1; i < freqDb.length; i++) {
    const f = i * binHz;
    if (f > 8000) break;
    const db = freqDb[i];
    if (!Number.isFinite(db)) continue; // 無音だと -Infinity
    const p = Math.pow(10, db / 10);
    if (f >= 40 && f < 400) low += p;
    else if (f >= 400 && f < 2000) mid += p;
    else if (f >= 2000) high += p;
    if (f >= 150 && f <= 6000) {
      logSum += Math.log(p + 1e-20);
      linSum += p;
      count++;
    }
  }
  const total = low + mid + high;
  const lowRatio = total > 0 ? low / total : 0;
  const flatness = count > 0 && linSum > 0 ? Math.exp(logSum / count) / (linSum / count) : 0;
  return { lowRatio, flatness };
}

// 環境音の底（ノイズフロア）を追いかける。下がるときは速く、上がるときはゆっくり
export function updateNoiseFloor(floorDb, levelDb, dt) {
  let next;
  if (!Number.isFinite(floorDb)) next = levelDb;
  else if (levelDb < floorDb) next = floorDb + (levelDb - floorDb) * Math.min(1, dt * 4);
  else next = floorDb + (levelDb - floorDb) * Math.min(1, dt * 0.08);
  return Math.min(-35, Math.max(-90, next));
}

// 息らしさのスコア 0〜1
export function blowScore({ levelDb, lowRatio, flatness }, floorDb, difficulty) {
  const p = DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS.normal;
  const floor = Number.isFinite(floorDb) ? floorDb : -90;
  const start = Math.max(p.startDb, floor + 10);
  const full = Math.max(p.fullDb, start + 8);
  const loud = clamp01((levelDb - start) / (full - start));
  const windy = smoothstep(0.35, 0.7, lowRatio);
  const noisy = smoothstep(0.04, 0.2, flatness);
  const shape = Math.max(windy, noisy);
  return loud * (0.45 + 0.55 * shape);
}

// ロウソクの状態。toughness に少しばらつきを持たせ、弱い息だと1本ずつ、強い息だと一気に消える
export function createCandles(n, difficulty, rand = Math.random) {
  const p = DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS.normal;
  return Array.from({ length: n }, () => ({
    lit: true,
    health: 1,
    toughness: p.toughness * (0.7 + rand() * 0.6),
  }));
}

// 1フレーム分の更新。今回消えたロウソクの番号を返す
export function stepCandles(candles, score, dt) {
  const out = [];
  const eff = score > GATE ? (score - GATE) / (1 - GATE) : 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (!c.lit) continue;
    if (eff > 0) c.health -= (Math.pow(eff, 1.25) * dt) / c.toughness;
    else c.health = Math.min(1, c.health + dt * 0.35);
    if (c.health <= 0) {
      c.health = 0;
      c.lit = false;
      out.push(i);
    }
  }
  return out;
}
