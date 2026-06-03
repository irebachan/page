/**
 * グリッド描画（table + colspan、セル塗りつぶし）
 */
(function (global) {
    const M = () => global.PlotBoardModel;

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function applyFillClasses(td, marker, selectedId) {
        td.classList.add("filled");
        td.classList.add(`fill-${marker.color}`);
        if (marker.shape === "dot") td.classList.add("shape-dot");
        if (marker.id === selectedId) td.classList.add("selected");
        td.dataset.markerId = marker.id;
        td.title = ["クリックで色変更", "右クリックで詳細", "ドラッグで範囲を塗る/変更"].join("\n");
        if (marker.comment) td.title += "\n" + marker.comment;
    }

    function appendCommentDisplay(td, comment, spanCols) {
        const text = String(comment || "").trim();
        if (!text) return;
        td.classList.add("has-comment");
        const wrap = document.createElement("div");
        wrap.className = "cell-comment-text";
        wrap.textContent = text;
        wrap.title = text;
        if (spanCols > 1) wrap.classList.add("span-wide");
        td.appendChild(wrap);
    }

    function buildColumnHeaderRow(board, handlers) {
        const cols = M().getSortedColumns(board);
        const tr = document.createElement("tr");
        tr.className = "row-header";

        const corner = document.createElement("th");
        corner.className = "corner-cell sticky-col";
        corner.textContent = "";
        tr.appendChild(corner);

        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (i > 0) {
                const insertTh = document.createElement("th");
                insertTh.className = "col-insert-cell";
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "col-insert-btn";
                btn.title = "ここに列を挿入";
                btn.textContent = "+";
                btn.dataset.colId = col.id;
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    handlers.onInsertColumnBefore(col.id);
                });
                insertTh.appendChild(btn);
                tr.appendChild(insertTh);
            }

            const th = document.createElement("th");
            th.className = "col-header data-col";
            th.dataset.colId = col.id;

            const labelBtn = document.createElement("button");
            labelBtn.type = "button";
            labelBtn.className = "col-label-btn";
            labelBtn.textContent = col.label;
            labelBtn.title = "クリックで名前変更";
            labelBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                handlers.onRenameColumn(col.id, col.label);
            });
            th.appendChild(labelBtn);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "col-del-btn";
            delBtn.textContent = "×";
            delBtn.title = "列を削除";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                handlers.onDeleteColumn(col.id);
            });
            th.appendChild(delBtn);

            tr.appendChild(th);
        }

        const tailInsert = document.createElement("th");
        tailInsert.className = "col-insert-cell col-insert-tail";
        const tailBtn = document.createElement("button");
        tailBtn.type = "button";
        tailBtn.className = "col-insert-btn";
        tailBtn.title = "末尾に列を追加";
        tailBtn.textContent = "+";
        tailBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            handlers.onInsertColumnEnd();
        });
        tailInsert.appendChild(tailBtn);
        tr.appendChild(tailInsert);

        return tr;
    }

    function markersForLane(board, laneId, activeTags) {
        const markers = board.markers.filter((m) => m.laneId === laneId);
        return markers
            .filter((m) => M().markerVisibleWithFilter(m, activeTags))
            .sort((a, b) => {
                const ra = M().markerRange(a, board);
                const rb = M().markerRange(b, board);
                return (ra?.startIdx ?? 0) - (rb?.startIdx ?? 0);
            });
    }

    function buildLaneRow(board, lane, activeTags, handlers, uiState) {
        const cols = M().getSortedColumns(board);
        const tr = document.createElement("tr");
        tr.className = "lane-row";
        tr.dataset.laneId = lane.id;

        const laneTh = document.createElement("th");
        laneTh.className = "lane-header sticky-col";

        const inner = document.createElement("div");
        inner.className = "lane-header-inner";

        const actions = document.createElement("div");
        actions.className = "lane-header-actions";

        const laneEdit = document.createElement("button");
        laneEdit.type = "button";
        laneEdit.className = "lane-edit-btn";
        laneEdit.textContent = "#";
        laneEdit.title = "レーンのタグ";
        laneEdit.addEventListener("click", (e) => {
            e.stopPropagation();
            handlers.onEditLaneTags(lane.id, lane.tags);
        });
        actions.appendChild(laneEdit);

        const laneDel = document.createElement("button");
        laneDel.type = "button";
        laneDel.className = "lane-del-btn";
        laneDel.textContent = "×";
        laneDel.title = "レーンを削除";
        laneDel.addEventListener("click", (e) => {
            e.stopPropagation();
            handlers.onDeleteLane(lane.id);
        });
        actions.appendChild(laneDel);

        inner.appendChild(actions);

        const main = document.createElement("div");
        main.className = "lane-header-main";

        const laneLabel = document.createElement("button");
        laneLabel.type = "button";
        laneLabel.className = "lane-label-btn";
        laneLabel.textContent = lane.label;
        laneLabel.addEventListener("click", () => handlers.onRenameLane(lane.id, lane.label));
        main.appendChild(laneLabel);

        if (lane.tags.length) {
            const tagSpan = document.createElement("span");
            tagSpan.className = "lane-tags-inline";
            tagSpan.textContent = lane.tags.join(" ");
            main.appendChild(tagSpan);
        }

        inner.appendChild(main);
        laneTh.appendChild(inner);
        tr.appendChild(laneTh);

        const visibleMarkers = markersForLane(board, lane.id, activeTags);
        const covered = new Set();
        const selectedId = uiState.selectedMarkerId;

        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (covered.has(col.id)) continue;

            if (i > 0) {
                const gap = document.createElement("td");
                gap.className = "col-gap";
                tr.appendChild(gap);
            }

            const marker = visibleMarkers.find((m) => {
                const r = M().markerRange(m, board);
                return r && r.startIdx === i;
            });

            const td = document.createElement("td");
            td.className = "grid-cell data-col";
            td.dataset.laneId = lane.id;
            td.dataset.colId = col.id;

            if (marker) {
                const r = M().markerRange(marker, board);
                const span = r ? r.endIdx - r.startIdx + 1 : 1;
                if (span > 1) td.colSpan = span * 2 - 1;
                for (let j = r.startIdx; j <= r.endIdx; j++) {
                    covered.add(cols[j].id);
                }
                applyFillClasses(td, marker, selectedId);
                appendCommentDisplay(td, marker.comment, span);

                if (marker.id === uiState.cellEditingId) {
                    td.classList.add("editing");
                    const delBtn = document.createElement("button");
                    delBtn.type = "button";
                    delBtn.className = "cell-delete-btn";
                    delBtn.title = "削除";
                    delBtn.textContent = "×";
                    delBtn.addEventListener("mousedown", (e) => e.stopPropagation());
                    delBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        handlers.onDeleteMarker(marker.id);
                    });
                    td.appendChild(delBtn);
                }
            } else {
                td.classList.add("empty-cell");
                td.addEventListener("click", () => handlers.onEmptyCellClick(lane.id, col.id));
            }

            tr.appendChild(td);
        }

        const tail = document.createElement("td");
        tail.className = "col-gap tail-gap";
        tr.appendChild(tail);

        return tr;
    }

    function buildLaneAddRow(board, handlers) {
        const cols = M().getSortedColumns(board);
        const tr = document.createElement("tr");
        tr.className = "lane-add-row";

        const th = document.createElement("th");
        th.className = "lane-header sticky-col lane-add-cell";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lane-add-btn";
        btn.title = "レーンを追加";
        btn.textContent = "+";
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            handlers.onAddLane();
        });
        th.appendChild(btn);
        tr.appendChild(th);

        const spacer = document.createElement("td");
        spacer.colSpan = Math.max(1, cols.length * 2);
        spacer.className = "lane-add-spacer";
        tr.appendChild(spacer);

        return tr;
    }

    function renderFilterTags(container, allTags, activeTags, onToggle) {
        container.innerHTML = "";
        if (!allTags.length) {
            container.textContent = "（タグなし）";
            return;
        }
        for (const tag of allTags) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "filter-chip";
            if (activeTags.has(tag)) chip.classList.add("active");
            chip.textContent = tag;
            chip.addEventListener("click", () => onToggle(tag));
            container.appendChild(chip);
        }
    }

    function renderBoardSelect(selectEl, boards, activeId) {
        selectEl.innerHTML = "";
        const sorted = [...boards].sort((a, b) => b.savedAt - a.savedAt);
        for (const b of sorted) {
            const opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = b.title;
            if (b.id === activeId) opt.selected = true;
            selectEl.appendChild(opt);
        }
    }

    function renderColorSwatches(container, activeColor, onPick) {
        container.innerHTML = "";
        for (const c of M().COLORS) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `color-swatch color-${c}${activeColor === c ? " active" : ""}`;
            btn.title = c;
            btn.addEventListener("click", () => onPick(c));
            container.appendChild(btn);
        }
    }

    function renderPaintColors(container, activeColor, onPick) {
        renderColorSwatches(container, activeColor, onPick);
        const eraser = document.createElement("button");
        eraser.type = "button";
        eraser.className = `color-swatch color-clear${activeColor === M().PAINT_ERASER ? " active" : ""}`;
        eraser.title = "消す（塗りを削除）";
        eraser.setAttribute("aria-label", "消す");
        eraser.addEventListener("click", () => onPick(M().PAINT_ERASER));
        container.appendChild(eraser);
    }

    function renderGrid(rootEl, board, state, handlers) {
        rootEl.innerHTML = "";
        const table = document.createElement("table");
        table.className = "plot-grid";

        const thead = document.createElement("thead");
        thead.appendChild(buildColumnHeaderRow(board, handlers));
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const lanes = M().getSortedLanes(board);
        const uiState = {
            selectedMarkerId: state.selectedMarkerId,
            cellEditingId: state.cellEditingId,
        };
        for (const lane of lanes) {
            if (!M().laneVisibleWithFilter(board, lane, state.activeTags)) continue;
            tbody.appendChild(buildLaneRow(board, lane, state.activeTags, handlers, uiState));
        }
        tbody.appendChild(buildLaneAddRow(board, handlers));
        table.appendChild(tbody);
        rootEl.appendChild(table);
    }

    function updateCommentDisplay(rootEl, board, markerId) {
        const marker = board.markers.find((m) => m.id === markerId);
        const cell = rootEl.querySelector(`.grid-cell[data-marker-id="${markerId}"]`);
        if (!cell || !marker) return;
        const old = cell.querySelector(".cell-comment-text");
        if (old) old.remove();
        cell.classList.remove("has-comment");
        cell.style.minHeight = "";
        if (marker.comment?.trim()) {
            const r = M().markerRange(marker, board);
            const spanCols = r ? r.endIdx - r.startIdx + 1 : 1;
            appendCommentDisplay(cell, marker.comment, spanCols);
        }
        cell.title = marker.comment?.trim()
            ? ["クリックで色変更", "右クリックで詳細", "ドラッグで範囲を塗る", marker.comment].join("\n")
            : "クリックで色変更\n右クリックで詳細\nドラッグで範囲を塗る";
    }

    function renderFloatNotes(layerEl, board, uiState, handlers) {
        layerEl.innerHTML = "";
        const notes = board.notes || [];
        for (const note of notes) {
            const el = document.createElement("div");
            el.className = `float-note color-${note.color}`;
            if (note.id === uiState.selectedNoteId) el.classList.add("selected");
            el.dataset.noteId = note.id;
            el.style.left = `${note.x * 100}%`;
            el.style.top = `${note.y * 100}%`;

            const body = document.createElement("div");
            body.className = "float-note-body";
            body.textContent = note.text.trim() || "（メモ）";
            el.appendChild(body);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "float-note-delete";
            delBtn.title = "削除";
            delBtn.textContent = "×";
            delBtn.addEventListener("mousedown", (e) => e.stopPropagation());
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                handlers.onNoteDelete(note.id);
            });
            el.appendChild(delBtn);

            el.title = "ドラッグで移動　右クリックで詳細";
            el.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest(".float-note-delete")) return;
                e.stopPropagation();
                handlers.onNoteDragStart(note.id, e);
            });
            el.addEventListener("click", (e) => {
                if (e.target.closest(".float-note-delete")) return;
                e.stopPropagation();
                handlers.onNoteSelect(note.id);
            });
            el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                handlers.onNoteOpenDetail(note.id);
            });

            layerEl.appendChild(el);
        }

        if (uiState.noteDraft) {
            const draft = uiState.noteDraft;
            const el = document.createElement("div");
            el.className = `float-note color-${draft.color} draft selected`;
            el.style.left = `${draft.x * 100}%`;
            el.style.top = `${draft.y * 100}%`;

            const body = document.createElement("div");
            body.className = "float-note-body";
            body.textContent = draft.text.trim() || "（メモ）";
            el.appendChild(body);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "float-note-delete";
            delBtn.title = "キャンセル";
            delBtn.textContent = "×";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                handlers.onNoteDraftCancel();
            });
            el.appendChild(delBtn);

            layerEl.appendChild(el);
        }
    }

    function syncBoardInnerSize(innerEl, gridEl) {
        const table = gridEl.querySelector(".plot-grid");
        if (!table) return;
        innerEl.style.minWidth = `${table.offsetWidth}px`;
        innerEl.style.minHeight = `${Math.max(table.offsetHeight, 320)}px`;
    }

    function clearDragHighlight(rootEl) {
        rootEl.querySelectorAll(".drag-highlight").forEach((el) => {
            el.classList.remove("drag-highlight");
            [...el.classList].forEach((c) => {
                if (c.startsWith("drag-preview-")) el.classList.remove(c);
            });
            el.style.removeProperty("--drag-clip-left");
            el.style.removeProperty("--drag-clip-width");
        });
    }

    function updateDragHighlight(rootEl, board, drag) {
        clearDragHighlight(rootEl);
        if (!drag?.active || !drag?.laneId) return;
        const cols = M().getSortedColumns(board);
        const ai = cols.findIndex((c) => c.id === drag.anchorColId);
        const bi = cols.findIndex((c) => c.id === (drag.previewColId || drag.anchorColId));
        if (ai < 0 || bi < 0) return;
        const lo = Math.min(ai, bi);
        const hi = Math.max(ai, bi);
        const preview =
            drag.previewColor === M().PAINT_ERASER ? "erase" : drag.previewColor || "coral";
        const laneCells = rootEl.querySelectorAll(`.grid-cell[data-lane-id="${drag.laneId}"]`);
        laneCells.forEach((cell) => {
            const idx = cols.findIndex((c) => c.id === cell.dataset.colId);
            if (idx < 0) return;
            const spanCols = cell.colSpan && cell.colSpan > 1 ? (cell.colSpan + 1) / 2 : 1;
            const endIdx = idx + spanCols - 1;
            const overlapLo = Math.max(idx, lo);
            const overlapHi = Math.min(endIdx, hi);
            if (overlapLo > overlapHi) return;

            const clipLeft = ((overlapLo - idx) / spanCols) * 100;
            const clipWidth = ((overlapHi - overlapLo + 1) / spanCols) * 100;
            cell.classList.add("drag-highlight", `drag-preview-${preview}`);
            cell.style.setProperty("--drag-clip-left", `${clipLeft}%`);
            cell.style.setProperty("--drag-clip-width", `${clipWidth}%`);
        });
    }

    global.PlotBoardRender = {
        renderGrid,
        renderFilterTags,
        renderBoardSelect,
        renderColorSwatches,
        renderPaintColors,
        updateCommentDisplay,
        renderFloatNotes,
        syncBoardInnerSize,
        updateDragHighlight,
        clearDragHighlight,
    };
})(typeof window !== "undefined" ? window : globalThis);
