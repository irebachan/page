/**
 * 作品（複数シナリオ）をブラウザ内に保持。IndexedDB 優先、不可時は localStorage。
 */
(function () {
    const DB_NAME = "novelPlayerDrafts";
    const DB_VERSION = 2;
    const STORE = "projects";
    const LEGACY_STORE = "draft";
    const LEGACY_KEY = "current";
    const LS_KEY = "novelPlayerProjectsFallback";
    const LS_ACTIVE_KEY = "novelPlayerActiveProjectId";

    function pad2(n) {
        return ("0" + n).slice(-2);
    }

    function formatSavedAt(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function newId() {
        return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function normalizeProject(record) {
        if (!record || typeof record.text !== "string") return null;
        const now = Date.now();
        return {
            id: record.id || newId(),
            title: (record.title && String(record.title).trim()) || "無題",
            text: record.text,
            savedAt: record.savedAt || now,
            createdAt: record.createdAt || record.savedAt || now,
        };
    }

    function readFallbackBundle() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return { activeId: null, projects: [] };
            const parsed = JSON.parse(raw);
            const projects = Array.isArray(parsed.projects)
                ? parsed.projects.map(normalizeProject).filter(Boolean)
                : [];
            return {
                activeId: parsed.activeId || null,
                projects,
            };
        } catch (_) {
            return { activeId: null, projects: [] };
        }
    }

    function writeFallbackBundle(bundle) {
        try {
            localStorage.setItem(
                LS_KEY,
                JSON.stringify({
                    activeId: bundle.activeId,
                    projects: bundle.projects,
                })
            );
        } catch (_) {
            /* ignore quota */
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
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                const tx = e.target.transaction;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: "id" });
                }
                if (e.oldVersion < 2 && db.objectStoreNames.contains(LEGACY_STORE)) {
                    const legacyStore = tx.objectStore(LEGACY_STORE);
                    const getReq = legacyStore.get(LEGACY_KEY);
                    getReq.onsuccess = () => {
                        const old = getReq.result;
                        if (old && typeof old.text === "string") {
                            const migrated = normalizeProject({
                                id: newId(),
                                title: "移行した下書き",
                                text: old.text,
                                savedAt: old.savedAt,
                                createdAt: old.savedAt,
                            });
                            tx.objectStore(STORE).put(migrated);
                            setActiveIdToLS(migrated.id);
                        }
                        db.deleteObjectStore(LEGACY_STORE);
                    };
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

    function idbGet(db, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    function idbPut(db, project) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(project);
            tx.oncomplete = () => resolve(project);
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

    let sharedDbPromise = null;

    function acquireDb() {
        if (!window.indexedDB) return Promise.resolve(null);
        if (!sharedDbPromise) {
            sharedDbPromise = openDB().catch((err) => {
                sharedDbPromise = null;
                throw err;
            });
        }
        return sharedDbPromise;
    }

    async function withDb(fn) {
        try {
            const db = await acquireDb();
            return await fn(db);
        } catch (_) {
            return fn(null);
        }
    }

    function scheduleFallbackMirror(fn) {
        const run = () => {
            if (document.hidden) {
                document.addEventListener(
                    "visibilitychange",
                    () => {
                        if (!document.hidden) scheduleFallbackMirror(fn);
                    },
                    { once: true }
                );
                return;
            }
            fn();
        };
        if (typeof requestIdleCallback === "function") {
            requestIdleCallback(run, { timeout: 5000 });
        } else {
            setTimeout(run, 0);
        }
    }

    function sortProjects(projects) {
        return projects.slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    }

    async function list() {
        const fromDb = await withDb(async (db) => {
            if (!db) return null;
            const rows = await idbAll(db);
            return rows.map(normalizeProject).filter(Boolean);
        });
        if (fromDb) {
            return sortProjects(fromDb);
        }
        return sortProjects(readFallbackBundle().projects);
    }

    async function get(id) {
        if (!id) return null;
        const fromDb = await withDb(async (db) => {
            if (!db) return null;
            return normalizeProject(await idbGet(db, id));
        });
        if (fromDb) return fromDb;
        const bundle = readFallbackBundle();
        return bundle.projects.find((p) => p.id === id) || null;
    }

    function getActiveId() {
        return getActiveIdFromLS();
    }

    function setActiveId(id) {
        setActiveIdToLS(id);
        const bundle = readFallbackBundle();
        bundle.activeId = id;
        writeFallbackBundle(bundle);
    }

    function mirrorProjectToFallback(project) {
        const bundle = readFallbackBundle();
        const idx = bundle.projects.findIndex((p) => p.id === project.id);
        if (idx >= 0) bundle.projects[idx] = project;
        else bundle.projects.push(project);
        writeFallbackBundle(bundle);
    }

    async function saveProject({
        id,
        title,
        text,
        savedAt,
        createdAt,
        deferFallbackMirror = true,
    }) {
        const now = Date.now();
        let existing = null;
        if (!createdAt && id) {
            existing = await get(id);
        }
        const project = normalizeProject({
            id: id || existing?.id || newId(),
            title: title !== undefined ? title : existing?.title,
            text: text !== undefined ? text : existing?.text ?? "",
            savedAt: savedAt || now,
            createdAt: createdAt || existing?.createdAt || now,
        });
        if (!project) return null;

        await withDb(async (db) => {
            if (db) await idbPut(db, project);
        });

        if (deferFallbackMirror) {
            scheduleFallbackMirror(() => mirrorProjectToFallback(project));
        } else {
            mirrorProjectToFallback(project);
        }

        return project;
    }

    async function create({ title, text }) {
        const project = normalizeProject({
            id: newId(),
            title: title || "無題",
            text: text ?? "",
            savedAt: Date.now(),
            createdAt: Date.now(),
        });
        await withDb(async (db) => {
            if (db) await idbPut(db, project);
        });
        const bundle = readFallbackBundle();
        bundle.projects.push(project);
        bundle.activeId = project.id;
        writeFallbackBundle(bundle);
        setActiveId(project.id);
        return project;
    }

    async function remove(id) {
        await withDb(async (db) => {
            if (db) await idbDelete(db, id);
        });
        const bundle = readFallbackBundle();
        bundle.projects = bundle.projects.filter((p) => p.id !== id);
        if (bundle.activeId === id) {
            bundle.activeId = bundle.projects[0]?.id || null;
            setActiveId(bundle.activeId);
        }
        writeFallbackBundle(bundle);
    }

    async function migrateLegacyDraftFallback() {
        const all = await list();
        if (all.length > 0) return;
        try {
            const raw = localStorage.getItem("novelPlayerDraftFallback");
            if (!raw) return;
            const old = JSON.parse(raw);
            if (old && typeof old.text === "string") {
                await create({
                    title: "移行した下書き",
                    text: old.text,
                });
                localStorage.removeItem("novelPlayerDraftFallback");
            }
        } catch (_) {
            /* ignore */
        }
    }

    async function ensureActiveProject() {
        await migrateLegacyDraftFallback();

        let id = getActiveId();
        let project = id ? await get(id) : null;
        if (project) return project;

        const all = await list();
        if (all.length > 0) {
            project = all[0];
            setActiveId(project.id);
            return project;
        }

        project = await create({ title: "作品1", text: "" });
        return project;
    }

    function sanitizeExportBasename(title) {
        const base = (title || "scenario").trim() || "scenario";
        return base.replace(/[\\/:*?"<>|]/g, "_").slice(0, 48);
    }

    window.ProjectStorage = {
        list,
        get,
        create,
        saveProject,
        remove,
        getActiveId,
        setActiveId,
        ensureActiveProject,
        formatSavedAt,
        sanitizeExportBasename,
    };
})();
