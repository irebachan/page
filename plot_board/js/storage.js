/**
 * 複数ボードを IndexedDB 優先で保持。不可時は localStorage。
 */
(function (global) {
    const DB_NAME = "plotBoardStorage";
    const DB_VERSION = 1;
    const STORE = "boards";
    const LS_KEY = "plotBoardFallback";
    const LS_ACTIVE_KEY = "plotBoardActiveId";

    function pad2(n) {
        return ("0" + n).slice(-2);
    }

    function formatSavedAt(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function normalizeRecord(board) {
        if (!board || !window.PlotBoardModel) return null;
        return PlotBoardModel.normalizeBoard(board);
    }

    function readFallbackBundle() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return { activeId: null, boards: [] };
            const parsed = JSON.parse(raw);
            const boards = Array.isArray(parsed.boards)
                ? parsed.boards.map(normalizeRecord).filter(Boolean)
                : [];
            return { activeId: parsed.activeId || null, boards };
        } catch (_) {
            return { activeId: null, boards: [] };
        }
    }

    function writeFallbackBundle(bundle) {
        try {
            localStorage.setItem(
                LS_KEY,
                JSON.stringify({ activeId: bundle.activeId, boards: bundle.boards })
            );
        } catch (_) {
            /* quota */
        }
    }

    function getActiveIdFromLS() {
        try {
            return localStorage.getItem(LS_ACTIVE_KEY);
        } catch (_) {
            return null;
        }
    }

    function setActiveIdToLS(id) {
        try {
            if (id) localStorage.setItem(LS_ACTIVE_KEY, id);
            else localStorage.removeItem(LS_ACTIVE_KEY);
        } catch (_) {
            /* ignore */
        }
    }

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!global.indexedDB) {
                resolve(null);
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: "id" });
                }
            };
        });
    }

    function idbAll(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const req = tx.objectStore(STORE).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    function idbPut(db, board) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(board);
            tx.oncomplete = () => resolve(board);
            tx.onerror = () => reject(tx.error);
        });
    }

    function idbDelete(db, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    let dbPromise = null;

    function getDB() {
        if (!dbPromise) dbPromise = openDB();
        return dbPromise;
    }

    async function listBoards() {
        const db = await getDB();
        if (db) {
            const rows = await idbAll(db);
            return rows.map(normalizeRecord).filter(Boolean);
        }
        return readFallbackBundle().boards;
    }

    async function saveBoard(board) {
        const normalized = normalizeRecord(board);
        if (!normalized) return null;
        normalized.savedAt = Date.now();
        const db = await getDB();
        if (db) {
            await idbPut(db, normalized);
        } else {
            const bundle = readFallbackBundle();
            const idx = bundle.boards.findIndex((b) => b.id === normalized.id);
            if (idx >= 0) bundle.boards[idx] = normalized;
            else bundle.boards.push(normalized);
            writeFallbackBundle(bundle);
        }
        return normalized;
    }

    async function deleteBoard(id) {
        const db = await getDB();
        if (db) await idbDelete(db, id);
        const bundle = readFallbackBundle();
        bundle.boards = bundle.boards.filter((b) => b.id !== id);
        writeFallbackBundle(bundle);
    }

    async function getActiveId() {
        const db = await getDB();
        if (db) {
            return getActiveIdFromLS();
        }
        return readFallbackBundle().activeId;
    }

    async function setActiveId(id) {
        setActiveIdToLS(id);
        const bundle = readFallbackBundle();
        bundle.activeId = id;
        writeFallbackBundle(bundle);
    }

    async function ensureActiveBoard() {
        let boards = await listBoards();
        let activeId = await getActiveId();
        let board = boards.find((b) => b.id === activeId) || null;

        if (!board && boards.length) {
            board = boards.sort((a, b) => b.savedAt - a.savedAt)[0];
            activeId = board.id;
            await setActiveId(activeId);
        }

        if (!board) {
            board = PlotBoardModel.createSampleBoard();
            await saveBoard(board);
            await setActiveId(board.id);
            boards = [board];
        }

        return { board, boards, activeId: board.id };
    }

    async function createBoard(title) {
        const board = PlotBoardModel.createEmptyBoard(title);
        await saveBoard(board);
        await setActiveId(board.id);
        return board;
    }

    async function importBoard(data, title) {
        const board = PlotBoardModel.boardFromImport(data, title);
        await saveBoard(board);
        return board;
    }

    async function uniqueTitle(baseTitle) {
        const boards = await listBoards();
        const titles = new Set(boards.map((b) => b.title));
        if (!titles.has(baseTitle)) return baseTitle;
        let n = 2;
        while (titles.has(`${baseTitle} (${n})`)) n++;
        return `${baseTitle} (${n})`;
    }

    global.PlotBoardStorage = {
        formatSavedAt,
        listBoards,
        saveBoard,
        deleteBoard,
        getActiveId,
        setActiveId,
        ensureActiveBoard,
        createBoard,
        importBoard,
        uniqueTitle,
    };
})(typeof window !== "undefined" ? window : globalThis);
