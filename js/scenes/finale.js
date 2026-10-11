// フィナーレ: 写真がハートの形に集まり、雪の魔法で浮かび上がる手紙

import { tiaraSVG, snowflakeSVG } from '../art/svg.js';
import { ICON } from '../art/icons.js';
import { $, wait, puffy, button } from '../ui.js';
import { heartPoints, fanPoints } from '../logic/layout.js';
import { messageOf, letterParagraphs } from '../logic/config.js';
import { listPhotos, thumbBlob } from '../store/photos.js';
import { sfx, playSong, stopSong } from '../audio/engine.js';
import { speakLine, cancelSpeech } from '../audio/voice.js';
import { charEl } from '../chars.js';

const MAX_MINIS = 18;
// 手紙のカードのかげ（app.css の .letter と同じ）。雪の魔法で光らせるときに重ねる
const SHADOW = '0 7px 0 rgba(201, 182, 255, .7), 0 18px 36px rgba(16, 8, 70, .42)';

export function createFinale(app) {
  const root = $('#scene-finale');
  const heart = $('#heart-stage');
  const center = $('.heart-center', heart);
  const ageWord = $('#finale-age');
  const letterBody = $('#letter-body');
  const letterFrom = $('#letter-from');
  const actions = $('#finale-actions');
  const letter = $('#letter');
  const centerSlot = $('.tiara-slot', center);

  let token = 0;
  const urls = [];
  let io = null; // 手紙の段落が画面に入ったかを見る
  let queue = [];
  let pumpTimer = 0;

  // 手紙をさわると、指のところから雪の結晶がこぼれる
  letter.addEventListener('pointerdown', (e) => app.magic.snowflakes(e.clientX, e.clientY, 6, 0.8), { passive: true });

  // 文字の ❄ を、くるくる回る雪の結晶の絵にする（文字は textContent で入れる）
  function fillText(el, text, cls = '') {
    const add = (t) => {
      if (!t) return;
      if (!cls) {
        el.append(t);
        return;
      }
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = t;
      el.append(sp);
    };
    let i = 0;
    for (const m of text.matchAll(/❄\uFE0F?/g)) {
      add(text.slice(i, m.index));
      const f = document.createElement('span');
      f.className = 'lflake';
      f.innerHTML = snowflakeSVG(1);
      el.append(f);
      i = m.index + m[0].length;
    }
    add(text.slice(i));
  }

  // 段落ごとに分けて入れる。❄ のある段落は文字がきらきら光る「雪の魔法の段落」
  function renderLetter(msg, from) {
    letterBody.textContent = '';
    for (const { text, magic } of letterParagraphs(msg)) {
      const p = document.createElement('span');
      p.className = magic ? 'lp magic' : 'lp';
      fillText(p, text, magic ? 'kira' : '');
      letterBody.appendChild(p);
    }
    letterFrom.textContent = '';
    letterFrom.classList.remove('shown');
    fillText(letterFrom, from);
    letterFrom.hidden = !from;
  }

  function stopReveal() {
    io?.disconnect();
    io = null;
    queue = [];
    clearTimeout(pumpTimer);
    pumpTimer = 0;
  }

  // 画面に入った段落から順に浮かび上がらせる（下の段落は、スクロールして見えたときに）
  function startReveal(my) {
    const items = [...letterBody.children];
    if (!letterFrom.hidden) items.push(letterFrom);
    if (app.reduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('shown'));
      return;
    }
    io = new IntersectionObserver(
      (entries) => {
        if (my !== token || !io) return;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          queue.push(en.target);
        }
        queue.sort((a, b) => items.indexOf(a) - items.indexOf(b));
        pump(my);
      },
      { threshold: 0.5 },
    );
    items.forEach((el) => io.observe(el));
  }

  function pump(my) {
    if (pumpTimer || !queue.length || my !== token) return;
    const el = queue.shift();
    reveal(el, my);
    const gap = el.classList.contains('magic') ? 1200 : queue.length > 2 ? 260 : 480;
    pumpTimer = setTimeout(() => {
      pumpTimer = 0;
      pump(my);
    }, gap);
  }

  function reveal(el, my) {
    el.classList.add('shown');
    const r = el.getBoundingClientRect();
    const y = r.top + r.height / 2;
    if (el.classList.contains('magic')) {
      // 雪のまほう: 結晶がはじけて、手紙が氷の色に光る
      const x = r.left + r.width / 2;
      app.magic.snowflakes(x, y, 26, 1.5);
      app.magic.sparkle(x, y, 10, 1.4);
      app.snow.burst(x, y, 40, 360);
      sfx('whoosh');
      sfx('sparkle', 9, 0.08);
      const none = '0 0 0 0 rgba(168, 222, 255, 0)';
      letter.animate?.(
        [
          { boxShadow: `${SHADOW}, ${none}` },
          { boxShadow: `${SHADOW}, 0 0 40px 10px rgba(168, 222, 255, .95)`, offset: 0.3 },
          { boxShadow: `${SHADOW}, ${none}` },
        ],
        { duration: 1800, easing: 'ease-out' },
      );
      return;
    }
    // ふつうの段落: 魔法の杖で左から右へなぞったように、結晶が少しこぼれる
    for (let k = 0; k < 3; k++) {
      setTimeout(() => {
        if (my === token) app.magic.snowflakes(r.left + r.width * (0.25 + k * 0.25), y, 1, 0.45);
      }, k * 110);
    }
    sfx('sparkle', 2, 0.035);
  }

  function cleanup() {
    heart.querySelectorAll('.mini').forEach((m) => m.remove());
    while (urls.length) URL.revokeObjectURL(urls.pop());
  }

  async function enter() {
    const my = ++token;
    cleanup();
    stopReveal();
    app.keepAwake(true);
    const s = app.settings;
    puffy(ageWord, `${s.age}さい`, 'ice');
    // 真ん中は雪の女王さま（絵がなければティアラ）。カードの上の角からなかまがのぞく
    centerSlot.textContent = '';
    const queen = charEl('main', 'char-finale-main');
    if (queen) centerSlot.appendChild(queen);
    else centerSlot.innerHTML = tiaraSVG();
    letter.querySelectorAll('.char').forEach((el) => el.remove());
    for (const el of [charEl('friend1', 'char-letter left'), charEl('friend2', 'char-letter right')]) if (el) letter.appendChild(el);
    const msg = messageOf(s);
    renderLetter(msg, s.from);
    letter.classList.toggle('long', [...msg].length > 90);
    letter.style.animation = 'none';
    void letter.offsetWidth;
    letter.style.animation = '';
    actions.textContent = '';
    root.scrollTop = 0;

    const photos = (await listPhotos().catch(() => [])).slice(0, MAX_MINIS);
    if (my !== token) return;
    playSong('birthday', {
      bpm: 88,
      gain: 0.9,
      onEnd: () => {
        if (my === token) playSong('twinkle', { loop: true, gain: 0.7 });
      },
    });

    const box = heart.getBoundingClientRect();
    const n = photos.length;
    // 写真がハートに集まりおわるころから、手紙の文字を浮かび上がらせる
    setTimeout(() => {
      if (my === token) startReveal(my);
    }, Math.min(2000, 900 + n * 70));
    const isHeart = n >= 6;
    heart.classList.toggle('fan', !isHeart && n > 0);
    heart.classList.toggle('no-photos', n === 0);
    const pts = isHeart ? heartPoints(n).map((p) => ({ ...p, r: Math.random() * 16 - 8 })) : fanPoints(n);
    const size = Math.round(isHeart ? Math.max(46, Math.min(box.width * 0.21, (box.width * 3.1) / n)) : box.width * 0.3);
    const rx = box.width / 2 - size * 0.55;
    const ry = box.height / 2 - size * 0.6;
    photos.forEach((rec, i) => {
      const url = URL.createObjectURL(thumbBlob(rec));
      urls.push(url);
      const m = document.createElement('div');
      m.className = 'mini';
      m.style.setProperty('--s', `${size}px`);
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.src = url;
      m.appendChild(img);
      const x = pts[i].x * rx;
      const y = pts[i].y * ry;
      const r = pts[i].r.toFixed(1);
      const end = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r}deg)`;
      m.style.transform = end;
      heart.insertBefore(m, center);
      m.animate?.(
        [
          { transform: 'translate(-50%, -50%) scale(.2) rotate(0deg)', opacity: 0 },
          { transform: end, opacity: 1 },
        ],
        { duration: 900, delay: 350 + i * 110, easing: 'cubic-bezier(.2, 1.3, .4, 1)', fill: 'backwards' },
      );
      setTimeout(() => {
        if (my === token) sfx('ding');
      }, 350 + i * 110 + 500);
    });

    sfx('sparkle', 8);
    setTimeout(() => {
      if (my === token) speakLine('finale', app.settings);
    }, 1300);
    setTimeout(() => {
      if (my !== token) return;
      app.magic.rain(50, 2);
      const c = heart.getBoundingClientRect();
      app.snow.burst(c.left + c.width / 2, c.top + c.height / 2, 30, 360);
    }, 600 + n * 110);
    await wait(1200 + n * 110);
    if (my !== token) return;
    actions.appendChild(button({ label: 'もういちど', icon: ICON.cake, cls: 'small', onClick: () => app.go('cake'), aria: 'もういちど ケーキへ' }));
    actions.appendChild(button({ label: 'はじめから', icon: ICON.home, cls: 'ice small', onClick: () => app.go('title') }));
  }

  function exit() {
    token++;
    stopReveal();
    cancelSpeech();
    stopSong(0.5);
    cleanup();
  }

  return { enter, exit };
}
