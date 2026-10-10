// 設定は端末の localStorage にだけ保存する

import { sanitizeSettings } from '../logic/config.js';

const KEY = 'momo-bday:settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeSettings(null);
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sanitizeSettings(s)));
    return true;
  } catch {
    return false;
  }
}

export function clearSettings() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 保存領域が使えない環境 */
  }
}
