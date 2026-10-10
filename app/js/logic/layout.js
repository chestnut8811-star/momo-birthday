// 配置の計算（DOM に依存しない）

// ケーキ上段の天面（楕円）にロウソクを並べる。奥→手前の順（描画順）で返す
export function candleSlots(n, { cx, cy, rx, ry }) {
  const slots = [];
  const row = (count, y, span, scale, shift = 0) => {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const x = cx + t * span + shift;
      const dx = (x - cx) / rx;
      // 外側ほどわずかに奥へ置いて、天面の丸みを出す
      slots.push({ x, y: y - ry * 0.5 * dx * dx, scale });
    }
  };
  if (n <= 6) {
    row(n, cy + ry * 0.25, Math.min(rx * 1.5, (n - 1) * 34), 1);
  } else {
    const back = Math.floor(n / 2);
    const front = n - back;
    row(back, cy - ry * 0.35, Math.min(rx * 1.2, (back - 1) * 30), 0.9, 10);
    row(front, cy + ry * 0.45, Math.min(rx * 1.55, (front - 1) * 30), 1);
  }
  return slots.sort((a, b) => a.y - b.y);
}

// ハートの輪郭に沿って n 点を（弧長でほぼ均等に）並べる。座標は -1〜1、上が負
export function heartPoints(n) {
  if (n <= 0) return [];
  const N = 720;
  const raw = [];
  for (let k = 0; k <= N; k++) {
    const t = (k / N) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({ x, y });
  }
  const cum = [0];
  for (let k = 1; k < raw.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(raw[k].x - raw[k - 1].x, raw[k].y - raw[k - 1].y));
  }
  const total = cum[cum.length - 1];
  const pts = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const target = ((i + 0.5) / n) * total;
    while (k < cum.length - 1 && cum[k + 1] < target) k++;
    const p = raw[k];
    // x: -16〜16、y: -12〜17 を -1〜1 に正規化
    pts.push({ x: p.x / 16, y: (p.y - 2.5) / 14.5 });
  }
  return pts;
}

// 写真が少ない（5枚以下）ときは、トランプのように扇形に広げて下側に並べる。r は傾き（度）
export function fanPoints(n) {
  const pts = [];
  const step = n > 1 ? Math.min(0.6, 1.6 / (n - 1)) : 0;
  for (let i = 0; i < n; i++) {
    const t = i - (n - 1) / 2;
    pts.push({ x: t * step, y: 0.62 + Math.abs(t) * 0.06, r: t * 8 });
  }
  return pts;
}

// 縦横比を保ったまま max の枠に収める
export function fitPhoto(w, h, maxW, maxH) {
  const a = w > 0 && h > 0 ? w / h : 1;
  let pw = maxW;
  let ph = pw / a;
  if (ph > maxH) {
    ph = maxH;
    pw = ph * a;
  }
  return { w: Math.round(pw), h: Math.round(ph) };
}

// 決まった並びの乱数（ケーキのしずくの形を毎回同じにする）
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
