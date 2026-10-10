// SVG の絵の部品。すべてオリジナルの絵（既存キャラクターは描かない）
// インライン SVG の id は文書全体で共有されるため、部品ごとに uid() で接頭辞を付ける

import { candleSlots, seeded } from '../logic/layout.js';

let counter = 0;
export const uid = (p = 'g') => `${p}${++counter}`;

const f1 = (v) => Math.round(v * 10) / 10;
const FONT_ATTR = 'font-family="Hiragino Maru Gothic ProN, Hiragino Sans, sans-serif"';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- 雪の結晶 ----------
const ARMS = [
  'M0 0V-44M0-14L-10-24M0-14L10-24M0-28L-7-36M0-28L7-36',
  'M0 0V-41M0-31L-7-38M0-31L7-38M0-17L-6-23M0-17L6-23',
  'M0 0V-43M0-23L-9-31M0-23L9-31',
];

export function snowflakeSVG(variant = 0, cls = '') {
  const arm = ARMS[variant % ARMS.length];
  let paths = '';
  for (let k = 0; k < 6; k++) paths += `<path d="${arm}" transform="rotate(${k * 60})"/>`;
  return `<svg class="flake ${cls}" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
    <circle r="7" fill="currentColor"/></svg>`;
}

// 雪の結晶の線だけ（ほかの SVG の中に埋め込む用）
function flakeG(x, y, size, color = '#fff', width = 6, variant = 0, extra = '') {
  const arm = ARMS[variant % ARMS.length];
  let paths = '';
  for (let k = 0; k < 6; k++) paths += `<path d="${arm}" transform="rotate(${k * 60})"/>`;
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${size / 100})" ${extra}>
    <g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
    <circle r="7" fill="${color}"/></g>`;
}

// 4つの光のきらめき
const SPARK = 'M0-10C1-3 3-1 10 0C3 1 1 3 0 10C-1 3-3 1-10 0C-3-1-1-3 0-10Z';
function sparkG(x, y, s, cls = 'twinkle', fill = '#fff', delay = 0) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path class="${cls}" d="${SPARK}" fill="${fill}" style="animation-delay:${delay}s"/></g>`;
}

// ---------- 桃（ももちゃんの「もも」） ----------
function peachG(x, y, r, p) {
  return `<g transform="translate(${f1(x)} ${f1(y)})">
    <ellipse cx="0" cy="${f1(r * 0.95)}" rx="${f1(r * 0.85)}" ry="${f1(r * 0.22)}" fill="rgba(80,50,140,.18)"/>
    <path d="M0 ${f1(r * 0.98)}C${f1(-r * 1.12)} ${f1(r * 0.92)} ${f1(-r * 1.08)} ${f1(-r * 0.58)} ${f1(-r * 0.28)} ${f1(-r * 0.86)}C${f1(-r * 0.12)} ${f1(-r * 0.92)} 0 ${f1(-r * 0.74)} 0 ${f1(-r * 0.62)}C0 ${f1(-r * 0.74)} ${f1(r * 0.12)} ${f1(-r * 0.92)} ${f1(r * 0.28)} ${f1(-r * 0.86)}C${f1(r * 1.08)} ${f1(-r * 0.58)} ${f1(r * 1.12)} ${f1(r * 0.92)} 0 ${f1(r * 0.98)}Z" fill="url(#${p}peach)"/>
    <path d="M0 ${f1(-r * 0.6)}C${f1(-r * 0.32)} ${f1(-r * 0.1)} ${f1(-r * 0.3)} ${f1(r * 0.5)} ${f1(r * 0.02)} ${f1(r * 0.92)}" fill="none" stroke="#F27C98" stroke-width="${f1(r * 0.09)}" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="${f1(-r * 0.42)}" cy="${f1(-r * 0.25)}" rx="${f1(r * 0.2)}" ry="${f1(r * 0.3)}" fill="#fff" opacity=".55" transform="rotate(-20 ${f1(-r * 0.42)} ${f1(-r * 0.25)})"/>
    <path d="M${f1(r * 0.05)} ${f1(-r * 0.66)}C${f1(r * 0.4)} ${f1(-r * 1.25)} ${f1(r * 1.0)} ${f1(-r * 1.05)} ${f1(r * 1.02)} ${f1(-r * 0.98)}C${f1(r * 0.75)} ${f1(-r * 0.62)} ${f1(r * 0.3)} ${f1(-r * 0.6)} ${f1(r * 0.05)} ${f1(-r * 0.66)}Z" fill="#8ED39A"/>
    <path d="M${f1(r * 0.12)} ${f1(-r * 0.7)}C${f1(r * 0.45)} ${f1(-r * 0.92)} ${f1(r * 0.7)} ${f1(-r * 0.95)} ${f1(r * 0.92)} ${f1(-r * 0.96)}" fill="none" stroke="#5FB574" stroke-width="${f1(r * 0.07)}" stroke-linecap="round"/>
  </g>`;
}

