// アプリのケーキの絵からホーム画面用アイコン（PNG）を作る
// 使い方: node tools/make-icons.mjs   （rsvg-convert が必要: brew install librsvg）

import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cakeSVG, snowflakeSVG } from '../app/js/art/svg.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'app', 'icons');
const work = join(here, 'icon-build');
mkdirSync(out, { recursive: true });
mkdirSync(work, { recursive: true });

const place = (svg, x, y, w, h, extra = '') => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" ${extra} `);

function iconSVG({ maskable = false } = {}) {
  // maskable は中央 80% の円に収める
  const k = maskable ? 0.74 : 1;
  const cw = 760 * k;
  const ch = (cw * 400) / 360;
  const cx = 512 - cw / 2;
  const cy = 512 - ch / 2 + (maskable ? 10 : 30);
  const cake = cakeSVG({ candles: 4, name: '♡' });
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="ibg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3A2F96"/><stop offset=".55" stop-color="#7B67D8"/><stop offset="1" stop-color="#F3B6D0"/>
    </linearGradient>
    <radialGradient id="iglow" cx=".5" cy=".42" r=".5">
      <stop offset="0" stop-color="#FFE7B0" stop-opacity=".55"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#ibg)"/>
  <circle cx="512" cy="430" r="430" fill="url(#iglow)"/>
  ${place(snowflakeSVG(0), 60, 70, 200, 200, 'color="#FFFFFF" opacity=".55"')}
  ${place(snowflakeSVG(2), 800, 120, 150, 150, 'color="#FFFFFF" opacity=".5"')}
  ${place(snowflakeSVG(1), 830, 760, 120, 120, 'color="#FFFFFF" opacity=".4"')}
  ${place(cake, cx.toFixed(0), cy.toFixed(0), cw.toFixed(0), ch.toFixed(0), 'overflow="visible"')}
</svg>`;
}

const targets = [
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

for (const t of targets) {
  const svgPath = join(work, t.maskable ? 'icon-maskable.svg' : 'icon.svg');
  writeFileSync(svgPath, iconSVG({ maskable: t.maskable }));
  execFileSync('rsvg-convert', ['-w', String(t.size), '-h', String(t.size), '-o', join(out, t.file), svgPath]);
  console.log('作成:', t.file);
}
