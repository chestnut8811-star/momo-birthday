// ボタン用の小さなアイコン（24×24）

const S = (body, fill = false) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

function gearPath() {
  const pts = [];
  const teeth = 8;
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 4 === 0 || i % 4 === 1 ? 10 : 7.4;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z M15.2 12a3.2 3.2 0 1 0-6.4 0a3.2 3.2 0 1 0 6.4 0Z`;
}

export const ICON = {
  home: S('<path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6.2 10v9.5h4.3v-5h3v5h4.3V10"/>'),
  soundOn: S('<path d="M4 9.3h3.6L12 5.2v13.6l-4.4-4.1H4z" fill="currentColor"/><path d="M15.6 9a4.3 4.3 0 0 1 0 6"/><path d="M18.2 6.4a8 8 0 0 1 0 11.2"/>'),
  soundOff: S('<path d="M4 9.3h3.6L12 5.2v13.6l-4.4-4.1H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  gear: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${gearPath()}" fill="currentColor" fill-rule="evenodd"/></svg>`,
  next: S('<path d="M8 5.2v13.6l10.6-6.8z" fill="currentColor"/>'),
  note: S('<ellipse cx="7" cy="17.6" rx="3" ry="2.4" fill="currentColor" stroke="none"/><ellipse cx="16.4" cy="15.6" rx="3" ry="2.4" fill="currentColor" stroke="none"/><path d="M9.7 17.2V6.2l9.3-2.4v11.6"/>'),
  mic: S('<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  wind: S('<path d="M3 8.5h10.5a3 3 0 1 0-3-3"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 16.5h6"/>'),
  again: S('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.2v5h-5"/>'),
  heart: S('<path d="M12 20.2s-7.6-4.7-7.6-10.4A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.6 2.5c0 5.7-7.6 10.4-7.6 10.4z" fill="currentColor"/>'),
  cake: S('<path d="M5 20.5h14v-7H5z"/><path d="M5 16c2 0 2-1.6 3.5-1.6S10 16 12 16s2-1.6 3.5-1.6S17 16 19 16"/><path d="M12 13.5V9.5"/><path d="M12 7.6c-1.1-1-1.1-2.4 0-3.8 1.1 1.4 1.1 2.8 0 3.8z" fill="currentColor"/>'),
};
