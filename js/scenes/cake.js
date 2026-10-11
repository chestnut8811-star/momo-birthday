// ケーキ: ロウソクが灯る → 歌う → 息で吹き消す → お祝い

import { cakeSVG, snowmanSVG } from '../art/svg.js';
import { ICON } from '../art/icons.js';
import { $, wait, puffy, button, restartClass } from '../ui.js';
import { LINES } from '../logic/config.js';
import { createCandles, stepCandles } from '../logic/blow-score.js';
import { sfx, playSong, stopSong } from '../audio/engine.js';
import { speakLine, cancelSpeech } from '../audio/voice.js';
import { BlowListener, micSupported, createFakeBreath } from '../audio/mic.js';
import { charEl } from '../chars.js';

export function createCake(app) {
  const root = $('#scene-cake');
  const stage = $('#cake-stage');
  const bubble = $('#cake-bubble');
  const bubbleText = $('p', bubble);
  const actions = $('#cake-actions');
  const celebrate = $('#celebrate');
  const word = $('#celebrate-word');
  const sub = $('#celebrate-sub');
  const charParty = $('#char-party');
  const chip = $('#listen-chip');
  const chipLevel = $('.level i', chip);
  $('.mic-dot', chip).innerHTML = ICON.mic;

  const guide = $('.guide-snowman', root);
  guide.innerHTML = snowmanSVG({ pinwheel: true });
  const snowman = $('.snowman', guide);
  const pinRot = $('.pw-rot', guide);

  let state = 'idle'; // idle | lighting | ready | song | blow | done
  let token = 0; // 場面を出たり、やり直したりしたら増やして、途中の非同期処理を止める
  let candles = [];
  let candleEls = [];
  let leanEls = [];
  let warmEl = null;
  let dirs = [];
  let listener = null;
  let fake = null;
  let score = 0;
  let raf = 0;
  let lastFrame = 0;
  let pinAngle = 0;
  let noteTimer = 0;
  let lastRemainSaid = -1;
  let hintTimer = 0;

  // ---------- 表示 ----------
  function setSnowman(mode) {
    snowman.classList.toggle('cheer', mode === 'cheer');
    snowman.classList.toggle('talk', mode === 'talk');
  }

  // 吹き出しに出し、voice があればそのせりふの音声も流す（話し終わるまで待てる）
  function say(text, { voice = null } = {}) {
    bubbleText.textContent = text;
    restartClass(bubble, 'pop');
    if (!voice) return Promise.resolve();
    setSnowman('talk');
    return speakLine(voice, app.settings).finally(() => {
      if (state !== 'done' && state !== 'song') setSnowman('idle');
    });
  }

  function showActions(list) {
    actions.textContent = '';
    for (const a of list) actions.appendChild(button(a));
  }

  function buildCake() {
    stage.innerHTML = cakeSVG({ candles: app.settings.age, name: app.settings.name });
    candleEls = [...stage.querySelectorAll('.candle')].sort((a, b) => a.dataset.i - b.dataset.i);
    leanEls = candleEls.map((el) => $('.flame-lean', el));
    warmEl = $('.cake-warm', stage);
    dirs = candleEls.map((_, i) => (i % 2 ? 1 : -1) * (0.7 + Math.random() * 0.6));
  }

  function updateWarm() {
    const lit = candles.filter((c) => c.lit).length;
    if (warmEl) warmEl.style.opacity = candles.length ? String(lit / candles.length) : '0';
  }

  function flamePoint(i) {
    const r = $('.flame', candleEls[i]).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function lightCandle(i) {
    const c = candles[i];
    c.lit = true;
    c.done = false;
    c.health = 1;
    const el = candleEls[i];
    el.classList.remove('unlit', 'out', 'smoking');
    restartClass(el, 'ignite');
    sfx('light');
    const p = flamePoint(i);
    app.magic.sparkle(p.x, p.y - 10, 10);
    updateWarm();
  }

  // 体力計算（stepCandles）が先に lit=false にするので、演出済みかどうかは done で見る
  function extinguish(i) {
    const c = candles[i];
    if (!c || c.done) return;
    c.done = true;
    c.lit = false;
    c.health = 0;
    const el = candleEls[i];
    el.classList.remove('ignite');
    el.classList.add('out');
    restartClass(el, 'smoking');
    leanEls[i].style.transform = '';
    sfx('puff');
    updateWarm();
    const remaining = candles.filter((x) => !x.done).length;
    if (remaining === 0) {
      if (state !== 'done') allOut();
    }
    else if (remaining !== lastRemainSaid) {
      lastRemainSaid = remaining;
      say(LINES.remain(remaining));
    }
  }

  // 炎や光の円は重なっているので、要素ではなく「タップ位置にいちばん近い、点いている炎」で決める。
  // 縦方向は甘めにして、ロウソクの胴を触っても消えるようにする
  function onTapStage(e) {
    if (state !== 'blow') return;
    let best = -1;
    let bestD = Infinity;
    candles.forEach((c, i) => {
      if (c.done || !c.lit) return;
      const p = flamePoint(i);
      const d = Math.hypot(e.clientX - p.x, (e.clientY - p.y) * 0.55);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const limit = Math.max(40, stage.getBoundingClientRect().width * 0.12);
    if (best < 0 || bestD > limit) return;
    e.stopPropagation();
    const p = flamePoint(best);
    app.magic.sparkle(p.x, p.y, 12);
    extinguish(best);
  }
  stage.addEventListener('pointerdown', onTapStage);

  function spawnNote() {
    const n = document.createElement('div');
    n.className = 'floating-note';
    n.textContent = Math.random() < 0.5 ? '♪' : '♫';
    const r = stage.getBoundingClientRect();
    n.style.left = `${r.left + r.width * (0.15 + Math.random() * 0.7)}px`;
    n.style.top = `${r.top + r.height * (0.15 + Math.random() * 0.25)}px`;
    n.style.color = ['#fff', '#FFD0DC', '#D6EEFF', '#E6DAFF'][(Math.random() * 4) | 0];
    root.appendChild(n);
    n.addEventListener('animationend', () => n.remove());
  }

  // ---------- 毎フレーム: 炎の揺れ・かざぐるま・雪の風・ロウソクの体力 ----------
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min(0.05, (now - (lastFrame || now)) / 1000));
    lastFrame = now;
    const s = state === 'blow' ? score : 0;
    for (let i = 0; i < candles.length; i++) {
      if (!candles[i].lit) continue;
      const wob = Math.sin(now / 55 + i * 1.7);
      const lean = (s * 30 + wob * s * 12) * dirs[i];
      const sy = (1 - 0.4 * s * (0.65 + 0.35 * Math.sin(now / 41 + i))) * (0.55 + 0.45 * candles[i].health);
      const sx = 1 + 0.2 * s;
      leanEls[i].style.transform = s > 0.01 || candles[i].health < 1
        ? `skewX(${lean.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        : '';
    }
    if (state === 'blow' && listener) {
      for (const i of stepCandles(candles, s, dt)) extinguish(i);
    }
    pinAngle = (pinAngle + (30 + s * 1500) * dt) % 360;
    pinRot.setAttribute('transform', `rotate(${pinAngle.toFixed(1)})`);
    app.snow.setWind(s);
    chipLevel.style.width = `${Math.round(s * 100)}%`;
  }

  // ---------- 流れ ----------
  async function enter() {
    const my = ++token;
    state = 'lighting';
    lastRemainSaid = -1;
    celebrate.hidden = true;
    celebrate.classList.remove('fade');
    actions.textContent = '';
    chip.hidden = true;
    setSnowman('idle');
    buildCake();
    candles = createCandles(app.settings.age, app.settings.difficulty);
    candles.forEach((c) => (c.lit = false));
    updateWarm();
    root.classList.add('lights-down');
    app.keepAwake(true);
    lastFrame = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    say(LINES.hello(app.settings));

    await wait(900);
    for (let i = 0; i < candles.length; i++) {
      if (my !== token) return;
      lightCandle(i);
      await wait(380);
    }
    if (my !== token) return;
    state = 'ready';
    const hello = say(LINES.hello(app.settings), { voice: 'hello' });
    showActions([
      { label: 'おうたを うたう', icon: ICON.note, cls: 'breathe', onClick: sing },
      { label: 'すぐ ふーっ', icon: ICON.wind, cls: 'ice small', onClick: () => startBlow() },
    ]);
    await hello;
    if (my !== token || state !== 'ready') return;
    await wait(app.settings.voice ? 300 : 1800);
    if (my !== token || state !== 'ready') return;
    say(LINES.sing(), { voice: 'sing' });
  }

  function sing() {
    const my = token;
    if (state !== 'ready') return;
    state = 'song';
    cancelSpeech();
    say(LINES.singing());
    setSnowman('talk');
    showActions([{ label: 'とばす', cls: 'lilac small', onClick: () => afterSong(my) }]);
    clearInterval(noteTimer);
    noteTimer = setInterval(spawnNote, 600);
    playSong('birthday', { onEnd: () => afterSong(my) });
  }

  function afterSong(my) {
    if (my !== token || state !== 'song') return;
    clearInterval(noteTimer);
    stopSong(0.3);
    setSnowman('idle');
    startBlow();
  }

  async function startBlow(line = LINES.blow(), voiceId = 'blow') {
    const my = token;
    if (state === 'blow' || state === 'done') return;
    state = 'blow';
    actions.textContent = '';
    stopSong(0.3);
    // 声はマイクを開く前に話し終える（スピーカーの声を息と取り違えないように）
    await say(line, { voice: voiceId });
    if (my !== token || state !== 'blow') return;
    await startListening(my);
  }

  async function startListening(my) {
    stopListening();
    score = 0;
    let heard = false;
    const onFrame = (f) => {
      score = f.score;
      if (f.levelDb > -90) heard = true;
    };
    // マイク許可の確認が出たままのときも、タッチで消せることを先に知らせる
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      if (my === token && state === 'blow' && !listener?.running) say(LINES.tapHint());
    }, 5000);
    const l = new BlowListener({ difficulty: app.settings.difficulty, onFrame });
    listener = l;
    try {
      if (app.debugSim) {
        fake = fake || createFakeBreath();
        app.fakeBreath = fake;
        l.attach(fake.node);
      } else {
        if (!micSupported()) throw new Error('unsupported');
        await l.start();
      }
    } catch (e) {
      if (listener === l) listener = null;
      l.stop();
      if (e?.name === 'AbortError') return; // 待っているあいだに止めた（全部消えた・場面を出た など）
      console.info('マイクを使えないため、タッチで消す方法に切り替えます', e?.name || e);
      if (my === token && state === 'blow') say(LINES.tapHint(), { voice: 'tapHint' });
      return;
    }
    if (listener !== l || my !== token || state !== 'blow') {
      l.stop();
      if (listener === l) listener = null;
      return;
    }
    chip.hidden = false;
    clearTimeout(hintTimer);
    if (bubbleText.textContent === LINES.tapHint()) say(LINES.blow());
    // マイクから音がまったく届かない（端末の不調など）ときは、タッチで消せることを知らせる
    hintTimer = setTimeout(() => {
      if (my === token && state === 'blow' && !heard) say(LINES.tapHint());
    }, 3000);
  }

  function stopListening() {
    clearTimeout(hintTimer);
    listener?.stop();
    listener = null;
    score = 0;
    chip.hidden = true;
    app.snow.setWind(0);
  }

  async function allOut() {
    const my = token;
    state = 'done';
    stopListening();
    await wait(450);
    if (my !== token) return;
    root.classList.add('is-blackout');
    await wait(750);
    if (my !== token) return;
    root.classList.remove('is-blackout', 'lights-down');
    party(my);
  }

  async function party(my) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    sfx('popper');
    setTimeout(() => sfx('fanfare'), 260);
    app.magic.confetti(0, H * 0.92, { angle: -62, spread: 34, count: 90, power: H * 1.5 });
    app.magic.confetti(W, H * 0.92, { angle: -118, spread: 34, count: 90, power: H * 1.5 });
    setTimeout(() => app.magic.rain(70, 2), 700);
    app.snow.burst(W / 2, H * 0.45, 36, 420);
    puffy(word, 'おめでとう！', 'rainbow');
    puffy(sub, `${app.settings.name} ${app.settings.age}さい`, 'ice');
    celebrate.classList.remove('fade');
    celebrate.hidden = false;
    root.classList.add('partying');
    showPartyChars();
    setSnowman('cheer');
    say(LINES.allOut());
    await wait(900);
    if (my !== token) return;
    speakLine('allOut', app.settings);
    await wait(3600);
    if (my !== token) return;
    celebrate.classList.add('fade');
    await wait(600);
    if (my !== token) return;
    celebrate.hidden = true;
    root.classList.remove('partying');
    hidePartyChars();
    setSnowman('idle');
    say(LINES.toMemories(app.settings), { voice: 'toMemories' });
    showActions([
      { label: 'おもいでを みる', icon: ICON.heart, cls: 'breathe', onClick: (e) => app.go('memories', { x: e.clientX, y: e.clientY }) },
      { label: 'もういっかい', icon: ICON.again, cls: 'ice small', onClick: relight },
    ]);
  }

  // お祝いの主役（右）となかま（左）が下から飛び出す
  function showPartyChars() {
    charParty.textContent = '';
    for (const el of [charEl('cheer', 'char-party-right'), charEl('friend2', 'char-party-left')]) if (el) charParty.appendChild(el);
    void charParty.offsetWidth;
    charParty.classList.add('show');
  }
  function hidePartyChars() {
    charParty.classList.remove('show');
  }

  async function relight() {
    const my = ++token;
    root.classList.remove('partying');
    hidePartyChars();
    state = 'lighting';
    lastRemainSaid = -1;
    celebrate.hidden = true;
    actions.textContent = '';
    setSnowman('idle');
    candles = createCandles(app.settings.age, app.settings.difficulty);
    candles.forEach((c) => (c.lit = false));
    root.classList.add('lights-down');
    say(LINES.again());
    for (let i = 0; i < candles.length; i++) {
      if (my !== token) return;
      lightCandle(i);
      await wait(260);
    }
    if (my !== token) return;
    state = 'ready';
    startBlow(LINES.again(), 'again');
  }

  function exit() {
    token++;
    state = 'idle';
    cancelAnimationFrame(raf);
    raf = 0;
    stopListening();
    clearInterval(noteTimer);
    stopSong(0.3);
    cancelSpeech();
    root.classList.remove('lights-down', 'is-blackout', 'partying');
    hidePartyChars();
    celebrate.hidden = true;
    setSnowman('idle');
    root.querySelectorAll('.floating-note').forEach((n) => n.remove());
  }

  return {
    enter,
    exit,
    // アプリが裏に回ったらマイクを止め、戻ったら聞き直す
    pause() {
      if (state === 'blow') stopListening();
    },
    resume() {
      if (state === 'blow' && !listener) startListening(token);
    },
    get state() {
      return state;
    },
    get score() {
      return score;
    },
    get candles() {
      return candles.map((c) => ({ lit: c.lit, health: Number(c.health.toFixed(2)) }));
    },
    get listening() {
      return !!listener;
    },
  };
}