function peachDefs(p) {
  return `<radialGradient id="${p}peach" cx=".38" cy=".3" r=".8">
      <stop offset="0" stop-color="#FFF1E8"/><stop offset=".45" stop-color="#FFC4C8"/><stop offset="1" stop-color="#FF8FA8"/>
    </radialGradient>`;
}

export function peachSVG() {
  const p = uid('pc');
  return `<svg class="peach" viewBox="-30 -34 60 64" aria-hidden="true" focusable="false"><defs>${peachDefs(p)}</defs>${peachG(0, 0, 24, p)}</svg>`;
}

// ---------- 雪だるま（案内役） ----------
export function snowmanSVG({ pinwheel = false } = {}) {
  const p = uid('sm');
  const pw = pinwheel
    ? `<g class="pinwheel">
        <path d="M188 58L177 168" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
        <path d="M188 58L177 168" stroke="#FF9EB1" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 7"/>
        <g transform="translate(188 56)"><g class="pw-rot">
          ${['#FF9EB1', '#8FD3FF', '#C3ADFF', '#8FE3C8'].map((c, k) => `<g transform="rotate(${k * 90})">
            <path d="M0 0L-3-29Q13-33 22-21Q12-12 0 0Z" fill="${c}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M0 0L-3-29L8-15Z" fill="#fff" opacity=".38"/></g>`).join('')}
          <circle r="5" fill="#fff"/><circle r="2.4" fill="#FF8FAB"/>
        </g></g>
      </g>`
    : '';
  const rightArm = pinwheel
    ? '<path d="M144 140L181 120M168 127L176 136" />'
    : '<path d="M144 140L176 116M166 122L170 108M170 119L183 117" />';
  return `<svg class="snowman" viewBox="0 0 230 222" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${p}ball" cx=".36" cy=".3" r=".78">
      <stop offset="0" stop-color="#fff"/><stop offset=".62" stop-color="#F1F6FF"/><stop offset="1" stop-color="#C9D7F4"/>
    </radialGradient>
    <linearGradient id="${p}hat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFB8C8"/><stop offset="1" stop-color="#FF8FAB"/>
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="208" rx="60" ry="9" fill="rgba(40,30,110,.22)"/>
  <g class="sm-body">
    <g class="arm arm-l" style="transform-origin:56px 140px" fill="none" stroke="#9A6A4A" stroke-width="4.5" stroke-linecap="round">
      <path d="M56 140L24 112M34 121L27 105M30 117L16 118"/>
    </g>
    <g class="arm arm-r" style="transform-origin:144px 140px" fill="none" stroke="#9A6A4A" stroke-width="4.5" stroke-linecap="round">${rightArm}</g>
    <circle cx="100" cy="160" r="50" fill="url(#${p}ball)"/>
    <circle cx="100" cy="146" r="4.6" fill="#8FD3FF"/><circle cx="100" cy="164" r="4.6" fill="#FF9EB1"/><circle cx="100" cy="182" r="4.6" fill="#C3ADFF"/>
    <circle cx="100" cy="88" r="38" fill="url(#${p}ball)"/>
    <path d="M63 113Q100 131 137 113L140 125Q100 145 60 125Z" fill="#B9A0FF"/>
    <path d="M70 119Q100 133 130 119" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 6" opacity=".8"/>
    <path d="M118 124L134 168L119 173L108 128Z" fill="#B9A0FF"/>
    <path d="M122 140L130 138M125 151L133 149" stroke="#FFB3C7" stroke-width="4" stroke-linecap="round"/>
    <path d="M120 171l-1 6M126 169l0 6M132 167l1 6" stroke="#B9A0FF" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M65 74Q64 36 100 34Q136 36 135 74Z" fill="url(#${p}hat)"/>
    <path d="M78 70Q80 46 92 38" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
    <path d="M61 69Q100 59 139 69L139 82Q100 72 61 82Z" fill="#FFD0DB"/>
    <path d="M68 68v12M76 66v12M84 65v12M92 64v12M100 64v12M108 64v12M116 65v12M124 66v12M132 68v12" stroke="#FFB3C7" stroke-width="2" stroke-linecap="round"/>
    <circle cx="100" cy="31" r="11" fill="url(#${p}ball)"/>
    ${flakeG(122, 50, 13, '#fff', 9, 1)}
    <g class="eyes">
      <ellipse cx="86" cy="93" rx="5" ry="6.4" fill="#2E2557"/><ellipse cx="114" cy="93" rx="5" ry="6.4" fill="#2E2557"/>
      <circle cx="88" cy="90.4" r="2.1" fill="#fff"/><circle cx="116" cy="90.4" r="2.1" fill="#fff"/>
      <circle cx="84.6" cy="95.6" r="1" fill="#fff"/><circle cx="112.6" cy="95.6" r="1" fill="#fff"/>
    </g>
    <ellipse cx="75" cy="104" rx="7" ry="4.2" fill="#FF9EB1" opacity=".6"/><ellipse cx="125" cy="104" rx="7" ry="4.2" fill="#FF9EB1" opacity=".6"/>
    <path d="M99 99C104 99.5 110 101.5 114.5 104.5C109.5 105.6 103.5 105.6 99 104.6Z" fill="#FF9A52"/>
    <path class="mouth-smile" d="M92 110Q100 116 108 110" fill="none" stroke="#2E2557" stroke-width="2.4" stroke-linecap="round"/>
    <path class="mouth-open" d="M91.5 109Q100 121 108.5 109Z" fill="#7A3E6E"/>
  </g>
  ${pw}
</svg>`;
}

