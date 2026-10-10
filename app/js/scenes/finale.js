// フィナーレ: 写真がハートの形に集まり、家族からのメッセージカード

import { tiaraSVG } from '../art/svg.js';
import { ICON } from '../art/icons.js';
import { $, wait, puffy, button } from '../ui.js';
import { heartPoints, fanPoints } from '../logic/layout.js';
import { messageOf } from '../logic/config.js';
import { listPhotos, thumbBlob } from '../store/photos.js';
import { sfx, playSong, stopSong } from '../audio/engine.js';

const MAX_MINIS = 18;

export function createFinale(app) {
  const heart = $('#heart-stage');
  const center = $('.heart-center', heart);
  const ageWord = $('#finale-age');
  const letterBody = $('#letter-body');
  const letterFrom = $('#letter-from');
  const actions = $('#finale-actions');
  const letter = $('#letter');
  $('.tiara-slot', center).innerHTML = tiaraSVG();

  let token = 0;
  const urls = [];

  function cleanup() {
    heart.querySelectorAll('.mini').forEach((m) => m.remove());
    while (urls.length) URL.revokeObjectURL(urls.pop());
  }

  async function enter() {
    const my = ++token;
    cleanup();
    app.keepAwake(true);
    const s = app.settings;
    puffy(ageWord, `${s.age}さい`, 'ice');
    letterBody.textContent = messageOf(s);
    letterFrom.textContent = s.from;
    letterFrom.hidden = !s.from;
    letter.style.animation = 'none';
    void letter.offsetWidth;
    letter.style.animation = '';
    actions.textContent = '';

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
      if (my !== token) return;
      app.magic.rain(50, 2);
      const c = heart.getBoundingClientRect();
      app.snow.burst(c.left + c.width / 2, c.top + c.height / 2, 30, 360);
    }, 600 + n * 110);
    await wait(1200 + n * 110);
    if (my !== token) return;
    actions.appendChild(button({ label: 'もういちど ケーキ', icon: ICON.cake, cls: 'small', onClick: () => app.go('cake') }));
    actions.appendChild(button({ label: 'はじめから', icon: ICON.home, cls: 'ice small', onClick: () => app.go('title') }));
  }

  function exit() {
    token++;
    stopSong(0.5);
    cleanup();
  }

  return { enter, exit };
}
