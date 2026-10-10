// いちばん手前のキャンバス: タッチのキラキラと紙吹雪

const SPARK_COLORS = ['#FFFFFF', '#FFFFFF', '#BFE6FF', '#E3D6FF', '#FFD0DC', '#FFF0B8'];
const CONFETTI_COLORS = ['#FF9EB1', '#FFC2D2', '#8FD3FF', '#BFE6FF', '#C3ADFF', '#E3D6FF', '#8FE3C8', '#FFD27A', '#FFFFFF'];

const pick = (a) => a[(Math.random() * a.length) | 0];
const rnd = (a, b) => a + Math.random() * (b - a);

function starPath(g, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
}
function heartPath(g, r) {
  g.beginPath();
  g.moveTo(0, r * 0.9);
  g.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
  g.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9);
  g.closePath();
}
function sparklePath(g, r) {
  g.beginPath();
  g.moveTo(0, -r);
  g.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
  g.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  g.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
  g.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  g.closePath();
}

export function createMagic(canvas) {
  const ctx = canvas.getContext('2d');
  const parts = [];
  let W = 0;
  let H = 0;
  let raf = 0;
  let last = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.kind === 'spark') {
        p.vx *= 1 - Math.min(1, dt * 3);
        p.vy = p.vy * (1 - Math.min(1, dt * 3)) + 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const t = p.age / p.life;
        if (t >= 1) { parts.splice(i, 1); continue; }
        const s = Math.max(0.01, p.size * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.shape === 'dot') {
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
        } else {
          sparklePath(ctx, s);
        }
        ctx.fill();
        ctx.restore();
      } else {
        // 紙吹雪: 重力＋空気抵抗＋ひらひら
        p.vy += 520 * dt;
        p.vx *= 1 - Math.min(1, dt * 2.2);
        p.vy *= 1 - Math.min(1, dt * 2.0);
        p.phase += p.flip * dt;
        p.x += (p.vx + Math.sin(p.phase * 0.7) * 26) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > H + 40 || p.age > 9) { parts.splice(i, 1); continue; }
        const fade = p.age > 7 ? 1 - (p.age - 7) / 2 : 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.max(0.12, Math.abs(Math.cos(p.phase))));
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        const s = p.size;
        if (p.shape === 'rect') ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.fill(); }
        else if (p.shape === 'heart') { heartPath(ctx, s); ctx.fill(); }
        else if (p.shape === 'star') { starPath(ctx, s * 1.1); ctx.fill(); }
        else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = s * 0.32;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let k = 0; k < 3; k++) {
            const a = (k * Math.PI) / 3;
            ctx.moveTo(Math.cos(a) * s * 1.2, Math.sin(a) * s * 1.2);
            ctx.lineTo(-Math.cos(a) * s * 1.2, -Math.sin(a) * s * 1.2);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  function confettiPiece(x, y, vx, vy) {
    const r = Math.random();
    const shape = r < 0.52 ? 'rect' : r < 0.66 ? 'circle' : r < 0.8 ? 'heart' : r < 0.92 ? 'star' : 'flake';
    return {
      kind: 'confetti', shape, x, y, vx, vy,
      size: shape === 'rect' ? rnd(4, 6.5) : rnd(4.5, 7.5),
      color: pick(CONFETTI_COLORS),
      rot: rnd(0, Math.PI * 2), vr: rnd(-6, 6),
      phase: rnd(0, Math.PI * 2), flip: rnd(4, 10), age: 0,
    };
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    sparkle(x, y, n = 8, spread = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = rnd(40, 170) * spread;
        parts.push({
          kind: 'spark', shape: Math.random() < 0.3 ? 'dot' : 'star',
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
          size: rnd(4, 9) * (spread > 1 ? 1.2 : 1), color: pick(SPARK_COLORS),
          rot: rnd(0, 1), vr: rnd(-3, 3), age: 0, life: rnd(0.55, 1.1),
        });
      }
      kick();
    },
    // 大砲のように打ち上げる（angle は度、-90 が真上）
    confetti(x, y, { angle = -90, spread = 40, count = 80, power = 1100 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = ((angle + rnd(-spread / 2, spread / 2)) * Math.PI) / 180;
        const v = power * rnd(0.5, 1);
        parts.push(confettiPiece(x, y, Math.cos(a) * v, Math.sin(a) * v));
      }
      kick();
    },
    // 上から降らせる
    rain(count = 60, duration = 1.5) {
      for (let i = 0; i < count; i++) {
        const p = confettiPiece(rnd(0, W), rnd(-H * 0.15, -10) - (i / count) * duration * 120, rnd(-40, 40), rnd(20, 120));
        parts.push(p);
      }
      kick();
    },
    clear() { parts.length = 0; },
  };
}
