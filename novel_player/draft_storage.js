/**
 * シナリオ下書き（このブラウザ内のみ）。IndexedDB を優先し、不可なら localStorage。
 */
(function () {
    const DB_NAME = "novelPlayerDrafts";
    const STORE = "draft";
    const KEY = "current";
    const LS_KEY = "novelPlayerDraftFallback";
    const VERSION = 1;

    function pad2(n) {
        return ("0" + n).slice(-2);
    }

    function formatSavedAt(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            const req = indexedDB.open(DB_NAME, 1);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(STORE);
            };
        });
    }

    function idbGet(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const req = tx.objectStore(STORE).get(KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    function idbPut(db, payload) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(payload, KEY);
            tx.oncomplete = () => resolve(payload);
            tx.onerror = () => reject(tx.error);
        });
    }

    function idbDelete(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).delete(KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    function normalizeRecord(record) {
        if (!record || typeof record.text !== "string") return null;
        return {
            version: record.version || VERSION,
            text: record.text,
            savedAt: record.savedAt || Date.now(),
        };
    }

    function readLocalFallback() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            return normalizeRecord(JSON.parse(raw));
        } catch (_) {
            return null;
        }
    }

    function writeLocalFallback(payload) {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(payload));
        } catch (_) {
            /* ignore quota */
        }
    }

    async function load() {
        try {
            const db = await openDB();
            if (db) {
                try {
                    const row = normalizeRecord(await idbGet(db));
                    db.close();
                    if (row) return row;
                } catch (_) {
                    db.close();
                }
            }
        } catch (_) {
            /* fall through */
        }
        return readLocalFallback();
    }

    async function save({ text, savedAt }) {
        const payload = normalizeRecord({
            version: VERSION,
            text: text ?? "",
            savedAt: savedAt || Date.now(),
        });
        if (!payload) return null;

        try {
            const db = await openDB();
            if (db) {
                try {
                    await idbPut(db, payload);
                    db.close();
                    writeLocalFallback(payload);
                    return payload;
                } catch (_) {
                    db.close();
                }
            }
        } catch (_) {
            /* fall through */
        }
        writeLocalFallback(payload);
        return payload;
    }

    async function clear() {
        try {
            const db = await openDB();
            if (db) {
                try {
                    await idbDelete(db);
                } catch (_) {
                    /* ignore */
                }
                db.close();
            }
        } catch (_) {
            /* ignore */
        }
        try {
            localStorage.removeItem(LS_KEY);
        } catch (_) {
            /* ignore */
        }
    }

    window.DraftStorage = {
        load,
        save,
        clear,
        formatSavedAt,
    };
})();