// ---------- 氷のお城 ----------
export function castleSVG() {
  const p = uid('cs');
  const tower = (x, w, top, spireH) => {
    const cx = x + w / 2;
    const r = w * 0.18;
    return `<rect x="${x}" y="${top}" width="${w}" height="${220 - top}" fill="url(#${p}ice)"/>
      <rect x="${cx}" y="${top}" width="${w / 2}" height="${220 - top}" fill="#7FA9E8" opacity=".18"/>
      <path d="M${x - 5} ${top + 2}L${cx} ${top - spireH}L${x + w + 5} ${top + 2}Z" fill="url(#${p}spire)"/>
      <path d="M${cx} ${top - spireH}L${x + w + 5} ${top + 2}L${cx} ${top + 2}Z" fill="#7FA9E8" opacity=".2"/>
      <path d="M${f1(cx - r)} ${top + 36}V${top + 26}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx + r)} ${top + 26}V${top + 36}Z" fill="#FFF3C4" class="window"/>`;
  };
  return `<svg class="castle" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${p}ice" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#D9EEFF"/><stop offset="1" stop-color="#B7C9FF"/>
    </linearGradient>
    <linearGradient id="${p}spire" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#BFE3FF"/>
    </linearGradient>
  </defs>
  <g opacity=".95">
    <rect x="70" y="160" width="260" height="60" fill="url(#${p}ice)"/>
    <path d="M70 160h260" stroke="#fff" stroke-width="3"/>
    ${tower(64, 34, 140, 38)}
    ${tower(302, 34, 140, 38)}
    ${tower(116, 44, 116, 52)}
    ${tower(240, 44, 116, 52)}
    ${tower(170, 60, 92, 66)}
    <path d="M182 220v-30q18-22 36 0v30Z" fill="#FFE9A8" class="window"/>
    <path d="M200 172v48" stroke="#fff" stroke-width="2" opacity=".6"/>
    <path d="M140 160l12-14 12 14M236 160l12-14 12 14" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>
    ${flakeG(200, 13, 20, '#fff', 8, 0)}
  </g>
</svg>`;
}

