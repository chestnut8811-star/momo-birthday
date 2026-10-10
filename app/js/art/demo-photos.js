// サンプル写真（演出のお試し用）。アプリの絵を組み合わせた画像を作る

import { snowmanSVG, castleSVG, cakeSVG, tiaraSVG, hillsSVG, peachSVG, snowflakeSVG } from './svg.js';

const FONT = "Hiragino Maru Gothic ProN, Hiragino Sans, sans-serif";

const root = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

// 部品の <svg> を、位置と大きさを指定して入れ子にする
const place = (svg, x, y, w, h) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);

function snowDots(w, h, n, seed) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = '';
  for (let i = 0; i < n; i++) out += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(3 + r() * 9).toFixed(1)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  return out;
}

const label = (w, h) =>
  `<g font-family="${FONT}" font-size="40"><rect x="${w - 230}" y="${h - 96}" width="196" height="64" rx="32" fill="#fff" opacity=".85"/><text x="${w - 132}" y="${h - 50}" text-anchor="middle" fill="#8F74E8">サンプル</text></g>`;

const flakeColor = (svg, color) => svg.replace('<svg class="flake', `<svg color="${color}" class="flake`);

export function demoSVGs() {
  const list = [];

  list.push({
    caption: 'ゆきだるまと いっしょ',
    svg: root(1200, 1500, `
      <defs><linearGradient id="dm1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9D6FF"/><stop offset="1" stop-color="#FFD9E6"/></linearGradient></defs>
      <rect width="1200" height="1500" fill="url(#dm1)"/>
      ${snowDots(1200, 1100, 70, 3)}
      ${place(hillsSVG(), 0, 980, 1200, 520)}
      ${place(snowmanSVG(), 180, 420, 860, 830)}
      ${label(1200, 1500)}`),
  });

  list.push({
    caption: 'よるの ゆきの おしろ',
    svg: root(1500, 1125, `
      <defs>
        <linearGradient id="dm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1A5C"/><stop offset=".65" stop-color="#5B4FBF"/><stop offset="1" stop-color="#F4BCD3"/></linearGradient>
        <radialGradient id="dm2a"><stop offset="0" stop-color="#8CFFDA" stop-opacity=".55"/><stop offset="1" stop-color="#8CFFDA" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1500" height="1125" fill="url(#dm2)"/>
      <ellipse cx="760" cy="230" rx="760" ry="170" fill="url(#dm2a)" transform="rotate(-8 760 230)"/>
      ${snowDots(1500, 700, 60, 11)}
      ${place(castleSVG(), 250, 300, 1000, 560)}
      ${place(hillsSVG(), 0, 820, 1500, 305)}
      ${label(1500, 1125)}`),
  });

  list.push({
    caption: 'まほうの ケーキ',
    svg: root(1200, 1200, `
      <defs><radialGradient id="dm3" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#FFF4F8"/><stop offset="1" stop-color="#FFC9DA"/></radialGradient></defs>
      <rect width="1200" height="1200" fill="url(#dm3)"/>
      ${snowDots(1200, 1200, 40, 5).replaceAll('#fff', '#FFE3EC')}
      ${place(cakeSVG({ candles: 4, name: 'サンプル' }), 150, 120, 900, 1000)}
      ${label(1200, 1200)}`),
  });

  list.push({
    caption: 'きらきらの ティアラ',
    svg: root(1200, 1500, `
      <defs><linearGradient id="dm4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9DFFF"/><stop offset="1" stop-color="#BFE6FF"/></linearGradient></defs>
      <rect width="1200" height="1500" fill="url(#dm4)"/>
      ${place(flakeColor(snowflakeSVG(0), '#fff'), 100, 140, 260, 260)}
      ${place(flakeColor(snowflakeSVG(2), '#fff'), 860, 980, 240, 240)}
      ${place(flakeColor(snowflakeSVG(1), '#fff'), 820, 180, 160, 160)}
      ${place(tiaraSVG(), 160, 480, 880, 484)}
      ${label(1200, 1500)}`),
  });

  list.push({
    caption: 'ももの ほっぺ',
    svg: root(1500, 1125, `
      <defs><linearGradient id="dm5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1E8"/><stop offset="1" stop-color="#FFD0DC"/></linearGradient></defs>
      <rect width="1500" height="1125" fill="url(#dm5)"/>
      ${snowDots(1500, 1125, 50, 21).replaceAll('#fff', '#FFFFFF')}
      ${place(peachSVG(), 300, 260, 520, 560)}
      ${place(peachSVG(), 760, 380, 420, 450)}
      ${label(1500, 1125)}`),
  });

  return list;
}

export function demoBlobs() {
  return demoSVGs().map(({ caption, svg }) => ({ caption, blob: new Blob([svg], { type: 'image/svg+xml' }) }));
}
