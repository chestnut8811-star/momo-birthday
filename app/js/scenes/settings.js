// おうちのかた用の設定（⚙ を長押しで開く）

import { $, $$, restartClass } from '../ui.js';
import { defaultMessage, AGE_MIN, AGE_MAX } from '../logic/config.js';
import { GATE } from '../logic/blow-score.js';
import { listPhotos, addPhotoBlobs, updateCaption, deletePhoto, saveOrder, clearPhotos, thumbBlob } from '../store/photos.js';
import { BlowListener, micSupported } from '../audio/mic.js';
import { speakLine, setVoiceEnabled } from '../audio/voice.js';

export function createSettings(app) {
  const sheet = $('#settings');
  const nameIn = $('#set-name');
  const ageOut = $('#age-out');
  const msgIn = $('#set-message');
  const fromIn = $('#set-from');
  const fileIn = $('#photo-input');
  const list = $('#photo-list');
  const emptyNote = $('#photo-empty');
  const progressNote = $('#import-progress');
  const meterBox = $('#meter-box');
  const meterBar = $('#meter-bar');
  const meterText = $('#meter-text');
  const micBtn = $('#mic-test');
  const swSound = $('#sw-sound');
  const swVoice = $('#sw-voice');
  $('#meter-gate').style.left = `${GATE * 100}%`;

  let thumbUrls = [];
  let listener = null;
  let busy = false;

  const set = (patch) => app.updateSettings(patch);

  function fill() {
    const s = app.settings;
    nameIn.value = s.name;
    ageOut.textContent = `${s.age}さい`;
    msgIn.value = s.message;
    msgIn.placeholder = defaultMessage(s.name, s.age);
    fromIn.value = s.from;
    $$('[data-diff]', sheet).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.diff === s.difficulty)));
    swSound.setAttribute('aria-checked', String(s.sound));
    swVoice.setAttribute('aria-checked', String(s.voice));
  }

  // ---------- 入力 ----------
  nameIn.addEventListener('input', () => {
    if (nameIn.value.trim()) set({ name: nameIn.value });
    msgIn.placeholder = defaultMessage(app.settings.name, app.settings.age);
  });
  nameIn.addEventListener('blur', fill);
  $('#age-minus').addEventListener('click', () => {
    set({ age: Math.max(AGE_MIN, app.settings.age - 1) });
    fill();
  });
  $('#age-plus').addEventListener('click', () => {
    set({ age: Math.min(AGE_MAX, app.settings.age + 1) });
    fill();
  });
  msgIn.addEventListener('input', () => set({ message: msgIn.value }));
  fromIn.addEventListener('input', () => set({ from: fromIn.value }));
  $$('[data-diff]', sheet).forEach((b) =>
    b.addEventListener('click', () => {
      set({ difficulty: b.dataset.diff });
      if (listener) listener.difficulty = b.dataset.diff;
      fill();
    }),
  );
  swSound.addEventListener('click', () => {
    set({ sound: !app.settings.sound });
    fill();
  });
  swVoice.addEventListener('click', () => {
    set({ voice: !app.settings.voice });
    fill();
  });
  $('#voice-test').addEventListener('click', async () => {
    if (!app.settings.sound) {
      app.toast('「音」がオフになっています。オンにしてから試してください');
      return;
    }
    app.unlock();
    setVoiceEnabled(true); // 試すあいだだけ有効にする
    const ok = await speakLine('hello', app.settings);
    setVoiceEnabled(app.settings.voice);
    if (!ok) app.toast('声を再生できませんでした');
  });

  // ---------- 写真 ----------
  $('#pick-photos').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', async () => {
    const files = [...fileIn.files];
    fileIn.value = '';
    if (!files.length) return;
    if (busy) {
      app.toast('いま取り込み中です。終わってからもう一度選んでください');
      return;
    }
    await importItems(files.map((blob) => ({ blob })));
  });
  $('#demo-photos').addEventListener('click', async () => {
    if (busy) {
      app.toast('いま取り込み中です。終わってからもう一度押してください');
      return;
    }
    busy = true;
    progressNote.hidden = false;
    progressNote.textContent = 'サンプル写真を作っています…';
    const r = await app.addDemoPhotos((i, n) => {
      progressNote.textContent = `サンプル写真を作っています… ${i} / ${n}`;
    });
    busy = false;
    progressNote.hidden = true;
    app.toast(r.added ? `サンプル写真を ${r.added} 枚入れました` : 'サンプル写真を作れませんでした');
    renderPhotos();
  });

  async function importItems(items) {
    busy = true;
    progressNote.hidden = false;
    progressNote.textContent = `写真を取り込んでいます… 0 / ${items.length}`;
    const r = await addPhotoBlobs(items, (i, n) => {
      progressNote.textContent = `写真を取り込んでいます… ${i} / ${n}`;
    }).catch(() => ({ added: 0, failed: items.length }));
    busy = false;
    progressNote.hidden = true;
    app.toast(r.failed ? `${r.added} 枚を追加しました（${r.failed} 枚は読み込めませんでした）` : `${r.added} 枚を追加しました`);
    renderPhotos();
  }

  async function renderPhotos() {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls = [];
    const photos = await listPhotos().catch(() => []);
    list.textContent = '';
    emptyNote.hidden = photos.length > 0;
    photos.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'photo-item';
      const img = document.createElement('img');
      const url = URL.createObjectURL(thumbBlob(p));
      thumbUrls.push(url);
      img.src = url;
      img.alt = `${i + 1}枚目`;
      const cap = document.createElement('input');
      cap.type = 'text';
      cap.maxLength = 30;
      cap.value = p.caption || '';
      cap.placeholder = 'ひとこと（例：はじめての ゆき）';
      cap.setAttribute('aria-label', `${i + 1}枚目のひとこと`);
      const saveCap = () => updateCaption(p.id, cap.value.trim()).catch(() => app.toast('保存できませんでした'));
      cap.addEventListener('input', saveCap);
      cap.addEventListener('change', saveCap);
      const ops = document.createElement('div');
      ops.className = 'ops';
      const mk = (label, aria, fn, disabled = false, cls = '') => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.setAttribute('aria-label', aria);
        b.disabled = disabled;
        if (cls) b.className = cls;
        b.addEventListener('click', fn);
        return b;
      };
      const ids = photos.map((x) => x.id);
      const move = async (d) => {
        const j = i + d;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await saveOrder(ids);
        renderPhotos();
      };
      ops.append(
        mk('↑', `${i + 1}枚目を前へ`, () => move(-1), i === 0),
        mk('↓', `${i + 1}枚目を後ろへ`, () => move(1), i === photos.length - 1),
        mk('✕', `${i + 1}枚目を削除`, async () => {
          if (!window.confirm('この写真を削除しますか？')) return;
          await deletePhoto(p.id);
          renderPhotos();
        }, false, 'del'),
      );
      li.append(img, cap, ops);
      list.appendChild(li);
    });
  }

  // ---------- マイクのテスト ----------
  micBtn.addEventListener('click', async () => {
    if (listener) {
      stopMic();
      return;
    }
    app.unlock();
    if (!micSupported()) {
      app.toast('このページではマイクを使えません（https で開いてください）');
      return;
    }
    const l = new BlowListener({
      difficulty: app.settings.difficulty,
      onFrame: (f) => {
        meterBar.style.width = `${Math.round(f.score * 100)}%`;
        meterText.textContent = `息の強さ ${Math.round(f.score * 100)}%　音量 ${f.levelDb.toFixed(0)} dB　低い音の割合 ${Math.round(f.lowRatio * 100)}%`;
      },
    });
    listener = l;
    micBtn.textContent = 'テストをやめる';
    try {
      await l.start();
      if (listener !== l) return; // 待っているあいだに止められた
      meterBox.hidden = false;
    } catch (e) {
      if (listener === l) stopMic();
      if (e?.name === 'AbortError') return;
      app.toast(e?.name === 'NotAllowedError' ? 'マイクが許可されていません（設定 → Safari → マイク）' : 'マイクを開始できませんでした');
    }
  });

  function stopMic() {
    listener?.stop();
    listener = null;
    meterBox.hidden = true;
    micBtn.textContent = 'マイクを試す';
  }

  // ---------- 全消去 ----------
  $('#reset-all').addEventListener('click', async () => {
    if (!window.confirm('写真と設定をすべて消して、最初の状態に戻します。よろしいですか？')) return;
    await clearPhotos().catch(() => {});
    app.resetSettings();
    fill();
    renderPhotos();
    app.toast('すべて消しました');
  });

  // ---------- 開く・閉じる ----------
  function open() {
    fill();
    sheet.hidden = false;
    sheet.scrollTop = 0;
    restartClass(sheet, 'open');
    renderPhotos();
  }

  function close() {
    stopMic();
    nameIn.blur();
    sheet.hidden = true;
    app.applySettings();
  }

  $('#settings-close').addEventListener('click', close);

  return { open, close };
}