// ---------- 雪の丘 ----------
export function hillsSVG() {
  const p = uid('hl');
  return `<svg class="hills" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${p}front" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6EEFF"/>
    </linearGradient>
  </defs>
  <path d="M0 58C70 30 150 54 220 40C290 26 350 46 400 34V120H0Z" fill="#CFE2FF"/>
  <path d="M0 84C70 60 140 80 210 70C290 58 340 78 400 64V120H0Z" fill="url(#${p}front)"/>
  <path d="M0 84C70 60 140 80 210 70C290 58 340 78 400 64" fill="none" stroke="#fff" stroke-width="3"/>
</svg>`;
}

// ---------- 氷のティアラ ----------
export function tiaraSVG() {
  const p = uid('ti');
  return `<svg class="tiara" viewBox="0 0 200 110" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${p}metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#DCEFFF"/><stop offset="1" stop-color="#A9C6F2"/>
    </linearGradient>
    <linearGradient id="${p}gem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E6F7FF"/><stop offset=".5" stop-color="#8FD3FF"/><stop offset="1" stop-color="#5AA9F0"/>
    </linearGradient>
  </defs>
  <path d="M18 94L34 58L50 80L66 44L84 68L100 12L116 68L134 44L150 80L166 58L182 94Q100 74 18 94Z" fill="url(#${p}metal)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 88L38 70L52 86M148 86L162 70L170 88M70 78L68 58L84 76M116 76L132 58L130 78" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <path d="M18 94Q100 74 182 94" fill="none" stroke="#B9A0FF" stroke-width="5" stroke-linecap="round"/>
  <g transform="translate(100 52)">
    <path d="M0-12L10.4-6V6L0 12L-10.4 6V-6Z" fill="url(#${p}gem)" stroke="#fff" stroke-width="2"/>
    <path d="M0-12L0 12M-10.4-6L10.4 6M10.4-6L-10.4 6" stroke="#fff" stroke-width="1.2" opacity=".75"/>
  </g>
  <circle cx="66" cy="62" r="6" fill="#FF9EB1" stroke="#fff" stroke-width="2"/>
  <circle cx="134" cy="62" r="6" fill="#FF9EB1" stroke="#fff" stroke-width="2"/>
  <circle cx="34" cy="76" r="4.5" fill="#C3ADFF" stroke="#fff" stroke-width="1.6"/>
  <circle cx="166" cy="76" r="4.5" fill="#C3ADFF" stroke="#fff" stroke-width="1.6"/>
  <circle cx="100" cy="12" r="5" fill="#fff"/><circle cx="66" cy="44" r="4" fill="#fff"/><circle cx="134" cy="44" r="4" fill="#fff"/>
  <circle cx="34" cy="58" r="3.4" fill="#fff"/><circle cx="166" cy="58" r="3.4" fill="#fff"/>
  ${sparkG(112, 40, 0.7, 'twinkle', '#fff', 0.3)}
  ${sparkG(56, 34, 0.5, 'twinkle', '#fff', 1.1)}
  ${sparkG(150, 30, 0.45, 'twinkle', '#fff', 0.7)}
</svg>`;
}

