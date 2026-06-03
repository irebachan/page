/**
 * plot_board メインアプリ
 */
(function () {
    const M = window.PlotBoardModel;
    const R = window.PlotBoardRender;
    const S = window.PlotBoardStorage;

    const els = {
        boardSelect: document.getElementById("boardSelect"),
        savedAt: document.getElementById("savedAt"),
        boardCanvas: document.getElementById("boardCanvas"),
        boardInner: document.getElementById("boardInner"),
        gridRoot: document.getElementById("gridRoot"),
        notesLayer: document.getElementById("notesLayer"),
        filterTags: document.getElementById("filterTags"),
        paintColors: document.getElementById("paintColors"),
        paintHint: document.getElementById("paintHint"),
        importInput: document.getElementById("importInput"),
        cellPopup: document.getElementById("cellPopup"),
        cellPopupClose: document.getElementById("cellPopupClose"),
        cellPopupColors: document.getElementById("cellPopupColors"),
        cellPopupText: document.getElementById("cellPopupText"),
        cellPopupTags: document.getElementById("cellPopupTags"),
        cellPopupDelete: document.getElementById("cellPopupDelete"),
        notePopup: document.getElementById("notePopup"),
        notePopupTitle: document.getElementById("notePopupTitle"),
        notePopupText: document.getElementById("notePopupText"),
        notePopupColors: document.getElementById("notePopupColors"),
        notePopupClose: document.getElementById("notePopupClose"),
        notePopupDelete: document.getElementById("notePopupDelete"),
        noteDraftActions: document.getElementById("noteDraftActions"),
        notePopupOk: document.getElementById("notePopupOk"),
        notePopupCancel: document.getElementById("notePopupCancel"),
        addNoteBtn: document.getElementById("addNoteBtn"),
        undoBtn: document.getElementById("undoBtn"),
    };

    const DRAG_THRESHOLD = 5;
    const VIEWPORT_MARGIN = 10;
    const MAX_UNDO = 40;
    const undoStack = [];

    const state = {
        board: null,
        boards: [],
        activeTags: new Set(),
        selectedMarkerId: null,
        selectedNoteId: null,
        lastColor: "coral",
        saveTimer: null,
        cellSaveTimer: null,
        noteSaveTimer: null,
        suppressSave: false,
        pointer: null,
        noteDrag: null,
        cellEditingId: null,
        noteEditingId: null,
        noteDraft: null,
        suppressEmptyClick: false,
        suppressNoteClick: false,
    };

    function colSpanDataColumns(cell) {
        if (!cell?.colSpan || cell.colSpan <= 1) return 1;
        return (cell.colSpan + 1) / 2;
    }

    function colIdFromPointer(clientX, clientY, laneId) {
        const row = els.gridRoot.querySelector(`tr.lane-row[data-lane-id="${laneId}"]`);
        if (!row) return null;
        const cols = M.getSortedColumns(state.board);
        for (const cell of row.querySelectorAll(".grid-cell[data-col-id]")) {
            const rect = cell.getBoundingClientRect();
            if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
                continue;
            }
            const startIdx = cols.findIndex((c) => c.id === cell.dataset.colId);
            if (startIdx < 0) return cell.dataset.colId;
            const spanCols = colSpanDataColumns(cell);
            if (spanCols <= 1) return cell.dataset.colId;
            const ratio = (clientX - rect.left) / Math.max(rect.width, 1);
            const offset = Math.min(spanCols - 1, Math.max(0, Math.floor(ratio * spanCols)));
            return cols[startIdx + offset]?.id || cell.dataset.colId;
        }
        return null;
    }

    function paintMarkerRange(laneId, anchorColId, previewColId) {
        if (state.lastColor === M.PAINT_ERASER) {
            return M.eraseMarkerRange(state.board, laneId, anchorColId, previewColId);
        }
        const cols = M.getSortedColumns(state.board);
        const ai = cols.findIndex((c) => c.id === anchorColId);
        const bi = cols.findIndex((c) => c.id === previewColId);
        if (ai < 0 || bi < 0) return false;
        const lo = Math.min(ai, bi);
        const hi = Math.max(ai, bi);
        M.addMarker(state.board, laneId, cols[lo].id, {
            color: M.normalizeColor(state.lastColor),
            shape: "block",
            endColId: lo === hi ? null : cols[hi].id,
        });
        return true;
    }

    function onCellPopupColorPick(color) {
        if (!state.cellEditingId) return;
        patchMarker(state.cellEditingId, { color }, { refreshGrid: true });
        state.lastColor = color;
        refreshPaintColors();
        R.renderColorSwatches(els.cellPopupColors, color, onCellPopupColorPick);
    }

    function onNotePopupColorPick(color) {
        if (state.noteDraft) {
            state.noteDraft.color = color;
            renderBoardOnly();
            R.renderColorSwatches(els.notePopupColors, color, onNotePopupColorPick);
            return;
        }
        if (!state.noteEditingId) return;
        M.updateNote(state.board, state.noteEditingId, { color });
        scheduleSave();
        renderBoardOnly();
        R.renderColorSwatches(els.notePopupColors, color, onNotePopupColorPick);
    }

    function scheduleSave() {
        if (state.suppressSave || !state.board) return;
        clearTimeout(state.saveTimer);
        state.saveTimer = setTimeout(async () => {
            const saved = await S.saveBoard(state.board);
            if (saved) {
                state.board = saved;
                updateSavedLabel();
                refreshBoardSelect();
            }
        }, 300);
    }

    function snapshotBoard() {
        return JSON.parse(JSON.stringify(state.board));
    }

    function pushUndo() {
        if (state.suppressSave || !state.board) return;
        undoStack.push(snapshotBoard());
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        updateUndoBtn();
    }

    function clearUndo() {
        undoStack.length = 0;
        updateUndoBtn();
    }

    function updateUndoBtn() {
        if (els.undoBtn) els.undoBtn.disabled = undoStack.length === 0;
    }

    function performUndo() {
        if (!undoStack.length || !state.board) return;
        const prev = undoStack.pop();
        state.suppressSave = true;
        state.board = M.normalizeBoard(prev);
        dismissAll();
        state.pointer = null;
        state.noteDrag = null;
        document.body.classList.remove("plot-dragging");
        R.clearDragHighlight(els.gridRoot);
        state.suppressSave = false;
        fullRender();
        scheduleSave();
        updateUndoBtn();
    }

    function updateSavedLabel() {
        if (els.savedAt && state.board) {
            els.savedAt.textContent = S.formatSavedAt(state.board.savedAt);
        }
    }

    function refreshBoardSelect() {
        R.renderBoardSelect(els.boardSelect, state.boards, state.board?.id);
    }

    function refreshPaintHint() {
        if (!els.paintHint) return;
        els.paintHint.textContent =
            state.lastColor === M.PAINT_ERASER
                ? "消す：クリック／ドラッグ"
                : "塗る：クリック1セル／ドラッグで範囲";
    }

    function refreshPaintColors() {
        R.renderPaintColors(els.paintColors, state.lastColor, (color) => {
            state.lastColor = color;
            refreshPaintColors();
        });
        refreshPaintHint();
    }

    function draftNoteAnchorRect() {
        const d = state.noteDraft;
        if (!d) return { left: 100, top: 100, bottom: 140 };
        const inner = els.boardInner;
        const canvas = els.boardCanvas;
        const canvasRect = canvas.getBoundingClientRect();
        const left = canvasRect.left + d.x * inner.offsetWidth - canvas.scrollLeft;
        const top = canvasRect.top + d.y * inner.offsetHeight - canvas.scrollTop;
        return { left, top, bottom: top + 36 };
    }

    function repositionNotePopup() {
        if (els.notePopup.hidden) return;
        if (state.noteDraft) {
            clampFixedElement(els.notePopup, draftNoteAnchorRect());
            return;
        }
        if (!state.noteEditingId) return;
        const noteEl = els.notesLayer.querySelector(`[data-note-id="${state.noteEditingId}"]`);
        clampFixedElement(
            els.notePopup,
            noteEl?.getBoundingClientRect() || { left: 100, top: 100, bottom: 160 }
        );
    }

    function setNotePopupMode(mode) {
        const isDraft = mode === "draft";
        els.notePopupTitle.textContent = isDraft ? "余白メモ（新規）" : "余白メモ";
        els.noteDraftActions.hidden = false;
        els.notePopupOk.textContent = isDraft ? "確定" : "閉じる";
        els.notePopupCancel.hidden = !isDraft;
        els.notePopupDelete.hidden = isDraft;
    }

    function updateNoteDraftPreview() {
        if (!state.noteDraft) return;
        const body = els.notesLayer.querySelector(".float-note.draft .float-note-body");
        if (body) body.textContent = state.noteDraft.text.trim() || "（メモ）";
    }

    function cellAnchorRect(markerId) {
        const cell = els.gridRoot.querySelector(`.grid-cell[data-marker-id="${markerId}"]`);
        return cell?.getBoundingClientRect() || { left: 80, top: 80, bottom: 120 };
    }

    function repositionCellPopup() {
        if (els.cellPopup.hidden || !state.cellEditingId) return;
        clampFixedElement(els.cellPopup, cellAnchorRect(state.cellEditingId));
    }

    /** ポップアップをアンカー付近に表示し、画面内に収める */
    function clampFixedElement(el, anchorRect) {
        if (!el || el.hidden) return;
        el.style.visibility = "hidden";
        el.hidden = false;
        const margin = VIEWPORT_MARGIN;
        const ew = el.offsetWidth;
        const eh = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left = anchorRect.left;
        let top = anchorRect.bottom + margin;
        if (left + ew > vw - margin) left = vw - ew - margin;
        if (left < margin) left = margin;
        if (top + eh > vh - margin) top = anchorRect.top - eh - margin;
        if (top < margin) top = margin;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.visibility = "";
    }

    function dismissCellSelection() {
        state.selectedMarkerId = null;
        state.cellEditingId = null;
        els.cellPopup.hidden = true;
        els.gridRoot.querySelectorAll(".grid-cell.filled.selected").forEach((el) => {
            el.classList.remove("selected");
        });
    }

    function isCellPopupTarget(target) {
        return target && els.cellPopup.contains(target);
    }

    function isEmptyBoardArea(target) {
        if (!target) return false;
        if (target.closest(".float-note")) return false;
        if (target.closest(".grid-cell.filled")) return false;
        if (target.closest(".edit-popup")) return false;
        if (target.closest(".app-header, .filter-bar")) return false;
        return Boolean(target.closest("#boardCanvas"));
    }

    function dismissNoteDraft() {
        state.noteDraft = null;
        state.selectedNoteId = null;
        state.noteEditingId = null;
        els.notePopup.hidden = true;
        setNotePopupMode("edit");
        renderBoardOnly();
    }

    function dismissNoteSelection() {
        if (state.noteDraft) {
            dismissNoteDraft();
            return;
        }
        state.selectedNoteId = null;
        state.noteEditingId = null;
        els.notePopup.hidden = true;
        renderBoardOnly();
    }

    function dismissAll() {
        dismissCellSelection();
        if (state.noteDraft) dismissNoteDraft();
        else dismissNoteSelection();
    }

    function openCellPopup(markerId) {
        const marker = state.board.markers.find((m) => m.id === markerId);
        if (!marker) return;
        dismissNoteSelection();
        state.cellEditingId = markerId;
        state.selectedMarkerId = markerId;
        els.cellPopupText.value = marker.comment;
        els.cellPopup.hidden = false;
        R.renderColorSwatches(els.cellPopupColors, marker.color, onCellPopupColorPick);
        renderBoardOnly();
        repositionCellPopup();
        els.cellPopupText.focus();
    }

    function openNoteDraftPopup(x, y) {
        dismissCellSelection();
        state.noteDraft = { x, y, color: state.lastColor, text: "" };
        state.noteEditingId = null;
        state.selectedNoteId = null;
        els.notePopupText.value = "";
        setNotePopupMode("draft");
        els.notePopup.hidden = false;
        R.renderColorSwatches(els.notePopupColors, state.noteDraft.color, onNotePopupColorPick);
        renderBoardOnly();
        repositionNotePopup();
        els.notePopupText.focus();
    }

    function confirmNoteDraft() {
        const d = state.noteDraft;
        if (!d) return;
        pushUndo();
        M.addNote(state.board, d.x, d.y, d.text, d.color);
        state.noteDraft = null;
        state.selectedNoteId = null;
        state.noteEditingId = null;
        els.notePopup.hidden = true;
        setNotePopupMode("edit");
        scheduleSave();
        renderBoardOnly();
    }

    function openNotePopup(noteId) {
        const note = state.board.notes?.find((n) => n.id === noteId);
        if (!note) return;
        dismissCellSelection();
        state.noteDraft = null;
        state.noteEditingId = noteId;
        state.selectedNoteId = noteId;
        els.notePopupText.value = note.text;
        setNotePopupMode("edit");
        els.notePopup.hidden = false;
        R.renderColorSwatches(els.notePopupColors, note.color, onNotePopupColorPick);
        renderBoardOnly();
        repositionNotePopup();
        els.notePopupText.focus();
    }

    function renderBoardOnly() {
        if (!state.board) return;
        R.renderGrid(els.gridRoot, state.board, state, buildHandlers());
        R.renderFloatNotes(els.notesLayer, state.board, state, buildNoteHandlers());
        R.syncBoardInnerSize(els.boardInner, els.gridRoot);
    }

    function fullRender() {
        if (!state.board) return;
        renderBoardOnly();
        R.renderFilterTags(els.filterTags, M.collectAllTags(state.board), state.activeTags, (tag) => {
            if (state.activeTags.has(tag)) state.activeTags.delete(tag);
            else state.activeTags.add(tag);
            fullRender();
        });
        refreshPaintColors();
    }

    function patchMarker(markerId, patch, options = {}) {
        const result = M.updateMarker(state.board, markerId, patch);
        if (!result) return false;
        if (patch.color) state.lastColor = patch.color;
        scheduleSave();
        if (options.refreshGrid) {
            renderBoardOnly();
        } else if (patch.comment !== undefined) {
            R.updateCommentDisplay(els.gridRoot, state.board, markerId);
        }
        return true;
    }

    function addNoteAtCenter() {
        const canvas = els.boardCanvas;
        const inner = els.boardInner;
        const x = (canvas.scrollLeft + canvas.clientWidth * 0.45) / inner.offsetWidth;
        const y = (canvas.scrollTop + canvas.clientHeight * 0.25) / inner.offsetHeight;
        openNoteDraftPopup(
            Math.max(0.02, Math.min(0.92, x)),
            Math.max(0.02, Math.min(0.92, y))
        );
    }

    function notePositionFromEvent(e) {
        const inner = els.boardInner;
        const canvas = els.boardCanvas;
        const rect = inner.getBoundingClientRect();
        const x = (e.clientX - rect.left + canvas.scrollLeft) / inner.offsetWidth;
        const y = (e.clientY - rect.top + canvas.scrollTop) / inner.offsetHeight;
        return {
            x: Math.max(0.02, Math.min(0.92, x)),
            y: Math.max(0.02, Math.min(0.92, y)),
        };
    }

    function buildNoteHandlers() {
        return {
            onNoteSelect: (noteId) => {
                if (state.suppressNoteClick) {
                    state.suppressNoteClick = false;
                    return;
                }
                dismissCellSelection();
                if (!els.notePopup.hidden && state.noteEditingId !== noteId) {
                    state.noteEditingId = null;
                    els.notePopup.hidden = true;
                }
                state.selectedNoteId = noteId;
                renderBoardOnly();
            },
            onNoteOpenDetail: (noteId) => openNotePopup(noteId),
            onNoteDraftCancel: () => dismissNoteDraft(),
            onNoteDelete: (noteId) => {
                pushUndo();
                M.removeNote(state.board, noteId);
                if (state.selectedNoteId === noteId) dismissNoteSelection();
                scheduleSave();
                renderBoardOnly();
            },
            onNoteDragStart: (noteId, e) => {
                e.preventDefault();
                dismissCellSelection();
                if (!els.notePopup.hidden && state.noteEditingId !== noteId) {
                    state.noteEditingId = null;
                    els.notePopup.hidden = true;
                }
                state.selectedNoteId = noteId;
                state.noteDrag = { noteId, startX: e.clientX, startY: e.clientY, moved: false };
                renderBoardOnly();
            },
        };
    }

    function dragPreviewColor(p) {
        return state.lastColor;
    }

    function buildHandlers() {
        return {
            onDeleteMarker: (markerId) => deleteMarker(markerId),
            onInsertColumnBefore: (colId) => {
                M.insertColumnBefore(state.board, colId);
                scheduleSave();
                fullRender();
            },
            onInsertColumnEnd: () => {
                const cols = M.getSortedColumns(state.board);
                const last = cols[cols.length - 1];
                if (last) M.insertColumnAfter(state.board, last.id);
                else M.insertColumnBefore(state.board, cols[0]?.id);
                scheduleSave();
                fullRender();
            },
            onRenameColumn: (colId, current) => {
                const label = prompt("列名", current);
                if (label == null) return;
                M.renameColumn(state.board, colId, label);
                scheduleSave();
                fullRender();
            },
            onDeleteColumn: (colId) => {
                pushUndo();
                if (!M.removeColumn(state.board, colId)) {
                    undoStack.pop();
                    updateUndoBtn();
                    alert("列は最低1つ必要です。");
                    return;
                }
                scheduleSave();
                fullRender();
            },
            onRenameLane: (laneId, current) => {
                const label = prompt("レーン名", current);
                if (label == null) return;
                M.renameLane(state.board, laneId, label);
                scheduleSave();
                fullRender();
            },
            onEditLaneTags: (laneId, tags) => {
                const raw = prompt("タグ（スペース区切り）", tags.join(" "));
                if (raw == null) return;
                M.setLaneTags(state.board, laneId, M.parseTagsInput(raw));
                scheduleSave();
                fullRender();
            },
            onDeleteLane: (laneId) => {
                pushUndo();
                if (!M.removeLane(state.board, laneId)) {
                    undoStack.pop();
                    updateUndoBtn();
                    alert("レーンは最低1つ必要です。");
                    return;
                }
                scheduleSave();
                fullRender();
            },
            onAddLane: () => {
                const lanes = M.getSortedLanes(state.board);
                const last = lanes[lanes.length - 1];
                M.addLane(state.board, last?.id);
                scheduleSave();
                fullRender();
            },
            onEmptyCellClick: (laneId, colId) => {
                if (state.suppressEmptyClick) {
                    state.suppressEmptyClick = false;
                    return;
                }
                if (state.lastColor === M.PAINT_ERASER) return;
                dismissCellSelection();
                dismissNoteSelection();
                pushUndo();
                M.addMarker(state.board, laneId, colId, {
                    color: M.normalizeColor(state.lastColor),
                    shape: "block",
                });
                scheduleSave();
                renderBoardOnly();
            },
        };
    }

    function handleFilledCellTap(markerId, e) {
        if (state.lastColor === M.PAINT_ERASER) {
            deleteMarker(markerId);
            return;
        }
        const m = state.board.markers.find((x) => x.id === markerId);
        if (m && m.color !== state.lastColor) {
            pushUndo();
            patchMarker(markerId, { color: state.lastColor }, { refreshGrid: true });
        }
    }

    function deleteMarker(markerId) {
        pushUndo();
        M.removeMarker(state.board, markerId);
        if (state.selectedMarkerId === markerId) dismissCellSelection();
        scheduleSave();
        renderBoardOnly();
    }

    function initGridInteraction() {
        els.gridRoot.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            if (e.target.closest(".cell-delete-btn")) return;
            const cell = e.target.closest(".grid-cell");
            if (!cell) return;
            const laneId = cell.dataset.laneId;
            const colId = colIdFromPointer(e.clientX, e.clientY, laneId) || cell.dataset.colId;
            if (!laneId || !colId) return;

            if (cell.classList.contains("filled")) {
                const markerId = cell.dataset.markerId;
                if (!markerId) return;
                e.preventDefault();
                state.pointer = {
                    mode: "paint",
                    markerId,
                    laneId,
                    anchorColId: colId,
                    previewColId: colId,
                    startX: e.clientX,
                    startY: e.clientY,
                    active: false,
                };
                return;
            }

            if (cell.classList.contains("empty-cell")) {
                e.preventDefault();
                dismissCellSelection();
                state.pointer = {
                    mode: "paint",
                    laneId,
                    anchorColId: colId,
                    previewColId: colId,
                    startX: e.clientX,
                    startY: e.clientY,
                    active: false,
                };
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (state.noteDrag) {
                const d = state.noteDrag;
                const dx = e.clientX - d.startX;
                const dy = e.clientY - d.startY;
                if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
                    d.moved = true;
                    document.body.classList.add("plot-dragging");
                }
                if (d.moved) {
                    const pos = notePositionFromEvent(e);
                    const note = state.board.notes.find((n) => n.id === d.noteId);
                    if (note) {
                        note.x = pos.x;
                        note.y = pos.y;
                        const el = els.notesLayer.querySelector(`[data-note-id="${d.noteId}"]`);
                        if (el) {
                            el.style.left = `${pos.x * 100}%`;
                            el.style.top = `${pos.y * 100}%`;
                        }
                    }
                }
                return;
            }
            if (!state.pointer) return;
            const p = state.pointer;
            const dx = e.clientX - p.startX;
            const dy = e.clientY - p.startY;
            if (!p.active && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
                p.active = true;
                p.previewColor = dragPreviewColor(p);
                document.body.classList.add("plot-dragging");
                dismissCellSelection();
            }
            if (!p.active) return;
            const colId = colIdFromPointer(e.clientX, e.clientY, p.laneId);
            if (colId) {
                p.previewColId = colId;
                p.previewColor = dragPreviewColor(p);
                R.updateDragHighlight(els.gridRoot, state.board, p);
            }
        });

        document.addEventListener("mouseup", (e) => {
            if (state.noteDrag) {
                const d = state.noteDrag;
                state.noteDrag = null;
                document.body.classList.remove("plot-dragging");
                if (d.moved) {
                    state.suppressNoteClick = true;
                    scheduleSave();
                    renderBoardOnly();
                }
                return;
            }
            if (!state.pointer) return;
            const p = state.pointer;
            state.pointer = null;
            document.body.classList.remove("plot-dragging");
            R.clearDragHighlight(els.gridRoot);

            if (isCellPopupTarget(e.target) || els.notePopup.contains(e.target)) {
                return;
            }

            if (!p.active && p.mode === "paint") {
                if (state.lastColor === M.PAINT_ERASER) {
                    pushUndo();
                    const ok = paintMarkerRange(p.laneId, p.anchorColId, p.anchorColId);
                    if (ok) {
                        scheduleSave();
                        renderBoardOnly();
                    } else {
                        undoStack.pop();
                        updateUndoBtn();
                    }
                } else if (p.markerId) {
                    handleFilledCellTap(p.markerId, e);
                }
                return;
            }

            if (p.active && p.previewColId) {
                pushUndo();
                let ok = false;
                if (p.mode === "paint") {
                    ok = paintMarkerRange(p.laneId, p.anchorColId, p.previewColId);
                    state.suppressEmptyClick = true;
                }
                if (ok) {
                    scheduleSave();
                    renderBoardOnly();
                } else {
                    undoStack.pop();
                    updateUndoBtn();
                }
                return;
            }
        });

        els.boardCanvas.addEventListener("contextmenu", (e) => {
            const filled = e.target.closest(".grid-cell.filled");
            if (filled?.dataset.markerId) {
                e.preventDefault();
                openCellPopup(filled.dataset.markerId);
                return;
            }
            if (e.target.closest(".float-note")) return;
            if (!isEmptyBoardArea(e.target)) return;
            e.preventDefault();
            const pos = notePositionFromEvent(e);
            openNoteDraftPopup(pos.x, pos.y);
        });
    }

    async function deleteCurrentBoard() {
        const boards = await S.listBoards();
        if (boards.length <= 1) {
            alert("シートは最低1枚必要です。");
            return;
        }
        if (!confirm(`シート「${state.board.title}」を削除しますか？`)) return;
        const deletingId = state.board.id;
        dismissAll();
        await S.deleteBoard(deletingId);
        const remaining = await S.listBoards();
        if (!remaining.length) return;
        const next = remaining.sort((a, b) => b.savedAt - a.savedAt)[0];
        await loadBoard(next.id);
    }

    function initPopups() {
        els.cellPopupClose.addEventListener("click", () => dismissCellSelection());

        els.boardCanvas.addEventListener(
            "mousedown",
            (e) => {
                if (els.cellPopup.hidden) return;
                if (isCellPopupTarget(e.target)) return;
                if (e.target.closest(".grid-cell.filled")) return;
                dismissCellSelection();
            },
            true
        );

        els.cellPopupTags.addEventListener("click", () => {
            const m = state.board.markers.find((x) => x.id === state.cellEditingId);
            if (!m) return;
            const raw = prompt("タグ（スペース区切り）", m.tags.join(" "));
            if (raw == null) return;
            patchMarker(m.id, { tags: M.parseTagsInput(raw) });
        });

        els.cellPopupDelete.addEventListener("click", () => {
            if (state.cellEditingId) deleteMarker(state.cellEditingId);
        });

        els.cellPopupText.addEventListener("input", () => {
            const id = state.cellEditingId;
            if (!id) return;
            const m = state.board.markers.find((x) => x.id === id);
            if (!m) return;
            m.comment = els.cellPopupText.value;
            clearTimeout(state.cellSaveTimer);
            state.cellSaveTimer = setTimeout(() => {
                R.updateCommentDisplay(els.gridRoot, state.board, id);
                scheduleSave();
            }, 400);
        });

        els.notePopupClose.addEventListener("click", () => dismissNoteSelection());

        els.notePopupText.addEventListener("input", () => {
            if (state.noteDraft) {
                state.noteDraft.text = els.notePopupText.value;
                updateNoteDraftPreview();
                return;
            }
            const id = state.noteEditingId;
            if (!id) return;
            const n = state.board.notes.find((x) => x.id === id);
            if (!n) return;
            n.text = els.notePopupText.value;
            clearTimeout(state.noteSaveTimer);
            state.noteSaveTimer = setTimeout(() => {
                const el = els.notesLayer.querySelector(`[data-note-id="${id}"] .float-note-body`);
                if (el) el.textContent = n.text.trim() || "（メモ）";
                scheduleSave();
            }, 400);
        });

        els.notePopupDelete.addEventListener("click", () => {
            if (state.noteEditingId) buildNoteHandlers().onNoteDelete(state.noteEditingId);
        });

        els.notePopupOk.addEventListener("click", () => {
            if (state.noteDraft) confirmNoteDraft();
            else dismissNoteSelection();
        });
        els.notePopupCancel.addEventListener("click", () => dismissNoteDraft());

        els.addNoteBtn.addEventListener("click", () => addNoteAtCenter());

        els.boardCanvas.addEventListener("dblclick", (e) => {
            if (
                e.target.closest(".grid-cell") ||
                e.target.closest(".float-note") ||
                e.target.closest("button")
            ) {
                return;
            }
            const pos = notePositionFromEvent(e);
            openNoteDraftPopup(pos.x, pos.y);
        });

        document.addEventListener("mousedown", (e) => {
            if (els.notePopup.contains(e.target)) return;
            if (els.cellPopup.contains(e.target)) return;
            if (e.target.closest(".float-note:not(.draft)")) return;
            if (e.target.closest(".float-note.draft .float-note-delete")) return;
            if (!els.cellPopup.hidden) dismissCellSelection();
            if (!els.notePopup.hidden) dismissNoteSelection();
        });

        document.querySelector(".app-header")?.addEventListener("mousedown", (e) => {
            if (e.target.closest(".edit-popup")) return;
            if (!els.cellPopup.hidden || !els.notePopup.hidden) dismissAll();
        });

        document.querySelector(".filter-bar")?.addEventListener("mousedown", () => {
            if (!els.cellPopup.hidden || !els.notePopup.hidden) dismissAll();
        });
    }

    async function loadBoard(id) {
        const boards = await S.listBoards();
        const board = boards.find((b) => b.id === id);
        if (!board) return;
        state.suppressSave = true;
        state.board = M.normalizeBoard(board);
        state.boards = boards;
        dismissAll();
        state.pointer = null;
        state.noteDrag = null;
        document.body.classList.remove("plot-dragging");
        await S.setActiveId(id);
        state.suppressSave = false;
        clearUndo();
        refreshBoardSelect();
        updateSavedLabel();
        fullRender();
    }

    async function init() {
        const { board, boards } = await S.ensureActiveBoard();
        state.board = board;
        state.boards = boards;
        refreshBoardSelect();
        updateSavedLabel();
        fullRender();
        initGridInteraction();
        initPopups();

        els.boardSelect.addEventListener("change", () => loadBoard(els.boardSelect.value));

        document.getElementById("newBoardBtn").addEventListener("click", async () => {
            const title = prompt("シート名", "新しいシート");
            if (title == null) return;
            const created = await S.createBoard(title);
            state.boards = await S.listBoards();
            await loadBoard(created.id);
        });

        document.getElementById("renameBoardBtn").addEventListener("click", async () => {
            const title = prompt("シート名", state.board.title);
            if (title == null) return;
            state.board.title = title.trim() || state.board.title;
            scheduleSave();
            state.boards = await S.listBoards();
            refreshBoardSelect();
        });

        document.getElementById("deleteBoardBtn").addEventListener("click", () => {
            deleteCurrentBoard();
        });

        els.undoBtn.addEventListener("click", () => performUndo());

        document.getElementById("exportBtn").addEventListener("click", () => {
            const data = M.boardToExport(state.board);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            const safe = (state.board.title || "board").replace(/[^\w\u3040-\u30ff\u4e00-\u9fff.-]+/g, "_");
            a.href = URL.createObjectURL(blob);
            a.download = `plot-board-${safe}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        });

        els.importInput.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const baseTitle = (data.title && String(data.title).trim()) || "インポート";
                const title = await S.uniqueTitle(baseTitle);
                const board = await S.importBoard(data, title);
                state.boards = await S.listBoards();
                await loadBoard(board.id);
            } catch (err) {
                alert("インポートに失敗しました: " + err.message);
            }
        });

        document.getElementById("importBtn").addEventListener("click", () => els.importInput.click());

        window.addEventListener("resize", () => {
            repositionCellPopup();
            repositionNotePopup();
        });

        els.boardCanvas.addEventListener("scroll", () => {
            repositionCellPopup();
            repositionNotePopup();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                state.pointer = null;
                state.noteDrag = null;
                document.body.classList.remove("plot-dragging");
                R.clearDragHighlight(els.gridRoot);
                dismissAll();
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
                const tag = e.target?.tagName;
                if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
                e.preventDefault();
                performUndo();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
