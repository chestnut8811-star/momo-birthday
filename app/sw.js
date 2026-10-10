// オフラインでも起動できるよう、アプリ本体だけをキャッシュする（写真は IndexedDB にあり、ここでは扱わない）
// ファイルを更新して公開するときは VERSION を上げる

const VERSION = 'momo-bday-v4';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/main.js',
  'js/ui.js',
  'js/logic/config.js',
  'js/logic/blow-score.js',
  'js/logic/layout.js',
  'js/art/svg.js',
  'js/art/icons.js',
  'js/art/demo-photos.js',
  'js/fx/snow.js',
  'js/fx/magic.js',
  'js/fx/frost.js',
  'js/audio/engine.js',
  'js/audio/voice.js',
  'js/audio/mic.js',
  'js/store/settings.js',
  'js/store/db.js',
  'js/store/photos.js',
  'js/store/chars.js',
  'js/chars.js',
  'js/logic/image.js',
  'js/scenes/title.js',
  'js/scenes/cake.js',
  'js/scenes/memories.js',
  'js/scenes/finale.js',
  'js/scenes/settings.js',
  'voice/voice.json',
  'voice/hello.m4a',
  'voice/hello_g.m4a',
  'voice/sing.m4a',
  'voice/blow.m4a',
  'voice/again.m4a',
  'voice/allOut.m4a',
  'voice/tapHint.m4a',
  'voice/toMemories.m4a',
  'voice/toMemories_g.m4a',
  'voice/memTitle.m4a',
  'voice/memTitle_g.m4a',
  'voice/rub.m4a',
  'voice/finale.m4a',
  'voice/finale_g.m4a',
  'img/chars/queen_main.webp',
  'img/chars/queen_cheer.webp',
  'img/chars/bunny.webp',
  'img/chars/reindeer.webp',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      // HTTP キャッシュの古いファイルが混ざらないよう、必ずサーバーから取り直す
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      // 同じ github.io のほかの公開物のキャッシュには触れない（このアプリの古い版だけ消す）
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('momo-bday-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// その版のキャッシュだけを使う（ファイルごとに更新すると、ES モジュールの新旧が混ざって壊れるため）。
// 更新は VERSION を上げた sw.js が新しいキャッシュを丸ごと作り直すことで行う
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (err) {
        if (req.mode === 'navigate') {
          const page = await c.match('./');
          if (page) return page;
        }
        throw err;
      }
    }),
  );
});