// ---------- 氷でできた大きな数字 ----------
export function bigNumberSVG(n) {
  const p = uid('bn');
  const text = esc(n);
  const size = String(n).length > 1 ? 170 : 230;
  const t = (attrs) => `<text x="100" y="206" ${attrs}>${text}</text>`;
  return `<svg class="bignum" viewBox="0 0 200 240" role="img" aria-label="${text}さい">
  <defs>
    <linearGradient id="${p}fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".3" stop-color="#D3EEFF"/><stop offset=".68" stop-color="#9FD3FF"/><stop offset="1" stop-color="#B39BFF"/>
    </linearGradient>
    <linearGradient id="${p}gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="${p}snow" width="38" height="38" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      ${flakeG(10, 10, 12, '#fff', 9, 0)}${flakeG(29, 28, 9, '#fff', 9, 2)}
    </pattern>
  </defs>
  <g class="bignum-glyph" font-family="Arial Rounded MT Bold, Hiragino Maru Gothic ProN, sans-serif" font-size="${size}" text-anchor="middle">
    ${t('transform="translate(0 10)" fill="#2E2470" opacity=".3" stroke="#2E2470" stroke-width="30" stroke-linejoin="round"')}
    ${t('fill="#fff" stroke="#fff" stroke-width="30" stroke-linejoin="round"')}
    ${t(`fill="url(#${p}fill)" stroke="#A58CF5" stroke-width="7" stroke-linejoin="round" paint-order="stroke"`)}
    ${t(`fill="url(#${p}snow)" opacity=".55"`)}
    ${t(`fill="url(#${p}gloss)"`)}
  </g>
  ${sparkG(30, 70, 1.3, 'twinkle', '#fff', 0)}
  ${sparkG(172, 150, 1.0, 'twinkle', '#fff', 0.8)}
  ${sparkG(160, 52, 0.7, 'twinkle', '#FFF3C4', 1.4)}
</svg>`;
}

// ---------- リボンの横断幕 ----------
export function ribbonSVG(text) {
  const p = uid('rb');
  return `<svg class="ribbon" viewBox="0 0 380 112" role="img" aria-label="${esc(text)}">
  <defs>
    <linearGradient id="${p}band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFC2D2"/><stop offset="1" stop-color="#FF8FAE"/>
    </linearGradient>
    <path id="${p}arc" d="M52 70Q190 36 328 70"/>
  </defs>
  <path d="M40 50L6 58L22 75L8 94L52 86Z" fill="#F4789C"/>
  <path d="M340 50L374 58L358 75L372 94L328 86Z" fill="#F4789C"/>
  <path d="M40 50L52 86L58 62Z" fill="#D85C83"/><path d="M340 50L328 86L322 62Z" fill="#D85C83"/>
  <path d="M38 42Q190 6 342 42L342 84Q190 48 38 84Z" fill="url(#${p}band)"/>
  <path d="M44 49Q190 15 336 49M44 77Q190 41 336 77" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="5 5" opacity=".75"/>
  <text class="ribbon-text" ${FONT_ATTR} font-size="21" text-anchor="middle" fill="#C9466F" opacity=".35" transform="translate(0 2)"><textPath href="#${p}arc" xlink:href="#${p}arc" startOffset="50%">${esc(text)}</textPath></text>
  <text class="ribbon-text" ${FONT_ATTR} font-size="21" text-anchor="middle" fill="#fff"><textPath href="#${p}arc" xlink:href="#${p}arc" startOffset="50%">${esc(text)}</textPath></text>
</svg>`;
}

// ---------- ケーキ ----------
const CANDLE_COLORS = ['#FF9EB1', '#7FC8F8', '#B79CFF', '#7FDCC0', '#FFC56E'];

