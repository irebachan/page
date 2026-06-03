/**
 * 物語ボードのデータモデル・正規化・CRUD
 */
(function (global) {
    /** 白背景でも見やすいパステル系（旧 red/blue/yellow/green も読み込み時に変換） */
    const COLORS = [
        "coral",
        "sky",
        "amber",
        "mint",
        "lavender",
        "orange",
        "teal",
        "rose",
        "slate",
    ];
    /** 塗りツール専用（マーカー色にはならない） */
    const PAINT_ERASER = "clear";
    const LEGACY_COLOR_MAP = {
        red: "coral",
        blue: "sky",
        yellow: "amber",
        green: "mint",
    };
    const SHAPES = ["block", "dot"];
    const VERSION = 2;

    function normalizeColor(color) {
        if (color && COLORS.includes(color)) return color;
        if (color && LEGACY_COLOR_MAP[color]) return LEGACY_COLOR_MAP[color];
        return COLORS[0];
    }

    function newId(prefix) {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function normalizeTag(raw) {
        const s = String(raw || "").trim();
        if (!s) return "";
        return s.startsWith("#") ? s : `#${s}`;
    }

    function normalizeTags(tags) {
        if (!Array.isArray(tags)) return [];
        const out = [];
        for (const t of tags) {
            const n = normalizeTag(t);
            if (n && !out.includes(n)) out.push(n);
        }
        return out;
    }

    function parseTagsInput(str) {
        return normalizeTags(
            String(str || "")
                .split(/[\s,、]+/)
                .filter(Boolean)
        );
    }

    function sortByOrder(items) {
        return [...items].sort((a, b) => a.order - b.order);
    }

    function normalizeColumn(col) {
        if (!col) return null;
        return {
            id: col.id || newId("col"),
            label: String(col.label ?? "").trim() || "?",
            order: typeof col.order === "number" ? col.order : 0,
        };
    }

    function normalizeLane(lane) {
        if (!lane) return null;
        return {
            id: lane.id || newId("lane"),
            label: String(lane.label ?? "").trim() || "レーン",
            order: typeof lane.order === "number" ? lane.order : 0,
            tags: normalizeTags(lane.tags),
        };
    }

    function normalizeNote(note) {
        if (!note) return null;
        const x = typeof note.x === "number" ? Math.max(0, Math.min(1, note.x)) : 0.3;
        const y = typeof note.y === "number" ? Math.max(0, Math.min(1, note.y)) : 0.2;
        const color = normalizeColor(note.color);
        return {
            id: note.id || newId("note"),
            x,
            y,
            text: String(note.text ?? ""),
            color,
        };
    }

    function normalizeMarker(marker) {
        if (!marker) return null;
        const color = normalizeColor(marker.color);
        const shape = SHAPES.includes(marker.shape) ? marker.shape : "block";
        return {
            id: marker.id || newId("mk"),
            laneId: marker.laneId,
            startColId: marker.startColId,
            endColId: marker.endColId || null,
            color,
            shape,
            comment: String(marker.comment ?? ""),
            tags: normalizeTags(marker.tags),
        };
    }

    function normalizeBoard(raw) {
        const now = Date.now();
        const board = raw || {};
        const columns = (Array.isArray(board.columns) ? board.columns : [])
            .map(normalizeColumn)
            .filter(Boolean);
        const lanes = (Array.isArray(board.lanes) ? board.lanes : [])
            .map(normalizeLane)
            .filter(Boolean);
        const markers = (Array.isArray(board.markers) ? board.markers : [])
            .map(normalizeMarker)
            .filter(Boolean);
        const notes = (Array.isArray(board.notes) ? board.notes : [])
            .map(normalizeNote)
            .filter(Boolean);
        return {
            version: VERSION,
            id: board.id || newId("board"),
            title: (board.title && String(board.title).trim()) || "無題",
            columns: sortByOrder(columns),
            lanes: sortByOrder(lanes),
            markers,
            notes,
            savedAt: board.savedAt || now,
            createdAt: board.createdAt || board.savedAt || now,
        };
    }

    function createSampleBoard() {
        const c1 = { id: newId("col"), label: "S1", order: 1 };
        const c2 = { id: newId("col"), label: "S2", order: 2 };
        const c25 = { id: newId("col"), label: "S2.5", order: 2.5 };
        const c3 = { id: newId("col"), label: "S3", order: 3 };
        const c4 = { id: newId("col"), label: "S4", order: 4 };
        const l1 = { id: newId("lane"), label: "主人公", order: 1, tags: [] };
        const l2 = { id: newId("lane"), label: "伏線A", order: 2, tags: ["#伏線"] };
        const l3 = { id: newId("lane"), label: "王女", order: 3, tags: [] };
        const l4 = { id: newId("lane"), label: "ライバル", order: 4, tags: ["#敵"] };
        return normalizeBoard({
            title: "サンプル",
            columns: [c1, c2, c25, c3, c4],
            lanes: [l1, l2, l3, l4],
            markers: [
                {
                    id: newId("mk"),
                    laneId: l1.id,
                    startColId: c1.id,
                    endColId: c3.id,
                    color: "coral",
                    shape: "block",
                    comment: "",
                    tags: [],
                },
                {
                    id: newId("mk"),
                    laneId: l1.id,
                    startColId: c4.id,
                    color: "coral",
                    shape: "block",
                    comment: "",
                    tags: [],
                },
                {
                    id: newId("mk"),
                    laneId: l2.id,
                    startColId: c1.id,
                    color: "sky",
                    shape: "dot",
                    comment: "そろそろ再登場\n候補:\n裏切り\n誘拐",
                    tags: ["#伏線"],
                },
                {
                    id: newId("mk"),
                    laneId: l2.id,
                    startColId: c4.id,
                    color: "sky",
                    shape: "dot",
                    comment: "",
                    tags: ["#伏線"],
                },
                {
                    id: newId("mk"),
                    laneId: l3.id,
                    startColId: c2.id,
                    endColId: c25.id,
                    color: "amber",
                    shape: "block",
                    comment: "",
                    tags: ["#恋愛"],
                },
            ],
            notes: [
                {
                    id: newId("note"),
                    x: 0.72,
                    y: 0.18,
                    text: "グリッド外のメモ（例）",
                    color: "amber",
                },
            ],
        });
    }

    function createEmptyBoard(title) {
        const c1 = { id: newId("col"), label: "S1", order: 1 };
        const l1 = { id: newId("lane"), label: "行1", order: 1, tags: [] };
        return normalizeBoard({
            title: title || "新しいシート",
            columns: [c1],
            lanes: [l1],
            markers: [],
            notes: [],
        });
    }

    function addNote(board, x, y, text, color) {
        const note = normalizeNote({
            id: newId("note"),
            x: typeof x === "number" ? x : 0.3,
            y: typeof y === "number" ? y : 0.2,
            text: text || "",
            color: color || "amber",
        });
        if (!board.notes) board.notes = [];
        board.notes.push(note);
        return note;
    }

    function updateNote(board, noteId, patch) {
        const n = board.notes?.find((x) => x.id === noteId);
        if (!n) return null;
        if (patch.text !== undefined) n.text = String(patch.text);
        if (patch.color) n.color = normalizeColor(patch.color);
        if (typeof patch.x === "number") n.x = Math.max(0, Math.min(1, patch.x));
        if (typeof patch.y === "number") n.y = Math.max(0, Math.min(1, patch.y));
        return normalizeNote(n);
    }

    function removeNote(board, noteId) {
        if (!board.notes) return false;
        const len = board.notes.length;
        board.notes = board.notes.filter((n) => n.id !== noteId);
        return board.notes.length < len;
    }

    function getSortedColumns(board) {
        return sortByOrder(board.columns);
    }

    function getSortedLanes(board) {
        return sortByOrder(board.lanes);
    }

    function columnIndex(board, colId) {
        const cols = getSortedColumns(board);
        return cols.findIndex((c) => c.id === colId);
    }

    function markerRange(marker, board) {
        const cols = getSortedColumns(board);
        const startIdx = cols.findIndex((c) => c.id === marker.startColId);
        if (startIdx < 0) return null;
        const endId = marker.endColId || marker.startColId;
        const endIdx = cols.findIndex((c) => c.id === endId);
        if (endIdx < 0) return { startIdx, endIdx: startIdx };
        return {
            startIdx,
            endIdx: Math.max(startIdx, endIdx),
        };
    }

    function markerSpan(marker, board) {
        const r = markerRange(marker, board);
        if (!r) return 0;
        return r.endIdx - r.startIdx + 1;
    }

    function rangesOverlap(aStart, aEnd, bStart, bEnd) {
        return aStart <= bEnd && bStart <= aEnd;
    }

    function trimOverlappingMarkers(board, candidate, excludeId) {
        const cols = getSortedColumns(board);
        const cr = markerRange(candidate, board);
        if (!cr) return;

        const removeIds = new Set();
        const addMarkers = [];

        for (const m of board.markers) {
            if (excludeId && m.id === excludeId) continue;
            if (m.laneId !== candidate.laneId) continue;
            const mr = markerRange(m, board);
            if (!mr) continue;
            if (!rangesOverlap(cr.startIdx, cr.endIdx, mr.startIdx, mr.endIdx)) continue;

            removeIds.add(m.id);
            const base = {
                laneId: m.laneId,
                color: m.color,
                shape: m.shape,
                comment: m.comment,
                tags: [...m.tags],
            };

            if (mr.startIdx < cr.startIdx) {
                const leftEnd = cr.startIdx - 1;
                addMarkers.push(
                    normalizeMarker({
                        id: newId("mk"),
                        ...base,
                        startColId: cols[mr.startIdx].id,
                        endColId: leftEnd > mr.startIdx ? cols[leftEnd].id : null,
                    })
                );
            }

            if (mr.endIdx > cr.endIdx) {
                const rightStart = cr.endIdx + 1;
                addMarkers.push(
                    normalizeMarker({
                        id: newId("mk"),
                        ...base,
                        startColId: cols[rightStart].id,
                        endColId: rightStart < mr.endIdx ? cols[mr.endIdx].id : null,
                    })
                );
            }
        }

        if (!removeIds.size) return;
        board.markers = board.markers.filter((m) => !removeIds.has(m.id));
        board.markers.push(...addMarkers);
    }

    function markerOverlaps(board, candidate, excludeId) {
        const cr = markerRange(candidate, board);
        if (!cr) return false;
        for (const m of board.markers) {
            if (excludeId && m.id === excludeId) continue;
            if (m.laneId !== candidate.laneId) continue;
            const mr = markerRange(m, board);
            if (!mr) continue;
            if (rangesOverlap(cr.startIdx, cr.endIdx, mr.startIdx, mr.endIdx)) return true;
        }
        return false;
    }

    function insertOrderBetween(before, after) {
        if (before == null && after == null) return 1;
        if (before == null) return after.order - 1;
        if (after == null) return before.order + 1;
        return (before.order + after.order) / 2;
    }

    function suggestInsertLabel(before, after) {
        if (before && after) {
            const b = before.label;
            const a = after.label;
            if (/^S\d+(\.\d+)?$/i.test(b) && /^S\d+(\.\d+)?$/i.test(a)) {
                const nb = parseFloat(b.slice(1));
                const na = parseFloat(a.slice(1));
                if (!Number.isNaN(nb) && !Number.isNaN(na)) {
                    const mid = (nb + na) / 2;
                    return mid % 1 === 0 ? `S${mid}` : `S${mid}`;
                }
            }
            return "";
        }
        if (before) return "";
        return "S1";
    }

    function insertColumnBefore(board, colId) {
        const cols = getSortedColumns(board);
        const idx = cols.findIndex((c) => c.id === colId);
        const before = idx > 0 ? cols[idx - 1] : null;
        const after = idx >= 0 ? cols[idx] : cols[0] || null;
        const order = before && after ? insertOrderBetween(before, after) : after ? after.order - 1 : 1;
        const label = suggestInsertLabel(before, after) || "新列";
        const col = normalizeColumn({ id: newId("col"), label, order });
        board.columns.push(col);
        board.columns = sortByOrder(board.columns);
        return col;
    }

    function insertColumnAfter(board, colId) {
        const cols = getSortedColumns(board);
        const idx = cols.findIndex((c) => c.id === colId);
        const before = idx >= 0 ? cols[idx] : null;
        const after = idx >= 0 && idx < cols.length - 1 ? cols[idx + 1] : null;
        const order = after ? insertOrderBetween(before, after) : (before ? before.order + 1 : 1);
        const label = suggestInsertLabel(before, after) || "新列";
        const col = normalizeColumn({ id: newId("col"), label, order });
        board.columns.push(col);
        board.columns = sortByOrder(board.columns);
        return col;
    }

    function removeColumn(board, colId) {
        const cols = getSortedColumns(board);
        if (cols.length <= 1) return false;
        board.columns = board.columns.filter((c) => c.id !== colId);
        board.markers = board.markers.filter((m) => {
            if (m.startColId === colId || m.endColId === colId) return false;
            return true;
        });
        return true;
    }

    function renameColumn(board, colId, label) {
        const col = board.columns.find((c) => c.id === colId);
        if (!col) return;
        col.label = String(label).trim() || col.label;
    }

    function addLane(board, afterLaneId) {
        const lanes = getSortedLanes(board);
        let order = 1;
        if (afterLaneId == null && lanes.length) {
            order = lanes[lanes.length - 1].order + 1;
        } else if (afterLaneId) {
            const idx = lanes.findIndex((l) => l.id === afterLaneId);
            const before = idx >= 0 ? lanes[idx] : null;
            const after = idx >= 0 && idx < lanes.length - 1 ? lanes[idx + 1] : null;
            order = after ? insertOrderBetween(before, after) : (before ? before.order + 1 : 1);
        }
        const lane = normalizeLane({
            id: newId("lane"),
            label: `行${board.lanes.length + 1}`,
            order,
            tags: [],
        });
        board.lanes.push(lane);
        board.lanes = sortByOrder(board.lanes);
        return lane;
    }

    function removeLane(board, laneId) {
        if (board.lanes.length <= 1) return false;
        board.lanes = board.lanes.filter((l) => l.id !== laneId);
        board.markers = board.markers.filter((m) => m.laneId !== laneId);
        return true;
    }

    function renameLane(board, laneId, label) {
        const lane = board.lanes.find((l) => l.id === laneId);
        if (!lane) return;
        lane.label = String(label).trim() || lane.label;
    }

    function setLaneTags(board, laneId, tags) {
        const lane = board.lanes.find((l) => l.id === laneId);
        if (lane) lane.tags = normalizeTags(tags);
    }

    function addMarker(board, laneId, startColId, opts) {
        const marker = normalizeMarker({
            id: newId("mk"),
            laneId,
            startColId,
            endColId: opts?.endColId || null,
            color: opts?.color || "red",
            shape: opts?.shape || "block",
            comment: opts?.comment || "",
            tags: opts?.tags || [],
        });
        if (!markerRange(marker, board)) return null;
        trimOverlappingMarkers(board, marker);
        board.markers.push(marker);
        return marker;
    }

    function updateMarker(board, markerId, patch) {
        const m = board.markers.find((x) => x.id === markerId);
        if (!m) return null;
        if (patch.color) m.color = normalizeColor(patch.color);
        if (patch.shape && SHAPES.includes(patch.shape)) m.shape = patch.shape;
        if (patch.comment !== undefined) m.comment = String(patch.comment);
        if (patch.tags !== undefined) m.tags = normalizeTags(patch.tags);
        if (patch.startColId) m.startColId = patch.startColId;
        if (patch.endColId !== undefined) m.endColId = patch.endColId || null;
        Object.assign(m, normalizeMarker(m));
        if (!markerRange(m, board)) return null;
        trimOverlappingMarkers(board, m, markerId);
        return m;
    }

    function eraseMarkerRange(board, laneId, anchorColId, previewColId) {
        const cols = getSortedColumns(board);
        const ai = cols.findIndex((c) => c.id === anchorColId);
        const bi = cols.findIndex((c) => c.id === previewColId);
        if (ai < 0 || bi < 0) return false;
        const lo = Math.min(ai, bi);
        const hi = Math.max(ai, bi);
        const ghost = normalizeMarker({
            id: newId("mk"),
            laneId,
            startColId: cols[lo].id,
            endColId: lo === hi ? null : cols[hi].id,
            color: "coral",
            shape: "block",
        });
        trimOverlappingMarkers(board, ghost, ghost.id);
        return true;
    }

    function removeMarker(board, markerId) {
        const len = board.markers.length;
        board.markers = board.markers.filter((m) => m.id !== markerId);
        return board.markers.length < len;
    }

    function setMarkerSpan(board, markerId, endColId) {
        const m = board.markers.find((x) => x.id === markerId);
        if (!m) return null;
        return applyMarkerRange(board, markerId, m.startColId, endColId);
    }

    function splitOffMarkerEnds(board, marker, newLo, newHi) {
        const cols = getSortedColumns(board);
        const mr = markerRange(marker, board);
        if (!mr) return;
        const base = {
            laneId: marker.laneId,
            color: marker.color,
            shape: marker.shape,
            comment: marker.comment,
            tags: [...marker.tags],
        };
        if (mr.startIdx < newLo) {
            const leftEnd = newLo - 1;
            board.markers.push(
                normalizeMarker({
                    id: newId("mk"),
                    ...base,
                    startColId: cols[mr.startIdx].id,
                    endColId: leftEnd > mr.startIdx ? cols[leftEnd].id : null,
                })
            );
        }
        if (mr.endIdx > newHi) {
            const rightStart = newHi + 1;
            board.markers.push(
                normalizeMarker({
                    id: newId("mk"),
                    ...base,
                    startColId: cols[rightStart].id,
                    endColId: rightStart < mr.endIdx ? cols[mr.endIdx].id : null,
                })
            );
        }
    }

    function applyMarkerRange(board, markerId, startColId, endColId) {
        const m = board.markers.find((x) => x.id === markerId);
        if (!m) return null;
        const cols = getSortedColumns(board);
        const si = cols.findIndex((c) => c.id === startColId);
        const ei = cols.findIndex((c) => c.id === endColId);
        if (si < 0 || ei < 0) return null;
        const lo = Math.min(si, ei);
        const hi = Math.max(si, ei);
        splitOffMarkerEnds(board, m, lo, hi);
        return updateMarker(board, markerId, {
            startColId: cols[lo].id,
            endColId: lo === hi ? null : cols[hi].id,
        });
    }

    function collectAllTags(board) {
        const set = new Set();
        for (const l of board.lanes) {
            for (const t of l.tags) set.add(t);
        }
        for (const m of board.markers) {
            for (const t of m.tags) set.add(t);
        }
        return [...set].sort();
    }

    function boardToExport(board) {
        const b = normalizeBoard(board);
        return {
            version: VERSION,
            title: b.title,
            columns: b.columns.map(({ id, label, order }) => ({ id, label, order })),
            lanes: b.lanes.map(({ id, label, order, tags }) => ({ id, label, order, tags })),
            markers: b.markers.map(
                ({ id, laneId, startColId, endColId, color, shape, comment, tags }) => ({
                    id,
                    laneId,
                    startColId,
                    endColId,
                    color,
                    shape,
                    comment,
                    tags,
                })
            ),
            notes: (b.notes || []).map(({ id, x, y, text, color }) => ({
                id,
                x,
                y,
                text,
                color,
            })),
        };
    }

    function boardFromImport(data, title) {
        const colMap = {};
        const columns = (data.columns || []).map((c) => {
            const col = normalizeColumn({ ...c, id: newId("col") });
            if (c.id) colMap[c.id] = col.id;
            return col;
        });
        const laneMap = {};
        const lanes = (data.lanes || []).map((l) => {
            const lane = normalizeLane({ ...l, id: newId("lane") });
            if (l.id) laneMap[l.id] = lane.id;
            return lane;
        });
        const markers = (data.markers || []).map((m) =>
            normalizeMarker({
                ...m,
                id: newId("mk"),
                laneId: laneMap[m.laneId] || m.laneId,
                startColId: colMap[m.startColId] || m.startColId,
                endColId: m.endColId ? colMap[m.endColId] || m.endColId : null,
            })
        );
        const notes = (data.notes || []).map((n) =>
            normalizeNote({ ...n, id: newId("note") })
        );
        return normalizeBoard({
            id: newId("board"),
            title: title || data.title || "無題",
            columns,
            lanes,
            markers,
            notes,
        });
    }

    function laneVisibleWithFilter(board, lane, activeTags) {
        if (!activeTags || activeTags.size === 0) return true;
        for (const t of lane.tags) {
            if (activeTags.has(t)) return true;
        }
        for (const m of board.markers) {
            if (m.laneId !== lane.id) continue;
            for (const t of m.tags) {
                if (activeTags.has(t)) return true;
            }
        }
        return false;
    }

    function markerVisibleWithFilter(marker, activeTags) {
        if (!activeTags || activeTags.size === 0) return true;
        for (const t of marker.tags) {
            if (activeTags.has(t)) return true;
        }
        return false;
    }

    global.PlotBoardModel = {
        VERSION,
        COLORS,
        PAINT_ERASER,
        LEGACY_COLOR_MAP,
        normalizeColor,
        SHAPES,
        newId,
        normalizeTag,
        normalizeTags,
        parseTagsInput,
        normalizeBoard,
        createSampleBoard,
        createEmptyBoard,
        getSortedColumns,
        getSortedLanes,
        columnIndex,
        markerRange,
        markerSpan,
        markerOverlaps,
        insertColumnBefore,
        insertColumnAfter,
        removeColumn,
        renameColumn,
        addLane,
        removeLane,
        renameLane,
        setLaneTags,
        addMarker,
        updateMarker,
        removeMarker,
        addNote,
        updateNote,
        removeNote,
        setMarkerSpan,
        applyMarkerRange,
        eraseMarkerRange,
        collectAllTags,
        boardToExport,
        boardFromImport,
        laneVisibleWithFilter,
        markerVisibleWithFilter,
    };
})(typeof window !== "undefined" ? window : globalThis);
