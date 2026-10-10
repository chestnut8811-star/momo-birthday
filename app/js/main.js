// 起動・場面の切り替え・共通の操作

import { loadSettings, saveSettings, clearSettings } from './store/settings.js';
import { sanitizeSettings } from './logic/config.js';
import { addPhotoBlobs, countPhotos } from './store/photos.js';
import { createSnow } from './fx/snow.js';
import { createMagic } from './fx/magic.js';
import { unlockAudio, resumeAudio, setMuted, sfx } from './audio/engine.js';
import { initVoice, preloadVoices, setVoiceEnabled, cancelSpeech, voiceCredit } from './audio/voice.js';
import { ICON } from './art/icons.js';
import { snowflakeSVG } from './art/svg.js';
import { demoBlobs } from './art/demo-photos.js';
import { $, $$, wait, holdButton, centerOf } from './ui.js';
import { createTitle } from './scenes/title.js';
import { createCake } from './scenes/cake.js';
import { createMemories } from './scenes/memories.js';
import { createFinale } from './scenes/finale.js';
import { createSettings } from './scenes/settings.js';

const params = new URLSearchParams(location.search);
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const app = {
  settings: loadSettings(),
  debug: params.has('debug'),
  debugSim: params.has('debug') && params.has('sim'),
};

// ?debug のときだけ、画面の隅にエラーと操作の記録を出す（iPhone では開発者ツールが見られないため）
if (app.debug) {
  const hud = document.createElement('div');
  hud.style.cssText =
    'position:fixed;left:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);z-index:99;max-width:80vw;padding:4px 6px;border-radius:6px;background:rgba(0,0,0,.65);color:#fff;font:11px/1.4 ui-monospace,monospace;pointer-events:none;white-space:pre-wrap';
  document.body.appendChild(hud);
  const lines = [];
  app.log = (m) => {
    lines.push(String(m).slice(0, 160));
    while (lines.length > 7) lines.shift();
    hud.textContent = lines.join('\n');
  };
  window.addEventListener('error', (e) => app.log(`ERR ${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => app.log(`REJ ${e.reason?.stack || e.reason?.message || e.reason}`));
  document.addEventListener('pointerdown', (e) => app.log(`down ${e.target.tagName}#${e.target.id}`), true);
  document.addEventListener('click', (e) => app.log(`click ${e.target.closest?.('button')?.id || e.target.tagName}`), true);
} else {
  app.log = () => {};
}

// ---------- 空 ----------
(function stars() {
  const sky = $('#sky');
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    const size = (1.5 + Math.random() * 2.5).toFixed(1);
    s.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 56).toFixed(1)}%;width:${size}px;height:${size}px;animation-delay:${(-Math.random() * 3).toFixed(2)}s;animation-duration:${(2 + Math.random() * 3).toFixed(2)}s`;
    sky.appendChild(s);
  }
})();

app.snow = createSnow($('#snow'), { reduced });
app.magic = createMagic($('#fx'));

// ---------- 設定 ----------
function applySideEffects() {
  setMuted(!app.settings.sound);
  setVoiceEnabled(app.settings.voice);
  $$('.sound-toggle').forEach((b) => {
    const ring = b.querySelector('.ring');
    b.innerHTML = app.settings.sound ? ICON.soundOn : ICON.soundOff;
    if (ring) b.appendChild(ring);
    b.setAttribute('aria-label', app.settings.sound ? 'おとを けす' : 'おとを だす');
  });
}

app.updateSettings = (patch) => {
  app.settings = sanitizeSettings({ ...app.settings, ...patch });
  saveSettings(app.settings);
  applySideEffects();
};
app.applySettings = () => {
  applySideEffects();
  scenes.title.render();
};
app.resetSettings = () => {
  clearSettings();
  app.settings = loadSettings();
  applySideEffects();
};

// iOS では音と読み上げを「タッチの中」で一度動かす必要がある
app.unlock = () => {
  unlockAudio();
  setMuted(!app.settings.sound);
  preloadVoices(); // せりふの音声を先に読み込んでおく
};

app.addDemoPhotos = (onProgress) => addPhotoBlobs(demoBlobs(), onProgress);

let toastTimer = 0;
app.toast = (msg) => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
};

// 画面が暗くならないようにする（対応端末のみ）
let wantAwake = false;
let wakeLock = null;
app.keepAwake = async (on) => {
  wantAwake = on;
  try {
    if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
};

// ---------- 場面の切り替え（雪のワイプ） ----------
const wipe = $('#wipe');
$('.wipe-flake', wipe).innerHTML = snowflakeSVG(0);

function wipeIn(p) {
  wipe.classList.add('on');
  if (!wipe.animate) return wait(250);
  const r = Math.hypot(Math.max(p.x, innerWidth - p.x), Math.max(p.y, innerHeight - p.y)) + 30;
  const a = wipe.animate(
    [{ clipPath: `circle(0px at ${p.x}px ${p.y}px)` }, { clipPath: `circle(${r}px at ${p.x}px ${p.y}px)` }],
    { duration: 560, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' },
  );
  return (a.finished || wait(560)).catch(() => {});
}

function wipeOut() {
  if (!wipe.animate) {
    wipe.classList.remove('on');
    return;
  }
  const a = wipe.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: 'ease', fill: 'forwards' });
  (a.finished || wait(520)).catch(() => {}).then(() => {
    wipe.classList.remove('on');
    wipe.getAnimations?.().forEach((x) => x.cancel());
  });
}

const scenes = {};
let current = null;
let busy = false;

function show(name) {
  $$('.scene').forEach((s) => s.classList.toggle('active', s.id === `scene-${name}`));
  const el = $(`#scene-${name}`);
  el.classList.remove('entering');
  void el.offsetWidth;
  el.classList.add('entering');
}

// 新しい版が届いていたら、タイトルに戻るときに読み込み直す（当日まで古い版のまま使わないように）
let reloadOnTitle = false;

app.go = async (name, at) => {
  app.log(`go ${name}${busy ? ' (busy)' : ''}`);
  if (busy) return;
  if (reloadOnTitle && name === 'title') {
    location.reload();
    return;
  }
  busy = true;
  const p = at && Number.isFinite(at.x) && (at.x || at.y) ? at : { x: innerWidth / 2, y: innerHeight / 2 };
  sfx('whoosh');
  await wipeIn(p);
  app.log('wipe done');
  current?.exit();
  cancelSpeech();
  app.magic.clear();
  current = scenes[name];
  show(name);
  wipeOut();
  busy = false;
  current.enter();
};

scenes.title = createTitle(app);
scenes.cake = createCake(app);
scenes.memories = createMemories(app);
scenes.finale = createFinale(app);
const settingsUI = createSettings(app);
app.openSettings = () => settingsUI.open();

// ---------- 共通の操作 ----------
$$('.home').forEach((b) => {
  b.insertAdjacentHTML('afterbegin', ICON.home);
});
// 画面の隅のボタンは、子どもの誤タップよけに長押しで反応させる
$$('.topbar [data-go]').forEach((b) =>
  holdButton(b, () => app.go(b.dataset.go, centerOf(b)), { onShortTap: () => app.toast('ながおしで もどれるよ') }),
);
$$('.sound-toggle').forEach((b) =>
  holdButton(
    b,
    () => {
      app.unlock();
      app.updateSettings({ sound: !app.settings.sound });
      app.toast(app.settings.sound ? 'おとを だしたよ' : 'おとを けしたよ');
    },
    { onShortTap: () => app.toast(app.settings.sound ? 'ながおしで おとを けせるよ' : 'ながおしで おとが でるよ') },
  ),
);

// どこを触ってもキラキラ（設定画面の中は除く）
document.addEventListener(
  'pointerdown',
  (e) => {
    resumeAudio();
    if (e.target.closest?.('#settings')) return;
    app.magic.sparkle(e.clientX, e.clientY, 7);
    sfx('tap');
  },
  { passive: true },
);
let lastTrail = 0;
document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) return;
    if (e.target.closest?.('#settings, .frost')) return;
    const now = performance.now();
    if (now - lastTrail < 45) return;
    lastTrail = now;
    app.magic.sparkle(e.clientX, e.clientY, 2, 0.6);
  },
  { passive: true },
);
document.addEventListener('touchstart', () => {}, { passive: true }); // iOS で :active を効かせる
document.addEventListener('gesturestart', (e) => e.preventDefault()); // ピンチで拡大しない
document.addEventListener('dblclick', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    current?.pause?.();
    cancelSpeech();
  } else {
    resumeAudio();
    current?.resume?.();
    if (wantAwake) app.keepAwake(true);
  }
});

// ---------- 起動 ----------
initVoice().then(() => {
  $$('.voice-credit').forEach((el) => {
    el.textContent = voiceCredit();
  });
});
applySideEffects();
current = scenes.title;
show('title');
scenes.title.enter();

// オフライン用（https で公開したときだけ。開発中のキャッシュ混乱を避ける）
if ('serviceWorker' in navigator && (location.protocol === 'https:' || params.has('sw'))) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // はじめてのインストールでは読み込み直さない
    if (current === scenes.title && $('#settings').hidden) location.reload();
    else reloadOnTitle = true;
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

if (app.debug) {
  (async () => {
    if (params.has('demo') && (await countPhotos()) === 0) await app.addDemoPhotos();
    const scene = params.get('scene');
    if (scene && scenes[scene]) app.go(scene);
  })();
  window.bday = {
    app,
    scenes,
    go: (name) => app.go(name),
    blow: (level = 0.6, seconds = 1.2) => app.fakeBreath?.blow(level, seconds),
    voice: (level = 0.3, seconds = 1.2) => app.fakeBreath?.voice(level, seconds),
    demo: () => app.addDemoPhotos(),
  };
}
