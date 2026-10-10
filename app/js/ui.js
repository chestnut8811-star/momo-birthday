// 画面づくりの小さな道具

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ぷっくり文字: 1文字ずつ span に分け、白いふち（::before）とグラデーションを重ねる。
// 改行は分かち書きの空白でだけ起きるよう、単語ごとにまとめる
export function puffy(el, text, extra = '') {
  el.className = `${el.dataset.baseClass ?? (el.dataset.baseClass = el.className)} puffy-word ${extra}`.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  let i = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      const sp = document.createElement('span');
      sp.className = 'ch sp';
      sp.setAttribute('aria-hidden', 'true');
      el.appendChild(sp);
      i++;
      continue;
    }
    const word = document.createElement('span');
    word.className = 'w';
    word.setAttribute('aria-hidden', 'true');
    for (const c of part) {
      const ch = document.createElement('span');
      ch.className = 'ch';
      ch.style.setProperty('--i', i++);
      ch.dataset.c = c;
      const inner = document.createElement('span');
      inner.textContent = c;
      ch.appendChild(inner);
      word.appendChild(ch);
    }
    el.appendChild(word);
  }
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// CSS アニメーションをもう一度最初から再生する
export function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
}

export function button({ label, icon = '', cls = '', onClick, aria }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `candy-btn ${cls}`.trim();
  b.innerHTML = `${icon ? `<span class="ico">${icon}</span>` : ''}<span></span>`;
  b.lastElementChild.textContent = label;
  if (aria) b.setAttribute('aria-label', aria);
  b.addEventListener('click', onClick);
  return b;
}

// 子どもの誤タップよけ: 長押しで反応する。短く押したときは onShortTap（案内など）を呼ぶ
const RING = '<svg class="ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25"/></svg>';
export function holdButton(el, onHold, { ms = 650, onShortTap } = {}) {
  if (!el.querySelector('.ring')) el.insertAdjacentHTML('beforeend', RING);
  let timer = 0;
  let fired = false;
  const cancel = () => {
    clearTimeout(timer);
    el.classList.remove('pressing');
  };
  el.addEventListener('pointerdown', (e) => {
    fired = false;
    el.classList.add('pressing');
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      el.classList.remove('pressing');
      onHold(e);
    }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, cancel));
  el.addEventListener('click', (e) => {
    if (e.detail === 0) return; // キーボード操作は keydown で処理する
    if (!fired) onShortTap?.(e);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onHold(e);
    }
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
