// キャラクター画像の下ごしらえ（画素の配列だけを扱う。DOM に依存しない）
// img = { data: Uint8ClampedArray(RGBA), width, height }

// 透明な画素がある程度あれば「背景は透明」とみなす
export function hasTransparency(img, minRatio = 0.005) {
  const { data } = img;
  const n = data.length / 4;
  let count = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) count++;
  return count / n >= minRatio;
}

// 縁の画素の色の中央値（背景色の推定）
export function borderColor(img) {
  const { data, width: w, height: h } = img;
  const rs = [];
  const gs = [];
  const bs = [];
  const push = (x, y) => {
    const i = (y * w + x) * 4;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

// 縁の画素のうち、背景色（縁の中央値）に近いものの割合。1 に近いほど、まわりが一色の背景
export function borderUniformity(img, tol = 40) {
  const { data, width: w, height: h } = img;
  const [br, bg, bb] = borderColor(img);
  let near = 0;
  let n = 0;
  const check = (x, y) => {
    const i = (y * w + x) * 4;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    n++;
    if (dr * dr + dg * dg + db * db <= tol * tol) near++;
  };
  for (let x = 0; x < w; x++) {
    check(x, 0);
    check(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    check(0, y);
    check(w - 1, y);
  }
  return n ? near / n : 0;
}

// キャラクター画像の背景を、消してよいときだけ消す。戻り値は何をしたか
// - 'transparent': もともと透明な背景 → そのまま
// - 'photo': 縁の色がばらつく（写真など） → まだらに抜けるので消さない
// - 'empty': 消すとほとんど何も残らない（全面が同じ色など） → 元にもどす
// - 'removed': 背景を消した
export function cutoutBackground(img, { minUniform = 0.85, minKeep = 0.03 } = {}) {
  if (hasTransparency(img)) return 'transparent';
  if (borderUniformity(img) < minUniform) return 'photo';
  const before = img.data.slice();
  const removed = removeBackground(img);
  if (1 - removed < minKeep) {
    img.data.set(before);
    return 'empty';
  }
  return 'removed';
}

// 縁から、背景色に近い色でつながっている部分を透明にする（白い背景などを消す）。
// tol より近ければ完全に透明、feather までは半透明にして輪郭をなめらかにする。
// 戻り値は消した画素の割合
export function removeBackground(img, { tol = 40, feather = 70 } = {}) {
  const { data, width: w, height: h } = img;
  const [br, bg, bb] = borderColor(img);
  const dist = (p) => {
    const i = p * 4;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  const tryPush = (p) => {
    if (seen[p]) return;
    seen[p] = 1;
    if (dist(p) <= tol) stack.push(p);
    else seen[p] = 2; // 背景の外側の縁（あとで半透明にする候補）
  };
  for (let x = 0; x < w; x++) {
    tryPush(x);
    tryPush((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    tryPush(y * w);
    tryPush(y * w + w - 1);
  }
  let removed = 0;
  while (stack.length) {
    const p = stack.pop();
    data[p * 4 + 3] = 0;
    removed++;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) tryPush(p - 1);
    if (x < w - 1) tryPush(p + 1);
    if (y > 0) tryPush(p - w);
    if (y < h - 1) tryPush(p + w);
  }
  // 輪郭: 背景に接していて色が近い画素は半透明に
  for (let p = 0; p < w * h; p++) {
    if (seen[p] !== 2) continue;
    const d = dist(p);
    if (d < feather) {
      const a = Math.round(255 * ((d - tol) / (feather - tol)));
      data[p * 4 + 3] = Math.min(data[p * 4 + 3], Math.max(0, a));
    }
  }
  return removed / (w * h);
}

// 不透明な部分を囲む四角（なければ全体）
export function alphaBounds(img, threshold = 12) {
  const { data, width: w, height: h } = img;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
