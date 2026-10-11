// 写真をおおう「霜（しも）」。指でこすると溶けて写真が見える

export function paintFrost(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  // うっすら写真が透ける、すりガラスの氷
  const base = g.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, 'rgba(242,250,255,.93)');
  base.addColorStop(0.5, 'rgba(224,239,255,.88)');
  base.addColorStop(1, 'rgba(234,226,255,.93)');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  // 縁ほど白く濃く
  const vig = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(255,255,255,0)');
  vig.addColorStop(1, 'rgba(255,255,255,.55)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);

  // 細かい氷の粒
  const n = Math.min(5000, Math.round((w * h) / 110));
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.55).toFixed(2)})`;
    const s = 0.6 + Math.random() * 1.8;
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }

  // 縁から内側へ伸びる霜の結晶（60度ずつ枝分かれ）
  g.lineCap = 'round';
  const fern = (x, y, a, len, depth) => {
    if (depth <= 0 || len < 3) return;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    g.strokeStyle = `rgba(255,255,255,${0.35 + depth * 0.12})`;
    g.lineWidth = Math.max(0.6, depth * 0.55);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x2, y2);
    g.stroke();
    for (let k = 1; k <= 2; k++) {
      const t = k / 3;
      const bx = x + (x2 - x) * t;
      const by = y + (y2 - y) * t;
      fern(bx, by, a - Math.PI / 3, len * 0.42, depth - 1);
      fern(bx, by, a + Math.PI / 3, len * 0.42, depth - 1);
    }
    fern(x2, y2, a + (Math.random() - 0.5) * 0.5, len * 0.62, depth - 1);
  };
  const count = 6 + Math.round((w + h) / 140);
  for (let i = 0; i < count; i++) {
    const side = i % 4;
    const t = Math.random();
    const len = Math.min(w, h) * (0.12 + Math.random() * 0.12);
    if (side === 0) fern(t * w, 0, Math.PI / 2 + (Math.random() - 0.5) * 0.8, len, 4);
    else if (side === 1) fern(w, t * h, Math.PI + (Math.random() - 0.5) * 0.8, len, 4);
    else if (side === 2) fern(t * w, h, -Math.PI / 2 + (Math.random() - 0.5) * 0.8, len, 4);
    else fern(0, t * h, (Math.random() - 0.5) * 0.8, len, 4);
  }

  // 大きな雪の結晶をうっすらと
  const flake = (cx, cy, r, alpha) => {
    g.strokeStyle = `rgba(255,255,255,${alpha})`;
    g.lineWidth = Math.max(1.4, r * 0.06);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      const ex = cx + Math.cos(a) * r;
      const ey = cy + Math.sin(a) * r;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(ex, ey);
      for (const b of [0.45, 0.72]) {
        const bx = cx + Math.cos(a) * r * b;
        const by = cy + Math.sin(a) * r * b;
        const l = r * 0.22;
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(a - 0.9) * l, by + Math.sin(a - 0.9) * l);
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(a + 0.9) * l, by + Math.sin(a + 0.9) * l);
      }
      g.stroke();
    }
  };
  flake(w * 0.5, h * 0.48, Math.min(w, h) * 0.2, 0.7);
  flake(w * 0.2, h * 0.22, Math.min(w, h) * 0.08, 0.55);
  flake(w * 0.82, h * 0.78, Math.min(w, h) * 0.1, 0.55);
  flake(w * 0.78, h * 0.18, Math.min(w, h) * 0.06, 0.5);
}

// 指でこすったところを消す。消えた割合をマス目で数える
export function createEraser(canvas, w, h, { onProgress } = {}) {
  const g = canvas.getContext('2d');
  const cols = 18;
  const rows = Math.max(6, Math.round((cols * h) / w));
  const cells = new Uint8Array(cols * rows);
  let cleared = 0;
  const brush = Math.max(24, Math.min(w, h) * 0.12);

  function dab(x, y, r = brush) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(0,0,0,1)');
    rg.addColorStop(0.55, 'rgba(0,0,0,.9)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    const rr = r * 0.75;
    const c0 = Math.max(0, Math.floor(((x - rr) / w) * cols));
    const c1 = Math.min(cols - 1, Math.floor(((x + rr) / w) * cols));
    const r0 = Math.max(0, Math.floor(((y - rr) / h) * rows));
    const r1 = Math.min(rows - 1, Math.floor(((y + rr) / h) * rows));
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const px = ((cx + 0.5) / cols) * w;
        const py = ((cy + 0.5) / rows) * h;
        if ((px - x) ** 2 + (py - y) ** 2 <= rr * rr && !cells[cy * cols + cx]) {
          cells[cy * cols + cx] = 1;
          cleared++;
        }
      }
    }
  }

  return {
    stroke(x0, y0, x1, y1) {
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (brush * 0.35)));
      for (let s = 0; s <= steps; s++) dab(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
      g.restore();
      onProgress?.(cleared / cells.length);
    },
    // 真ん中からうずを巻くように溶かす（自動で溶けるとき）
    meltSpiral(duration = 1000) {
      return new Promise((resolve) => {
        const start = performance.now();
        const R = Math.hypot(w, h) / 2;
        let lastT = 0;
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          g.save();
          g.globalCompositeOperation = 'destination-out';
          for (let u = lastT; u <= t; u += 0.012) {
            const a = u * Math.PI * 7;
            const rad = u * R;
            dab(w / 2 + Math.cos(a) * rad, h / 2 + Math.sin(a) * rad * (h / w), brush * (1 + u * 1.6));
          }
          g.restore();
          lastT = t;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    get ratio() {
      return cleared / cells.length;
    },
  };
}
