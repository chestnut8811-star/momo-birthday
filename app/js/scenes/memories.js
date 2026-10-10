// 思い出: 写真カードが降ってきて、凍っている。こすると（または少し待つと）溶けて見える

import { snowflakeSVG, snowmanSVG } from '../art/svg.js';
import { ICON } from '../art/icons.js';
import { $, wait, puffy, button } from '../ui.js';
import { fitPhoto } from '../logic/layout.js';
import { listPhotos, photoBlob } from '../store/photos.js';
import { paintFrost, createEraser } from '../fx/frost.js';
import { sfx, playSong, stopSong, rubSound } from '../audio/engine.js';
import { speakLine, cancelSpeech } from '../audio/voice.js';
import { charEl } from '../chars.js';

const AUTO_MELT_MS = 4500; // 触らなければこの時間で自動的に溶ける
const AUTO_NEXT_MS = 6500; // 見えてからこの時間で次の写真へ
const REVEAL_RATIO = 0.5; // こすって消えた割合がこれを超えたら全部溶かす

export function createMemories(app) {
  const root = $('#scene-memories');
  const stageEl = $('#card-stage');
  const progress = $('#mem-progress');
  const title = $('#mem-title');
  const hint = $('#rub-hint');
  const nextBtn = $('#btn-next');
  const empty = $('#mem-empty');
  const titleChars = $('#mem-title-chars');

  nextBtn.innerHTML = ICON.next;
  $('.snowman-wrap', empty).innerHTML = snowmanSVG();

  let photos = [];
  let idx = -1;
  let card = null;
  let token = 0;
  let meltTimer = 0;
  let nextTimer = 0;
  const urls = [];
  // こする音は場面に1つだけ。何本の指でこすっても、全部離したら止める
  let rubSnd = null;
  let rubFingers = 0;
  const rubStart = () => {
    if (++rubFingers === 1) rubSnd = rubSound();
  };
  const rubEnd = () => {
    rubFingers = Math.max(0, rubFingers - 1);
    if (rubFingers === 0) stopRub();
  };
  function stopRub() {
    rubFingers = 0;
    rubSnd?.stop();
    rubSnd = null;
  }

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!card) return;
    if (!card.revealed) reveal(card, true);
    else next();
  });

  function clearTimers() {
    clearTimeout(meltTimer);
    clearTimeout(nextTimer);
  }

  function renderProgress() {
    progress.textContent = '';
    if (photos.length > 24) {
      const c = document.createElement('span');
      c.className = 'count';
      c.textContent = `${Math.max(1, idx + 1)} / ${photos.length}`;
      progress.appendChild(c);
      return;
    }
    photos.forEach((_, i) => {
      const d = document.createElement('i');
      if (i < idx) d.className = 'done';
      else if (i === idx) d.className = 'now';
      progress.appendChild(d);
    });
  }

  function makeCard(rec) {
    const url = URL.createObjectURL(photoBlob(rec));
    urls.push(url);
    const st = stageEl.getBoundingClientRect();
    const pad = 12;
    const capH = 60;
    const maxW = Math.min(st.width * 0.88, 520) - pad * 2;
    const maxH = Math.max(160, st.height * 0.86 - pad - capH);
    const { w, h } = fitPhoto(rec.w, rec.h, maxW, maxH);
    const rot = (Math.random() * 6 - 3).toFixed(1);

    const fly = document.createElement('div');
    fly.className = 'card-fly enter';
    fly.innerHTML = `<div class="polaroid" style="--rot:${rot}deg">
        <div class="tape"></div>
        <div class="photo" style="width:${w}px;height:${h}px"><img alt="" draggable="false"><canvas class="frost" aria-label="こおり"></canvas></div>
        <div class="caption"></div>
        <div class="sticker">${snowflakeSVG(1)}</div>
      </div>`;
    const pol = $('.polaroid', fly);
    const img = $('img', fly);
    const canvas = $('canvas', fly);
    const cap = $('.caption', fly);
    img.src = url;
    if (rec.caption) cap.textContent = rec.caption;
    else cap.innerHTML = '<span class="deco">♡ ❄ ♡</span>';
    paintFrost(canvas, w, h);
    stageEl.appendChild(fly);

    const c = { fly, pol, canvas, w, h, rot: Number(rot), revealed: false, landed: false };
    // 落ちてくる途中は位置が動くので、着地してからこすれるようにする
    fly.addEventListener('animationend', () => {
      c.landed = true;
    }, { once: true });
    setTimeout(() => {
      c.landed = true;
    }, 1200);
    c.eraser = createEraser(canvas, w, h, {
      onProgress: (r) => {
        if (r > REVEAL_RATIO) reveal(c);
      },
    });
    bindRub(c);
    pol.addEventListener('pointerdown', () => {
      if (c.revealed && card === c) scheduleNext(); // 見ているあいだは次へ進むのを待つ
    });
    return c;
  }

  // 回転したカードの上でも、指の位置をキャンバスの座標に直す
  function local(c, e) {
    const r = c.canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const a = (-c.rot * Math.PI) / 180;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    return { x: dx * Math.cos(a) - dy * Math.sin(a) + c.w / 2, y: dx * Math.sin(a) + dy * Math.cos(a) + c.h / 2 };
  }

  // 指ごと（pointerId ごと）に前回の位置を覚えてこする。落ちてくる途中に置いた指も、着地したらそのまま消せる
  function bindRub(c) {
    c.fingers = new Map();
    let sparkT = 0;
    c.canvas.addEventListener('pointerdown', (e) => {
      if (c.revealed || c.fingers.has(e.pointerId)) return;
      try { c.canvas.setPointerCapture(e.pointerId); } catch { /* 古い端末 */ }
      const p = local(c, e);
      c.fingers.set(e.pointerId, { ...p, t: performance.now() });
      if (c.landed) c.eraser.stroke(p.x, p.y, p.x, p.y);
      rubStart();
      touched();
    });
    c.canvas.addEventListener('pointermove', (e) => {
      const last = c.fingers.get(e.pointerId);
      if (!last || c.revealed) return;
      const p = local(c, e);
      const now = performance.now();
      if (c.landed) {
        const speed = (Math.hypot(p.x - last.x, p.y - last.y) / Math.max(1, now - last.t)) * 1000;
        c.eraser.stroke(last.x, last.y, p.x, p.y);
        rubSnd?.set(Math.min(1, speed / 900));
        if (now - sparkT > 70) {
          sparkT = now;
          app.magic.sparkle(e.clientX, e.clientY, 3);
        }
      }
      c.fingers.set(e.pointerId, { ...p, t: now });
      touched();
    });
    const end = (e) => {
      if (c.fingers.delete(e.pointerId)) rubEnd();
    };
    c.canvas.addEventListener('pointerup', end);
    c.canvas.addEventListener('pointercancel', end);
  }

  function touched() {
    clearTimeout(meltTimer);
    meltTimer = setTimeout(() => card && reveal(card, true), AUTO_MELT_MS);
  }

  async function reveal(c, spiral = false) {
    if (c.revealed) return;
    c.revealed = true;
    const my = token;
    clearTimeout(meltTimer);
    c.fingers?.clear();
    stopRub();
    hint.classList.add('gone');
    sfx('reveal');
    if (spiral) await c.eraser.meltSpiral(900);
    // 溶けているあいだに場面を出たり次の写真に進んだりしていたら、ここで終わる
    if (my !== token || card !== c) return;
    c.canvas.classList.add('melted');
    c.pol.classList.add('revealed');
    const r = c.pol.getBoundingClientRect();
    for (let k = 0; k < 10; k++) {
      const t = k / 10;
      const edge = [
        [r.left + r.width * t, r.top],
        [r.right, r.top + r.height * t],
        [r.right - r.width * t, r.bottom],
        [r.left, r.bottom - r.height * t],
      ][k % 4];
      setTimeout(() => app.magic.sparkle(edge[0], edge[1], 6, 1.2), k * 50);
    }
    app.snow.burst(r.left + r.width / 2, r.top + r.height / 2, 14, 300);
    nextBtn.classList.add('breathe');
    scheduleNext();
  }

  function scheduleNext() {
    clearTimeout(nextTimer);
    const my = token;
    nextTimer = setTimeout(() => {
      if (my === token) next();
    }, AUTO_NEXT_MS);
  }

  function show(i) {
    idx = i;
    renderProgress();
    card = makeCard(photos[i]);
    sfx('drop');
    hint.classList.remove('gone');
    nextBtn.classList.remove('breathe');
    touched();
  }

  function next() {
    clearTimers();
    stopRub();
    const old = card;
    card = null;
    if (old) {
      old.fly.classList.remove('enter');
      old.fly.classList.add('leave');
      sfx('whoosh');
      setTimeout(() => old.fly.remove(), 800);
    }
    if (idx + 1 >= photos.length) {
      app.go('finale');
      return;
    }
    show(idx + 1);
  }

  function showEmpty() {
    empty.hidden = false;
    progress.textContent = '';
    hint.hidden = true;
    nextBtn.hidden = true;
    const btns = $('.btns', empty);
    btns.textContent = '';
    btns.appendChild(button({
      label: 'サンプルで みる', icon: ICON.heart, cls: 'small', onClick: async () => {
        const my = token;
        btns.textContent = '';
        const note = document.createElement('p');
        note.className = 'say';
        note.textContent = 'サンプルを つくっているよ…';
        btns.appendChild(note);
        await app.addDemoPhotos();
        if (my === token) enter(); // 作っているあいだに場面を出ていたら始めない
      },
    }));
    btns.appendChild(button({ label: 'もどる', icon: ICON.home, cls: 'ice small', onClick: () => app.go('title') }));
  }

  async function enter() {
    const my = ++token;
    cleanup();
    app.keepAwake(true);
    photos = await listPhotos().catch(() => []);
    if (my !== token) return;
    if (!photos.length) {
      showEmpty();
      return;
    }
    empty.hidden = true;
    hint.hidden = false;
    hint.classList.add('gone');
    nextBtn.hidden = true;
    idx = -1;
    renderProgress();
    playSong('twinkle', { loop: true, gain: 0.85 });
    puffy(title, `${app.settings.name}の おもいで`);
    title.classList.remove('fade');
    title.hidden = false;
    titleChars.textContent = '';
    for (const el of [charEl('friend1'), charEl('friend2')]) if (el) titleChars.appendChild(el);
    titleChars.classList.add('show');
    sfx('sparkle', 8);
    speakLine('memTitle', app.settings);
    await wait(2300);
    if (my !== token) return;
    titleChars.classList.remove('show');
    title.classList.add('fade');
    await wait(550);
    if (my !== token) return;
    title.hidden = true;
    nextBtn.hidden = false;
    show(0);
    await wait(1200);
    if (my === token && card && !card.revealed) speakLine('rub', app.settings);
  }

  function cleanup() {
    clearTimers();
    stopRub();
    stageEl.textContent = '';
    card = null;
    while (urls.length) URL.revokeObjectURL(urls.pop());
  }

  function exit() {
    token++;
    cleanup();
    photos = [];
    idx = -1;
    cancelSpeech();
    stopSong(0.5);
    title.hidden = true;
    titleChars.classList.remove('show');
  }

  return { enter, exit };
}
