// IndexedDB の接続（思い出の写真と、家族が入れたキャラクター画像で共有する）
// 端末の中にだけ保存する。どこにも送信しない

const DB_NAME = 'momo-bday';
const DB_VERSION = 2; // v2: キャラクター画像（chars）を追加

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexeddb-unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chars')) db.createObjectStore('chars', { keyPath: 'slot' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null; // iOS で裏に回ったあとなどに閉じられたら、次に使うとき開き直す
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexeddb-blocked'));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

// トランザクションを始める。接続が閉じていたら開き直して1回だけやり直す
export async function txn(store, mode = 'readonly') {
  for (let attempt = 0; ; attempt++) {
    const db = await openDB();
    try {
      return db.transaction(store, mode);
    } catch (e) {
      dbPromise = null;
      if (attempt >= 1 || e?.name !== 'InvalidStateError') throw e;
    }
  }
}

export const request = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const finished = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
