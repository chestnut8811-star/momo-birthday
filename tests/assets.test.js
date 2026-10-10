import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function swAssets() {
  const src = readFileSync(join(app, 'sw.js'), 'utf8');
  const block = src.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(block, 'sw.js に ASSETS がない');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('オフライン用キャッシュ: アプリの全ファイルが sw.js の ASSETS に入っている', () => {
  const assets = new Set(swAssets());
  const files = walk(app)
    .map((p) => relative(app, p).split('\\').join('/'))
    .filter((p) => /^(js|css|icons|voice|img)\//.test(p) || p === 'index.html' || p === 'manifest.webmanifest')
    .filter((p) => !p.endsWith('.DS_Store'));
  const missing = files.filter((f) => !assets.has(f));
  assert.deepEqual(missing, [], `ASSETS に未登録: ${missing.join(', ')}`);
});

test('オフライン用キャッシュ: ASSETS に書いたファイルは実在する', () => {
  const gone = swAssets().filter((a) => a !== './' && !existsSync(join(app, a)));
  assert.deepEqual(gone, []);
});

test('index.html と manifest が参照するファイルが実在する', () => {
  const html = readFileSync(join(app, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]);
  const manifest = JSON.parse(readFileSync(join(app, 'manifest.webmanifest'), 'utf8'));
  refs.push(...manifest.icons.map((i) => i.src));
  const gone = refs.filter((r) => !existsSync(join(app, r)));
  assert.deepEqual(gone, []);
});

test('声: voice.json のせりふファイルが揃っていて、名前入りのせりふには名前なしの代わりがある', () => {
  const meta = JSON.parse(readFileSync(join(app, 'voice', 'voice.json'), 'utf8'));
  assert.ok(meta.credit.startsWith('VOICEVOX:'), 'クレジット表記がない');
  for (const [id, line] of Object.entries(meta.lines)) {
    assert.ok(existsSync(join(app, 'voice', line.file)), `${id} の音声ファイルがない`);
    if (line.needs?.length) assert.ok(meta.lines[line.fallback], `${id} に名前なしの代わりがない`);
  }
  // アプリが話させるせりふがすべてある
  for (const id of ['hello', 'sing', 'blow', 'again', 'allOut', 'tapHint', 'toMemories', 'memTitle', 'rub', 'finale']) {
    assert.ok(meta.lines[id], `${id} がない`);
  }
});
