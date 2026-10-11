// 背景に降る雪。息を吹くと（setWind）下から舞い上がる

function flakeSprite(size, variant) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  g.translate(r, r);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineWidth = size * 0.07;
  g.shadowColor = 'rgba(200,230,255,.9)';
  g.shadowBlur = size * 0.12;
  const L = r * 0.8;
  for (let k = 0; k < 6; k++) {
    g.save();
    g.rotate((k * Math.PI) / 3);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -L);
    const branches = variant === 0 ? [0.35, 0.62] : variant === 1 ? [0.5] : [0.28, 0.5, 0.72];
    for (const b of branches) {
      const len = L * (variant === 1 ? 0.32 : 0.22);
      g.moveTo(0, -L * b);
      g.lineTo(-len, -L * b - len);
      g.moveTo(0, -L * b);
      g.lineTo(len, -L * b - len);
    }
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, size * 0.07, 0, Math.PI * 2);
  g.fillStyle = '#fff';
  g.fill();
  return c;
}

function dotSprite(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

export function createSnow(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  const flakes = [];
  const sprites = [flakeSprite(64, 0), flakeSprite(64, 1), flakeSprite(64, 2)];
  const dot = dotSprite(32);
  let W = 0;
  let H = 0;
  let wind = 0;
  let gust = 0;
  let last = performance.now();
  let raf = 0;
  let paused = false;

  function spawn(anywhere) {
    const depth = Math.random();
    const crystal = Math.random() < 0.24;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -20 - Math.random() * 40,
      depth,
      crystal,
      size: crystal ? 9 + depth * 12 : 3 + depth * 6,
      sprite: crystal ? sprites[(Math.random() * sprites.length) | 0] : dot,
      vy: 16 + depth * 38 + Math.random() * 10,
      sway: 8 + Math.random() * 24,
      freq: 0.2 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.9,
      alpha: 0.5 + depth * 0.45,
      dir: Math.random() < 0.5 ? -1 : 1,
      bx: 0,
      by: 0,
      temp: false,
    };
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(reduced ? 36 : 110, (W * H) / (reduced ? 16000 : 7600)));
    const base = flakes.filter((f) => !f.temp);
    while (base.length < target) {
      const f = spawn(true);
      base.push(f);
      flakes.push(f);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    gust += (wind - gust) * Math.min(1, dt * 4);
    ctx.clearRect(0, 0, W, H);
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.phase += f.freq * dt * Math.PI * 2;
      f.bx *= 1 - Math.min(1, dt * 1.6);
      f.by *= 1 - Math.min(1, dt * 1.6);
      const lift = gust * (90 + f.depth * 260);
      f.x += (Math.sin(f.phase) * f.sway + f.bx + gust * f.dir * (50 + f.depth * 140)) * dt;
      f.y += (f.vy - lift + f.by) * dt;
      f.rot += f.vr * dt * (1 + gust * 6);
      if (f.y > H + 30 || f.x < -60 || f.x > W + 60) {
        if (f.temp) { flakes.splice(i, 1); continue; }
        Object.assign(f, spawn(false));
      } else if (f.y < -50) {
        if (f.temp) { flakes.splice(i, 1); continue; }
        f.y = H + 20;
        f.x = Math.random() * W;
      }
      ctx.globalAlpha = f.alpha;
      const s = f.size;
      if (f.crystal) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.drawImage(f.sprite, -s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        ctx.drawImage(f.sprite, f.x - s, f.y - s, s * 2, s * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function start() {
    if (raf || paused) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  start();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  return {
    setWind(v) { wind = Math.max(0, Math.min(1, v)); },
    // 点 (x, y) から雪を放射状に飛ばす
    burst(x, y, n = 24, power = 260) {
      for (let i = 0; i < n; i++) {
        const f = spawn(false);
        const a = Math.random() * Math.PI * 2;
        const v = power * (0.4 + Math.random() * 0.6);
        Object.assign(f, { x, y, bx: Math.cos(a) * v, by: Math.sin(a) * v - 60, temp: true, alpha: 0.95 });
        flakes.push(f);
      }
    },
    pause() { paused = true; stop(); },
    resume() { paused = false; start(); },
  };
}