// 天面の奥側の縁＋手前に垂れるアイシング
function icingPath(cx, cy, rx, ry, band, drips) {
  let d = `M${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI;
    let drop = 0;
    for (const dr of drips) {
      const u = (th - dr.at) / dr.w;
      if (Math.abs(u) < 1) drop = Math.max(drop, dr.len * Math.sqrt(1 - u * u));
    }
    d += `L${f1(cx + rx * Math.cos(th))} ${f1(cy + ry * Math.sin(th) + band + drop)}`;
  }
  return `${d}Z`;
}

function makeDrips(rand, count, minLen, maxLen) {
  const drips = [];
  for (let i = 0; i < count; i++) {
    const at = ((i + 0.5) / count) * Math.PI + (rand() - 0.5) * 0.12;
    drips.push({ at, w: 0.07 + rand() * 0.06, len: minLen + rand() * (maxLen - minLen) });
  }
  return drips;
}

// 手前側の曲線上の点（帯やパールの位置決め用）
const frontPoint = (cx, cy, rx, ry, th, dy = 0) => ({ x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) + dy });

function bandPath(cx, cy, rx, ry, y0, y1) {
  const N = 48;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const p = frontPoint(cx, cy, rx, ry, (i / N) * Math.PI, y0);
    d += `${i ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`;
  }
  for (let i = N; i >= 0; i--) {
    const p = frontPoint(cx, cy, rx, ry, (i / N) * Math.PI, y1);
    d += `L${f1(p.x)} ${f1(p.y)}`;
  }
  return `${d}Z`;
}

export function cakeSVG({ candles = 4, name = '' } = {}) {
  const p = uid('ck');
  const rand = seeded(20241010);

  // 下段（ラベンダー）と上段（アイスブルー）
  const B = { cx: 180, cy: 236, rx: 128, ry: 20, bottom: 330 };
  const T = { cx: 180, cy: 152, rx: 84, ry: 14, bottom: 236 };

  const bottomBody = `M${B.cx - B.rx} ${B.cy}L${B.cx - B.rx} ${B.bottom}A${B.rx} ${B.ry} 0 0 0 ${B.cx + B.rx} ${B.bottom}L${B.cx + B.rx} ${B.cy}Z`;
  const topBody = `M${T.cx - T.rx} ${T.cy}L${T.cx - T.rx} ${T.bottom}A${T.rx} ${T.ry} 0 0 0 ${T.cx + T.rx} ${T.bottom}L${T.cx + T.rx} ${T.cy}Z`;
  const bIcing = icingPath(B.cx, B.cy, B.rx, B.ry, 6, makeDrips(rand, 10, 9, 30));
  const tIcing = icingPath(T.cx, T.cy, T.rx, T.ry, 5, makeDrips(rand, 7, 7, 22));

  // パールの飾り（下段の側面に、ゆるく垂れた弧）
  const anchors = [0.3, 0.92, 1.5708, 2.22, 2.84].map((th) => frontPoint(B.cx, B.cy, B.rx, B.ry, th, 50));
  let pearls = '';
  let bows = '';
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const steps = Math.max(6, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 7));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 14;
      pearls += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.7" fill="url(#${p}pearl)"/>`;
    }
  }
  for (const a of anchors) {
    bows += `<g transform="translate(${f1(a.x)} ${f1(a.y)})">
      <path d="M0 0C-9-8-12 2-10 5C-7 8-2 4 0 0ZM0 0C9-8 12 2 10 5C7 8 2 4 0 0Z" fill="#FF9EB1" stroke="#fff" stroke-width="1"/>
      <path d="M-1 1L-4 9M1 1L4 9" stroke="#FF9EB1" stroke-width="2.2" stroke-linecap="round"/>
      <circle r="2.6" fill="#FFC2D2" stroke="#fff" stroke-width="1"/></g>`;
  }

  // 帯（水玉）
  const ribbonBand = bandPath(B.cx, B.bottom, B.rx, B.ry, -22, -8);
  let dots = '';
  for (let i = 1; i < 14; i++) {
    const pt = frontPoint(B.cx, B.bottom, B.rx, B.ry, (i / 14) * Math.PI, -15);
    dots += `<circle cx="${f1(pt.x)}" cy="${f1(pt.y)}" r="2" fill="#fff" opacity=".9"/>`;
  }

  // 上段と下段のつなぎ目のクリーム
  let rosettes = '';
  for (let i = 0; i < 11; i++) {
    const th = 0.12 + (i / 10) * (Math.PI - 0.24);
    const pt = frontPoint(T.cx, T.bottom, T.rx, T.ry, th, -1);
    rosettes += `<g transform="translate(${f1(pt.x)} ${f1(pt.y)})"><circle r="6.4" fill="#fff"/><path d="M-3.4 0.6a3.4 3.4 0 1 1 3.4 3" fill="none" stroke="#DCE8FF" stroke-width="1.6" stroke-linecap="round"/></g>`;
  }

  // 名前のプレート（ホワイトチョコ）
  const nm = esc(name);
  const nameSize = Math.max(10, Math.min(17, Math.floor(92 / Math.max(1, [...name].length))));
  let lace = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    lace += `<circle cx="${f1(180 + 55 * Math.cos(a))}" cy="${f1(202 + 19.5 * Math.sin(a))}" r="3.4" fill="#FFF6EE"/>`;
  }

  // ロウソク
  const slots = candleSlots(candles, T);
  let defsCandles = '';
  CANDLE_COLORS.forEach((c, k) => {
    defsCandles += `<pattern id="${p}st${k}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <rect width="10" height="10" fill="${c}"/><rect width="4.2" height="10" fill="#fff" opacity=".9"/></pattern>`;
  });
  // 並び順（左→右）で色を決める
  const byX = [...slots].map((s, i) => ({ s, i })).sort((a, b) => a.s.x - b.s.x);
  const colorOf = new Map(byX.map((o, k) => [o.s, k % CANDLE_COLORS.length]));
  let candleEls = '';
  slots.forEach((s, i) => {
    const k = colorOf.get(s);
    const dur = (0.16 + rand() * 0.12).toFixed(2);
    const delay = (-rand()).toFixed(2);
    candleEls += `<g class="candle unlit" data-i="${i}" transform="translate(${f1(s.x)} ${f1(s.y)}) scale(${s.scale})">
      <ellipse cx="0" cy="1" rx="9" ry="3" fill="rgba(60,40,130,.22)"/>
      <rect x="-6.5" y="-56" width="13" height="56" rx="3" fill="url(#${p}st${k})"/>
      <rect x="-6.5" y="-56" width="13" height="56" rx="3" fill="url(#${p}cshade)"/>
      <ellipse cx="0" cy="-56" rx="6.5" ry="2.3" fill="#fff" opacity=".85"/>
      <path d="M0-56q1.6-4-.4-8" fill="none" stroke="#4A3B47" stroke-width="1.7" stroke-linecap="round"/>
      <g transform="translate(0 -63)">
        <g class="smoke" opacity="0" fill="none" stroke="rgba(235,235,250,.85)" stroke-width="2.6" stroke-linecap="round">
          <path d="M0 0c-6-7 6-13 0-21s6-13 0-21"/><path d="M2-4c5-6-5-12 0-19s-5-11 0-17" class="smoke2"/>
        </g>
        <g class="flame">
          <circle class="glow" cx="0" cy="-15" r="32" fill="url(#${p}glow)"/>
          <g class="flame-lean"><g class="flicker" style="animation-duration:${dur}s;animation-delay:${delay}s">
            <path d="M0 2C-6.5 2-9-5-8-11C-7-19-2.5-26 0-37C2.5-26 7-19 8-11C9-5 6.5 2 0 2Z" fill="url(#${p}fo)"/>
            <path d="M0 1C-3.6 1-4.8-3.5-4.2-7C-3.6-12-1.2-16 0-22C1.2-16 3.6-12 4.2-7C4.8-3.5 3.6 1 0 1Z" fill="url(#${p}fi)"/>
            <ellipse cx="0" cy="-1.5" rx="2.8" ry="3.6" fill="#7DB3FF" opacity=".55"/>
          </g></g>
        </g>
      </g>
      <rect class="hit" x="-22" y="-118" width="44" height="122" fill="transparent"/>
    </g>`;
  });

  const sideFlakes = [
    flakeG(112, 206, 15, '#fff', 8, 0, 'opacity=".95"'),
    flakeG(248, 206, 15, '#fff', 8, 2, 'opacity=".95"'),
    flakeG(70, 300, 13, '#fff', 8, 1, 'opacity=".9"'),
    flakeG(290, 300, 13, '#fff', 8, 1, 'opacity=".9"'),
  ].join('');

  return `<svg class="cake" viewBox="0 0 360 400" role="img" aria-label="${candles}ほんの ろうそくの ケーキ">
  <defs>
    <linearGradient id="${p}lav" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#A98FEC"/><stop offset=".2" stop-color="#D5C6FF"/><stop offset=".42" stop-color="#ECE5FF"/><stop offset=".78" stop-color="#C8B4FF"/><stop offset="1" stop-color="#9C80E6"/>
    </linearGradient>
    <linearGradient id="${p}ice" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7FBDEB"/><stop offset=".2" stop-color="#BFE4FF"/><stop offset=".45" stop-color="#E6F6FF"/><stop offset=".8" stop-color="#ABD7FA"/><stop offset="1" stop-color="#78B2E3"/>
    </linearGradient>
    <linearGradient id="${p}icing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1F5FF"/>
    </linearGradient>
    <linearGradient id="${p}plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCE6FF"/>
    </linearGradient>
    <linearGradient id="${p}stem" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#C9D6F5"/><stop offset=".45" stop-color="#FFFFFF"/><stop offset="1" stop-color="#B9C8EE"/>
    </linearGradient>
    <linearGradient id="${p}cshade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".28" stop-color="#fff" stop-opacity=".5"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#4B3A9A" stop-opacity=".28"/>
    </linearGradient>
    <radialGradient id="${p}pearl" cx=".35" cy=".35" r=".7">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#D9D0FF"/>
    </radialGradient>
    <radialGradient id="${p}glow">
      <stop offset="0" stop-color="#FFF4C8" stop-opacity=".95"/><stop offset=".35" stop-color="#FFD27A" stop-opacity=".5"/><stop offset="1" stop-color="#FFB060" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}fo" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFE596"/><stop offset=".55" stop-color="#FFB547"/><stop offset="1" stop-color="#FF8A3D"/>
    </linearGradient>
    <linearGradient id="${p}fi" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFF3B8"/>
    </linearGradient>
    <radialGradient id="${p}warm" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#FFD68A" stop-opacity=".5"/><stop offset=".55" stop-color="#FFD68A" stop-opacity=".18"/><stop offset="1" stop-color="#FFD68A" stop-opacity="0"/>
    </radialGradient>
    ${peachDefs(p)}
    ${defsCandles}
  </defs>

  <!-- ケーキスタンド -->
  <ellipse cx="180" cy="386" rx="60" ry="11" fill="url(#${p}plate)" stroke="#fff" stroke-width="2"/>
  <path d="M163 356C166 368 160 376 150 384L210 384C200 376 194 368 197 356Z" fill="url(#${p}stem)"/>
  <ellipse cx="180" cy="345" rx="160" ry="24" fill="#B9C8EE"/>
  <ellipse cx="180" cy="339" rx="160" ry="24" fill="url(#${p}plate)" stroke="#fff" stroke-width="2.5"/>

  <!-- 下段 -->
  <path d="${bottomBody}" fill="url(#${p}lav)"/>
  <path d="${ribbonBand}" fill="#FFB3C7"/>
  ${dots}
  <path d="${bIcing}" fill="rgba(90,70,170,.16)" transform="translate(0 3)"/>
  <path d="${bIcing}" fill="url(#${p}icing)"/>
  ${pearls}${bows}
  ${peachG(72, 236, 14, p)}${peachG(289, 237, 13, p)}

  <!-- 上段 -->
  <path d="${topBody}" fill="url(#${p}ice)"/>
  ${rosettes}
  <path d="${tIcing}" fill="rgba(70,110,190,.16)" transform="translate(0 3)"/>
  <path d="${tIcing}" fill="url(#${p}icing)"/>
  ${lace}
  <ellipse cx="180" cy="202" rx="55" ry="19.5" fill="#FFF9F2" stroke="#FFD3DF" stroke-width="2"/>
  <ellipse cx="180" cy="202" rx="49" ry="14.5" fill="none" stroke="#FFC2D2" stroke-width="1.2" stroke-dasharray="3 3"/>
  <text class="plate-text" ${FONT_ATTR} x="180" y="${f1(202 + nameSize * 0.36)}" font-size="${nameSize}" text-anchor="middle" fill="#F06A93">${nm}</text>
  ${sideFlakes}

  <!-- ろうそくの明かり -->
  <ellipse class="cake-warm" cx="180" cy="150" rx="215" ry="175" fill="url(#${p}warm)"/>
  <g class="candles">${candleEls}</g>
</svg>`;
}
