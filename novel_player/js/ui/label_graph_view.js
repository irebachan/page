/**
 * ラベル接続の SVG ノードグラフ（dagre で縦レイアウト、パン・ズーム）
 */
class LabelGraphView {
    constructor(container, options = {}) {
        this.container = container;
        this.onNodeClick = options.onNodeClick || null;
        this.onNodeDoubleClick = options.onNodeDoubleClick || null;
        this.onIfBranchClick = options.onIfBranchClick || null;
        this._nodeClickTimer = null;
        this._lastNodeTap = null;
        /** タッチのシングル待ち（ダブル判別のため） */
        this._nodeClickDelayMs = 300;
        /** タッチのダブルタップ: この間隔未満はバウンス、超えたら別操作 */
        this._doubleTapMinMs = 120;
        this._doubleTapMaxMs = 500;
        this._doubleTapSlopPx = 40;
        /** パン・ピンチ直後の dblclick で閉じない */
        this._suppressGraphDblClickUntil = 0;
        this.onConnect = options.onConnect || null;
        this.onConnectCall = options.onConnectCall || null;
        this.onConnectChoice = options.onConnectChoice || null;
        this.onAddExit = options.onAddExit || null;
        this.onRemoveEdge = options.onRemoveEdge || null;
        this.onAddLabel = options.onAddLabel || null;
        this.onRenameLabel = options.onRenameLabel || null;
        this.onDeleteLabel = options.onDeleteLabel || null;
        this.onUndo = options.onUndo || null;
        this.canUndo = options.canUndo || null;
        this.data = null;
        this.state = { filter: "", currentLabel: null };
        this.layout = null;
        this.transform = { x: 0, y: 0, k: 1 };
        /** パン・ズーム・「全体」でユーザーが見え方を決めたら true（再オープン時も維持） */
        this._viewCustomized = false;
        this._panning = false;
        this._panStart = null;
        this._needsFit = false;
        this._fitRaf = 0;
        /** null | goto | call | end | return */
        this._commandMode = null;
        this._connectFrom = null;
        this._linkDragFrom = null;
        this._linkDragEdge = null;
        this._linkDragMoved = false;
        this._dragLine = null;
        this._nodeCenters = new Map();
        this._suppressNextNodeClick = false;
        this._nodePointerDown = null;
        this._pendingEdgeAction = null;
        /** これ未満の移動はクリック（削除）、超えたらドラッグ（付け替え） */
        this._edgeDragSlopPx = 14;
        /** 2本指ピンチ（スマホ・タッチパネル） */
        this._touchPointers = new Map();
        this._pinchStart = null;

        container.innerHTML = "";
        container.classList.add("label-graph-view");
        if (!window.matchMedia("(max-width: 640px)").matches) {
            container.classList.add("is-float-expanded");
        }

        this.toolbar = document.createElement("div");
        this.toolbar.className = "label-graph-toolbar";
        this.toolbar.innerHTML = `
            <button type="button" data-action="zoom-in" aria-label="拡大">＋</button>
            <button type="button" data-action="zoom-out" aria-label="縮小">－</button>
            <button type="button" data-action="fit" aria-label="全体を表示">全体</button>
            <span class="label-graph-toolbar__sep" aria-hidden="true"></span>
            <span class="label-graph-toolbar__group" role="group" aria-label="ラベル">
                <button type="button" data-action="label-add" aria-label="脚本末尾にラベルを追加">＋ラベル</button>
                <button type="button" data-action="cmd-rename" aria-label="ラベルをタップして改名">改名</button>
                <button type="button" data-action="cmd-delete" aria-label="ラベルをタップして削除">削除</button>
            </span>
            <span class="label-graph-toolbar__sep" aria-hidden="true"></span>
            <span class="label-graph-toolbar__group" role="group" aria-label="接続">
                <button type="button" data-action="cmd-goto" aria-label="2つのラベルをタップして goto">goto</button>
                <button type="button" data-action="cmd-call" aria-label="2つのラベルをタップして call">call</button>
                <button type="button" data-action="cmd-end" aria-label="ラベルをタップして end">end</button>
                <button type="button" data-action="cmd-return" aria-label="ラベルをタップして return">return</button>
            </span>
            <span class="label-graph-toolbar__sep" aria-hidden="true"></span>
            <button type="button" data-action="undo" aria-label="直前のグラフ操作を戻す" disabled>戻す</button>
        `;
        this.cmdBtns = {
            goto: this.toolbar.querySelector('[data-action="cmd-goto"]'),
            call: this.toolbar.querySelector('[data-action="cmd-call"]'),
            end: this.toolbar.querySelector('[data-action="cmd-end"]'),
            return: this.toolbar.querySelector('[data-action="cmd-return"]'),
            rename: this.toolbar.querySelector('[data-action="cmd-rename"]'),
            delete: this.toolbar.querySelector('[data-action="cmd-delete"]'),
        };
        this.undoBtn = this.toolbar.querySelector('[data-action="undo"]');

        this.statusEl = document.createElement("p");
        this.statusEl.className = "label-graph-status";
        this.statusEl.setAttribute("aria-live", "polite");
        this.statusEl.hidden = true;

        this.viewport = document.createElement("div");
        this.viewport.className = "label-graph-viewport";
        this.viewport.setAttribute("tabindex", "-1");
        container.appendChild(this.viewport);

        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("class", "label-graph-svg");
        this.svg.setAttribute("aria-hidden", "true");
        this.viewport.appendChild(this.svg);

        this.gRoot = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.gEdges = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.gEdges.setAttribute("class", "label-graph-edges");
        this.gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.gNodes.setAttribute("class", "label-graph-nodes");
        this.gRoot.appendChild(this.gEdges);
        this.gRoot.appendChild(this.gNodes);
        this.svg.appendChild(this.gRoot);
        this.ensureArrowMarker();

        this.emptyEl = document.createElement("p");
        this.emptyEl.className = "label-graph-empty";
        this.emptyEl.hidden = true;
        container.appendChild(this.emptyEl);

        this.missingLibEl = document.createElement("p");
        this.missingLibEl.className = "label-graph-missing-lib";
        this.missingLibEl.hidden = true;
        this.missingLibEl.textContent =
            "グラフレイアウト用ライブラリが未配置です。README の手順で dagre を取得してください。";
        container.appendChild(this.missingLibEl);

        this.floatUI = document.createElement("div");
        this.floatUI.className = "label-graph-float-ui";
        this.floatToggle = document.createElement("button");
        this.floatToggle.type = "button";
        this.floatToggle.className = "label-graph-float-toggle";
        this.floatToggle.setAttribute("aria-label", "ツールバー");
        this.floatToggle.setAttribute("aria-expanded", "false");
        this.floatToggle.textContent = "⚙";
        this.floatTools = document.createElement("div");
        this.floatTools.className = "label-graph-float-ui__tools";
        this.floatTools.appendChild(this.toolbar);
        this.floatUI.appendChild(this.floatToggle);
        this.floatUI.appendChild(this.floatTools);
        this.floatUI.appendChild(this.statusEl);
        container.appendChild(this.floatUI);

        this.syncFloatUI();
        this.floatToggle.addEventListener("click", () => {
            container.classList.toggle("is-float-expanded");
            this.syncFloatUI();
        });

        this.toolbar.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            if (action === "zoom-in") this.zoomBy(1.2);
            else if (action === "zoom-out") this.zoomBy(1 / 1.2);
            else if (action === "fit") this.fitToContent(null, { user: true });
            else if (action === "label-add") this.onAddLabel?.();
            else if (action === "cmd-goto") this.setCommandMode("goto");
            else if (action === "cmd-call") this.setCommandMode("call");
            else if (action === "cmd-end") this.setCommandMode("end");
            else if (action === "cmd-return") this.setCommandMode("return");
            else if (action === "cmd-rename") this.setCommandMode("rename");
            else if (action === "cmd-delete") this.setCommandMode("delete");
            else if (action === "undo") this.onUndo?.();
            this.updateUndoButton();
        });

        this.viewport.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        this.viewport.addEventListener("pointerdown", (e) => this.onPointerDown(e));
        this.viewport.addEventListener("pointermove", (e) => this.onPointerMove(e));
        this.viewport.addEventListener("pointerup", (e) => this.onPointerUp(e));
        this.viewport.addEventListener("pointercancel", (e) => this.onPointerUp(e));
        this.viewport.addEventListener("keydown", (e) => this.onKeyDown(e));

        const pinchOpts = { capture: true, passive: false };
        this.container.addEventListener(
            "pointerdown",
            (e) => this.onContainerPointerDown(e),
            pinchOpts
        );
        this.container.addEventListener(
            "pointermove",
            (e) => this.onContainerPointerMove(e),
            pinchOpts
        );
        this.container.addEventListener(
            "pointerup",
            (e) => this.onContainerPointerUp(e),
            pinchOpts
        );
        this.container.addEventListener(
            "pointercancel",
            (e) => this.onContainerPointerUp(e),
            pinchOpts
        );
    }

    setCommandMode(mode) {
        this._commandMode = this._commandMode === mode ? null : mode;
        this._connectFrom = null;
        this.clearConnectHighlight();
        this.updateCommandModeUI();
    }

    clearCommandMode() {
        this._commandMode = null;
        this._connectFrom = null;
        this.clearConnectHighlight();
        this.updateCommandModeUI();
    }

    commandModeHint() {
        const m = this._commandMode;
        const cancel = "（同じボタンか Esc でやめる）";
        if (!m) return "";
        if (m === "end") return `選択中: @end → ラベルを1つタップ ${cancel}`;
        if (m === "return") return `選択中: @return → ラベルを1つタップ ${cancel}`;
        if (m === "rename") return `選択中: 改名 → ラベルを1つタップ ${cancel}`;
        if (m === "delete") return `選択中: 削除 → ラベルを1つタップ（確認あり） ${cancel}`;
        if (m === "goto") {
            if (this._connectFrom) {
                return `選択中: @goto → 行き先をタップ（起点: ${this._connectFrom}） ${cancel}`;
            }
            return `選択中: @goto → 起点ラベルをタップ（既存は差し替え） ${cancel}`;
        }
        if (m === "call") {
            if (this._connectFrom) {
                return `選択中: @call → 行き先をタップ（起点: ${this._connectFrom}・都度1行追加） ${cancel}`;
            }
            return `選択中: @call → 起点ラベルをタップ（都度1行追加） ${cancel}`;
        }
        return "";
    }

    updateCommandModeUI() {
        const m = this._commandMode;
        for (const [key, btn] of Object.entries(this.cmdBtns)) {
            const on = m === key;
            btn?.classList.toggle("is-active", on);
            btn?.setAttribute("aria-pressed", on ? "true" : "false");
        }
        if (this.statusEl) {
            this.statusEl.textContent = this.commandModeHint();
        }
        if (m) {
            this.container.classList.add("is-float-expanded");
        }
        this.syncFloatUI();
        const twoStep = m === "goto" || m === "call";
        this.viewport.classList.toggle("is-connect-mode", twoStep);
        this.viewport.classList.toggle(
            "is-exit-mode",
            m === "end" || m === "return" || m === "rename" || m === "delete"
        );
        this.viewport.classList.toggle("is-tool-mode", !!m);
    }

    onKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
            e.preventDefault();
            if (this.onUndo?.()) this.updateUndoButton();
            return;
        }
        if (e.key === "Escape") {
            this.clearCommandMode();
            this.cancelLinkDrag();
            this._nodePointerDown = null;
            this._pendingEdgeAction = null;
        }
    }

    updateUndoButton() {
        if (!this.undoBtn) return;
        const ok = this.canUndo?.() ?? false;
        this.undoBtn.disabled = !ok;
    }

    syncFloatUI() {
        const expanded = this.container.classList.contains("is-float-expanded");
        this.floatToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        this.updateStatusVisibility();
    }

    updateStatusVisibility() {
        if (!this.statusEl) return;
        const show =
            !!this._commandMode &&
            this.container.classList.contains("is-float-expanded");
        this.statusEl.hidden = !show;
    }

    isRealTargetNode(name) {
        return name && !String(name).startsWith("__open__");
    }

    /** 線: クリックで削除（@goto/@call/選択肢）。未接続選択肢のみドラッグでつなぐ */
    bindEdgeInteractions(edge, hitEl, points) {
        if (edge.kind === "fallthrough") {
            hitEl.style.cursor = "default";
            return;
        }
        if (edge.kind === "if_rejoin") {
            hitEl.style.cursor = "default";
            return;
        }
        if (
            edge.kind === "if_inline" &&
            edge.bodyPreview &&
            this.onIfBranchClick
        ) {
            hitEl.style.cursor = "pointer";
            this.bindIfBranchTap(hitEl, edge);
            return;
        }
        if (edge.kind === "if_inline") {
            hitEl.style.cursor = "default";
            return;
        }

        const bindTapRemove = (el) => {
            let down = null;
            el.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                down = { x: e.clientX, y: e.clientY };
            });
            el.addEventListener("pointerup", (e) => {
                if (!down || e.button !== 0) return;
                e.stopPropagation();
                const dx = e.clientX - down.x;
                const dy = e.clientY - down.y;
                down = null;
                if (dx * dx + dy * dy > 28 * 28) return;
                if (this.onRemoveEdge) {
                    this.onRemoveEdge(edge);
                    this.updateUndoButton();
                }
            });
            el.addEventListener("pointercancel", () => {
                down = null;
            });
        };

        if (
            edge.kind === "exit" ||
            edge.kind === "goto" ||
            edge.kind === "call" ||
            (edge.kind === "choice" && !edge.disconnected)
        ) {
            hitEl.style.cursor = "pointer";
            bindTapRemove(hitEl);
            return;
        }

        if (edge.kind === "choice" && edge.disconnected) {
            hitEl.style.cursor = "pointer";
            bindTapRemove(hitEl);
            hitEl.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                this.cancelLinkDrag();
                this._pendingEdgeAction = {
                    edge,
                    points,
                    x: e.clientX,
                    y: e.clientY,
                    pointerId: e.pointerId,
                };
            });
        }
    }

    bindIfBranchTap(el, edge) {
        let down = null;
        el.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            if (e.button !== 0) return;
            down = { x: e.clientX, y: e.clientY };
        });
        el.addEventListener("pointerup", (e) => {
            if (!down || e.button !== 0) return;
            e.stopPropagation();
            const dx = e.clientX - down.x;
            const dy = e.clientY - down.y;
            down = null;
            if (dx * dx + dy * dy > 28 * 28) return;
            this.onIfBranchClick?.(edge);
        });
        el.addEventListener("pointercancel", () => {
            down = null;
        });
    }

    clearNodeClickTimer() {
        if (this._nodeClickTimer) {
            clearTimeout(this._nodeClickTimer);
            this._nodeClickTimer = null;
        }
    }

    clientToGraph(clientX, clientY) {
        const rect = this.viewport.getBoundingClientRect();
        const { x: tx, y: ty, k } = this.transform;
        return {
            x: (clientX - rect.left - tx) / k,
            y: (clientY - rect.top - ty) / k,
        };
    }

    handleCommandNodeClick(name) {
        if (!this.isRealTargetNode(name)) return;

        if (this._commandMode === "end" || this._commandMode === "return") {
            if (this.onAddExit) this.onAddExit(name, this._commandMode);
            this.updateUndoButton();
            this.clearCommandMode();
            return;
        }

        if (this._commandMode === "rename") {
            this.onRenameLabel?.(name);
            this.clearCommandMode();
            return;
        }

        if (this._commandMode === "delete") {
            this.onDeleteLabel?.(name);
            this.clearCommandMode();
            return;
        }

        if (this._commandMode !== "goto" && this._commandMode !== "call") return;

        const connectFn =
            this._commandMode === "call" ? this.onConnectCall : this.onConnect;
        if (!connectFn) return;

        if (!this._connectFrom) {
            this._connectFrom = name;
            this.highlightConnectFrom(name);
            this.updateCommandModeUI();
            return;
        }
        const from = this._connectFrom;
        this._connectFrom = null;
        this.clearConnectHighlight();
        if (from === name) {
            this.updateCommandModeUI();
            return;
        }
        connectFn(from, name);
        this.updateUndoButton();
        this.updateCommandModeUI();
    }

    highlightConnectFrom(name) {
        this.gNodes?.querySelectorAll(".label-graph-node").forEach((g) => {
            g.classList.toggle("is-link-source", g.getAttribute("data-name") === name);
        });
    }

    clearConnectHighlight() {
        this.gNodes?.querySelectorAll(".label-graph-node.is-link-source").forEach((g) => {
            g.classList.remove("is-link-source");
        });
    }

    startLinkDragFromEdge(edge, points, e) {
        this.cancelLinkDrag();
        this._linkDragEdge = edge;
        this._linkDragFrom = null;
        const pt = edgePathMidpoint(points);
        this._dragLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this._dragLine.setAttribute("class", "label-graph-drag-line");
        this._dragLine.setAttribute("x1", pt.x);
        this._dragLine.setAttribute("y1", pt.y);
        const p = this.clientToGraph(e.clientX, e.clientY);
        this._dragLine.setAttribute("x2", p.x);
        this._dragLine.setAttribute("y2", p.y);
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this.gEdges.appendChild(this._dragLine);
        this.viewport.setPointerCapture(e.pointerId);
    }

    startLinkDrag(fromName, e) {
        this.cancelLinkDrag();
        this._linkDragFrom = fromName;
        this._linkDragEdge = null;
        const center = this._nodeCenters.get(fromName);
        if (!center) return;
        this._dragLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this._dragLine.setAttribute("class", "label-graph-drag-line");
        this._dragLine.setAttribute("x1", center.x);
        this._dragLine.setAttribute("y1", center.y);
        const p = this.clientToGraph(e.clientX, e.clientY);
        this._dragLine.setAttribute("x2", p.x);
        this._dragLine.setAttribute("y2", p.y);
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this.gEdges.appendChild(this._dragLine);
        this.viewport.setPointerCapture(e.pointerId);
    }

    updateLinkDrag(e) {
        if (!this._dragLine) return;
        const p = this.clientToGraph(e.clientX, e.clientY);
        this._dragLine.setAttribute("x2", p.x);
        this._dragLine.setAttribute("y2", p.y);
    }

    cancelLinkDrag() {
        this._linkDragFrom = null;
        this._linkDragEdge = null;
        this._linkDragMoved = false;
        this._pendingEdgeAction = null;
        this._nodePointerDown = null;
        this._dragLine?.remove();
        this._dragLine = null;
    }

    finishLinkDrag(targetName) {
        const edge = this._linkDragEdge;
        const from = this._linkDragFrom;
        this.cancelLinkDrag();
        if (!targetName || !this.isRealTargetNode(targetName)) return;
        if (edge) {
            if (edge.kind === "choice" && this.onConnectChoice) {
                this.onConnectChoice(edge, targetName);
            }
            return;
        }
        if (!from || from === targetName) return;
        if (this._commandMode === "call" && this.onConnectCall) {
            this.onConnectCall(from, targetName);
        } else if (this.onConnect) {
            this.onConnect(from, targetName);
        }
        this.updateUndoButton();
    }

    render(data, state = {}) {
        this.data = data;
        this.state = {
            filter: (state.filter || "").trim().toLowerCase(),
            currentLabel: state.currentLabel ?? null,
        };
        if (state.fit) this._needsFit = true;
        else if (state.fitIfNeeded && !this._viewCustomized) this._needsFit = true;

        const nodes = data?.nodes || [];
        const edges = data?.edges || [];

        if (typeof dagre === "undefined" || typeof dagre.graphlib === "undefined") {
            this.missingLibEl.hidden = false;
            this.emptyEl.hidden = true;
            this.viewport.hidden = true;
            this.floatUI.hidden = true;
            if (this.statusEl) this.statusEl.hidden = true;
            return;
        }
        this.missingLibEl.hidden = true;
        this.floatUI.hidden = false;
        this.viewport.hidden = false;
        this.updateCommandModeUI();

        if (nodes.length === 0) {
            this.emptyEl.hidden = false;
            this.emptyEl.textContent = "（ラベルなし）";
            this.gEdges.replaceChildren();
            this.gNodes.replaceChildren();
            this.layout = null;
            return;
        }

        if (this.state.filter) {
            const any = nodes.some((n) =>
                n.name.toLowerCase().includes(this.state.filter)
            );
            if (!any) {
                this.emptyEl.hidden = false;
                this.emptyEl.textContent = "（該当なし）";
                this.gEdges.replaceChildren();
                this.gNodes.replaceChildren();
                this.layout = null;
                return;
            }
        }

        this.emptyEl.hidden = true;
        this.layout = layoutLabelGraphWithDagre(nodes, edges);
        if (!this.layout) {
            this.emptyEl.hidden = false;
            this.emptyEl.textContent = "（レイアウトできません）";
            return;
        }

        this.drawGraph();
        this.updateUndoButton();
        if (this._needsFit) {
            this.scheduleFitToContent(this.state.currentLabel);
        }
        this.applyTransform();
    }

    setCurrentLabel(name) {
        const prev = this.state.currentLabel;
        if (prev === name) {
            const cur = this.gNodes?.querySelector(
                ".label-graph-node.is-current"
            );
            if ((cur?.getAttribute("data-name") ?? null) === name) return;
        }
        this.state.currentLabel = name;
        if (!this.layout || !this.gNodes) return;
        const q = (label) =>
            this.gNodes.querySelector(
                `[data-name="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(label) : label}"]`
            );
        if (prev && prev !== name) q(prev)?.classList.remove("is-current");
        if (name) q(name)?.classList.add("is-current");
    }

    nodeMatchesFilter(name) {
        if (!this.state.filter) return true;
        return name.toLowerCase().includes(this.state.filter);
    }

    edgeMatchesFilter(edge) {
        if (!this.state.filter) return true;
        return (
            this.nodeMatchesFilter(edge.from) ||
            this.nodeMatchesFilter(edge.to)
        );
    }

    ensureArrowMarker() {
        if (this.svg.querySelector("#label-graph-arrow")) return;
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
            <marker id="label-graph-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="label-graph-arrowhead"/>
            </marker>
            <marker id="label-graph-arrow-call" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="label-graph-arrowhead-call"/>
            </marker>
            <marker id="label-graph-arrow-if" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="label-graph-arrowhead-if"/>
            </marker>
            <marker id="label-graph-dot-if-rejoin" viewBox="0 0 8 8" refX="4" refY="4"
                markerWidth="5" markerHeight="5" orient="auto">
                <circle cx="4" cy="4" r="2.5" class="label-graph-if-rejoin-dot"/>
            </marker>
            <marker id="label-graph-arrow-fallthrough" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="label-graph-arrowhead-fallthrough"/>
            </marker>
            <marker id="label-graph-dot-exit-end" viewBox="0 0 8 8" refX="4" refY="4"
                markerWidth="5" markerHeight="5" orient="auto">
                <circle cx="4" cy="4" r="3" class="label-graph-exit-dot-end"/>
            </marker>
            <marker id="label-graph-dot-exit-return" viewBox="0 0 8 8" refX="4" refY="4"
                markerWidth="5" markerHeight="5" orient="auto">
                <circle cx="4" cy="4" r="3" class="label-graph-exit-dot-return"/>
            </marker>
        `;
        this.svg.insertBefore(defs, this.gRoot);
    }

    ensureNodeClip(lay, clipKey) {
        let defs = this.svg.querySelector("defs.label-graph-defs");
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            defs.setAttribute("class", "label-graph-defs");
            this.svg.insertBefore(defs, this.gRoot);
        }
        const id = `label-graph-clip-${clipKey}`;
        let cp = defs.querySelector(`#${id}`);
        if (!cp) {
            cp = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
            cp.setAttribute("id", id);
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", "0");
            r.setAttribute("y", "0");
            r.setAttribute("width", lay.width);
            r.setAttribute("height", lay.height);
            cp.appendChild(r);
            defs.appendChild(cp);
        } else {
            const r = cp.querySelector("rect");
            if (r) {
                r.setAttribute("width", lay.width);
                r.setAttribute("height", lay.height);
            }
        }
        return id;
    }

    drawGraph() {
        const { nodes, edges, graph, edgeKeys } = this.layout;
        this.gEdges.replaceChildren();
        this.gNodes.replaceChildren();

        const nodeByName = new Map(nodes.map((n) => [n.name, n]));
        const stubEdges = [];
        for (const edge of edges) {
            const dimmed = !this.edgeMatchesFilter(edge);

            if (
                (edge.kind === "choice" && edge.disconnected) ||
                edge.kind === "if_inline" ||
                edge.kind === "if_rejoin" ||
                edge.kind === "exit"
            ) {
                stubEdges.push({ edge, dimmed });
                continue;
            }

            const edgeName = edgeKeys.get(edge) || edge.id;
            const lay = graph.edge(edge.from, edge.to, edgeName);
            if (!lay || !lay.points || lay.points.length < 2) continue;

            const fromLay = graph.node(edge.from);
            const fromNode = nodeByName.get(edge.from);
            const points = adjustDagreEdgePoints(
                lay.points,
                edge,
                fromLay,
                fromNode
            );
            this.appendEdgePaths(edge, points, dimmed);
        }

        for (const { edge, dimmed } of stubEdges) {
            const fromLay = graph.node(edge.from);
            const fromNode = nodeByName.get(edge.from);
            if (!fromLay) continue;
            const stubPoints =
                edge.kind === "exit"
                    ? computeExitStubPoints(edge, fromLay, fromNode)
                    : edge.kind === "if_inline"
                      ? computeIfInlineStubPoints(edge, fromLay, fromNode)
                      : edge.kind === "if_rejoin"
                        ? computeIfRejoinStubPoints(edge, fromLay, fromNode)
                        : computeChoiceStubPoints(edge, fromLay, fromNode);
            this.appendEdgePaths(edge, stubPoints, dimmed);
        }

        this._nodeCenters.clear();
        let clipKey = 0;
        for (const node of nodes) {
            const lay = graph.node(node.name);
            if (!lay) continue;
            this._nodeCenters.set(node.name, { x: lay.x, y: lay.y });

            const displayH = node.preview ? 50 : 36;
            const box = { width: lay.width, height: displayH };

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "label-graph-node");
            g.setAttribute("data-name", node.name);
            g.setAttribute("transform", `translate(${lay.x - lay.width / 2},${lay.y - lay.height / 2})`);
            if (node.name === this.state.currentLabel) g.classList.add("is-current");
            if (node.ghost) g.classList.add("is-ghost");
            if (!this.nodeMatchesFilter(node.name)) g.classList.add("is-dimmed");

            const clipId = this.ensureNodeClip(box, sanitizeClipKey(node.name) + clipKey++);
            g.setAttribute("clip-path", `url(#${clipId})`);

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", box.width);
            rect.setAttribute("height", box.height);
            rect.setAttribute("rx", "6");
            g.appendChild(rect);

            const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            nameText.setAttribute("class", "label-graph-node__name");
            nameText.setAttribute("x", box.width / 2);
            nameText.setAttribute("y", node.preview ? displayH * 0.36 : displayH / 2);
            nameText.setAttribute("text-anchor", "middle");
            nameText.setAttribute("dominant-baseline", "central");
            const displayName = node.displayName || node.name;
            nameText.textContent = displayName;
            g.appendChild(nameText);

            if (node.preview) {
                const prev = document.createElementNS("http://www.w3.org/2000/svg", "text");
                prev.setAttribute("class", "label-graph-node__preview");
                prev.setAttribute("x", box.width / 2);
                prev.setAttribute("y", displayH * 0.72);
                prev.setAttribute("text-anchor", "middle");
                prev.setAttribute("dominant-baseline", "central");
                prev.textContent = node.preview;
                g.appendChild(prev);
                const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
                tip.textContent = node.preview;
                g.appendChild(tip);
            }

            g.style.cursor = node.ghost ? "default" : "pointer";

            g.addEventListener("pointerdown", (e) => {
                if (node.ghost || e.button !== 0) return;
                e.stopPropagation();
                if (e.pointerType !== "mouse") e.preventDefault();
                if (this._commandMode) {
                    this.handleCommandNodeClick(node.name);
                    return;
                }
                this._nodePointerDown = {
                    name: node.name,
                    x: e.clientX,
                    y: e.clientY,
                };
            });

            g.addEventListener("dblclick", (e) => {
                if (node.ghost || e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                if (this._commandMode) return;
                if (this.shouldSuppressGraphDblClick()) return;
                this.clearNodeClickTimer();
                this._lastNodeTap = null;
                this._nodePointerDown = null;
                this.handleNodeDoubleTap(node.name);
            });

            this.gNodes.appendChild(g);
        }
    }

    isViewCustomized() {
        return this._viewCustomized;
    }

    markViewCustomized() {
        this._viewCustomized = true;
    }

    applyTransform() {
        const { x, y, k } = this.transform;
        this.gRoot.setAttribute("transform", `translate(${x},${y}) scale(${k})`);
    }

    noteGraphGesture() {
        this._suppressGraphDblClickUntil = Date.now() + 500;
    }

    shouldSuppressGraphDblClick() {
        return Date.now() < this._suppressGraphDblClickUntil;
    }

    onWheel(e) {
        e.preventDefault();
        this.noteGraphGesture();
        const rect = this.viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        this.zoomAt(mx, my, factor);
    }

    getPinchMetrics() {
        const pts = Array.from(this._touchPointers.values());
        if (pts.length < 2) return null;
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy) || 1;
        return {
            dist,
            cx: (pts[0].x + pts[1].x) / 2,
            cy: (pts[0].y + pts[1].y) / 2,
        };
    }

    cancelPanForPinch() {
        this._panning = false;
        this._panStart = null;
        this._nodePointerDown = null;
        this._pendingEdgeAction = null;
        this.cancelLinkDrag();
    }

    beginPinchIfNeeded() {
        if (this._touchPointers.size !== 2) return;
        const m = this.getPinchMetrics();
        if (!m) return;
        const rect = this.viewport.getBoundingClientRect();
        this.cancelPanForPinch();
        this.noteGraphGesture();
        this._pinchStart = {
            dist: m.dist,
            k: this.transform.k,
            vx: m.cx - rect.left,
            vy: m.cy - rect.top,
            x: this.transform.x,
            y: this.transform.y,
        };
    }

    applyPinchTransform() {
        const s = this._pinchStart;
        const m = this.getPinchMetrics();
        if (!s || !m) return;
        const scale = m.dist / s.dist;
        const k1 = Math.min(3, Math.max(0.15, s.k * scale));
        const ratio = k1 / s.k;
        const rect = this.viewport.getBoundingClientRect();
        const mx = m.cx - rect.left;
        const my = m.cy - rect.top;
        this.transform.k = k1;
        this.transform.x = mx - (mx - s.x) * ratio;
        this.transform.y = my - (my - s.y) * ratio;
        this.markViewCustomized();
        this.noteGraphGesture();
        this.applyTransform();
    }

    onContainerPointerDown(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (!this.container.contains(e.target)) return;
        this._touchPointers.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY,
        });
        this.beginPinchIfNeeded();
    }

    onContainerPointerMove(e) {
        if (!this._touchPointers.has(e.pointerId)) return;
        this._touchPointers.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY,
        });
        if (this._touchPointers.size >= 2 && this._pinchStart) {
            e.preventDefault();
            this.applyPinchTransform();
        }
    }

    onContainerPointerUp(e) {
        this._touchPointers.delete(e.pointerId);
        if (this._touchPointers.size < 2) {
            this._pinchStart = null;
        } else if (this._touchPointers.size === 2) {
            this.beginPinchIfNeeded();
        }
    }

    zoomBy(factor) {
        const rect = this.viewport.getBoundingClientRect();
        this.zoomAt(rect.width / 2, rect.height / 2, factor);
    }

    zoomAt(mx, my, factor) {
        const k0 = this.transform.k;
        const k1 = Math.min(3, Math.max(0.15, k0 * factor));
        const ratio = k1 / k0;
        this.transform.x = mx - (mx - this.transform.x) * ratio;
        this.transform.y = my - (my - this.transform.y) * ratio;
        this.transform.k = k1;
        this.markViewCustomized();
        this.applyTransform();
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        if (this._touchPointers.size >= 2 || this._pinchStart) return;
        if (e.target.closest(".label-graph-node")) return;
        if (e.target.closest(".label-graph-edge-hit")) return;
        this._pendingEdgeAction = null;
        this._panning = true;
        this.noteGraphGesture();
        this._panStart = {
            x: e.clientX,
            y: e.clientY,
            tx: this.transform.x,
            ty: this.transform.y,
        };
        this.viewport.setPointerCapture(e.pointerId);
    }

    onPointerMove(e) {
        if (this._pendingEdgeAction && !this._linkDragEdge && !this._linkDragFrom) {
            const p = this._pendingEdgeAction;
            if (e.pointerId !== p.pointerId) return;
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            const slop = this._edgeDragSlopPx;
            if (dx * dx + dy * dy > slop * slop) {
                this._pendingEdgeAction = null;
                this._linkDragMoved = false;
                this.startLinkDragFromEdge(p.edge, p.points, e);
            }
            return;
        }
        if (this._nodePointerDown && !this._linkDragFrom && !this._linkDragEdge) {
            const dx = e.clientX - this._nodePointerDown.x;
            const dy = e.clientY - this._nodePointerDown.y;
            if (dx * dx + dy * dy > 64) {
                const name = this._nodePointerDown.name;
                this._nodePointerDown = null;
                this.startLinkDrag(name, e);
            }
        }
        if (this._linkDragFrom || this._linkDragEdge) {
            if (this._dragLine) {
                const dx = e.clientX - (this._dragStartX || e.clientX);
                const dy = e.clientY - (this._dragStartY || e.clientY);
                if (dx * dx + dy * dy > 16) this._linkDragMoved = true;
            }
            this.updateLinkDrag(e);
            return;
        }
        if (!this._panning || !this._panStart) return;
        if (this._pinchStart) return;
        this.transform.x =
            this._panStart.tx + (e.clientX - this._panStart.x);
        this.transform.y =
            this._panStart.ty + (e.clientY - this._panStart.y);
        this.markViewCustomized();
        this.applyTransform();
    }

    clearNodeClickTimer() {
        if (this._nodeClickTimer) {
            clearTimeout(this._nodeClickTimer);
            this._nodeClickTimer = null;
        }
    }

    handleNodeTap(nodeName, pointerType, pointerEvent) {
        if (!nodeName || nodeName.startsWith("__open__")) return;
        if (this._commandMode) {
            this.handleCommandNodeClick(nodeName);
            return;
        }

        if (pointerType !== "mouse" && pointerEvent) {
            pointerEvent.preventDefault();
        }

        if (pointerType === "mouse") {
            this.clearNodeClickTimer();
            this._lastNodeTap = null;
            this.onNodeClick?.(nodeName);
            return;
        }

        const now = Date.now();
        const px = pointerEvent?.clientX ?? 0;
        const py = pointerEvent?.clientY ?? 0;
        if (this._lastNodeTap && this._lastNodeTap.name === nodeName) {
            const gap = now - this._lastNodeTap.time;
            const dx = px - this._lastNodeTap.x;
            const dy = py - this._lastNodeTap.y;
            const slop = this._doubleTapSlopPx;
            if (gap < this._doubleTapMinMs) {
                return;
            }
            if (
                gap < this._doubleTapMaxMs &&
                dx * dx + dy * dy <= slop * slop &&
                !this.shouldSuppressGraphDblClick()
            ) {
                this.clearNodeClickTimer();
                this._lastNodeTap = null;
                this.handleNodeDoubleTap(nodeName);
                return;
            }
        }

        this._lastNodeTap = { name: nodeName, time: now, x: px, y: py };
        this.clearNodeClickTimer();
        this._nodeClickTimer = setTimeout(() => {
            this._nodeClickTimer = null;
            this._lastNodeTap = null;
            this.onNodeClick?.(nodeName);
        }, this._nodeClickDelayMs);
    }

    handleNodeDoubleTap(nodeName) {
        if (!nodeName || nodeName.startsWith("__open__")) return;
        if (this._commandMode) return;
        if (this.shouldSuppressGraphDblClick()) return;
        this.clearNodeClickTimer();
        this._lastNodeTap = null;
        if (this.onNodeDoubleClick) {
            this.onNodeDoubleClick(nodeName);
        } else {
            this.onNodeClick?.(nodeName);
        }
    }

    onPointerUp(e) {
        if (this._pendingEdgeAction) {
            const p = this._pendingEdgeAction;
            this._pendingEdgeAction = null;
            if (e.pointerId === p.pointerId) {
                const dx = e.clientX - p.x;
                const dy = e.clientY - p.y;
                const slop = this._edgeDragSlopPx;
                if (dx * dx + dy * dy <= slop * slop && this.onRemoveEdge) {
                    this.onRemoveEdge(p.edge);
                }
            }
            this.updateUndoButton();
            return;
        }
        if (this._nodePointerDown) {
            const pending = this._nodePointerDown;
            this._nodePointerDown = null;
            const dx = e.clientX - pending.x;
            const dy = e.clientY - pending.y;
            if (dx * dx + dy * dy <= 64) {
                this.handleNodeTap(pending.name, e.pointerType, e);
            }
            return;
        }
        if (this._linkDragFrom || this._linkDragEdge) {
            const edge = this._linkDragEdge;
            const moved = this._linkDragMoved;
            const targetEl = document.elementFromPoint(e.clientX, e.clientY);
            const nodeG = targetEl?.closest?.(".label-graph-node");
            const targetName = nodeG?.getAttribute("data-name");

            if (moved) this.noteGraphGesture();
            if (moved && targetName && this.isRealTargetNode(targetName)) {
                this._suppressNextNodeClick = true;
                this.finishLinkDrag(targetName);
            } else {
                this.cancelLinkDrag();
            }
            try {
                this.viewport.releasePointerCapture(e.pointerId);
            } catch (_) {
                /* ignore */
            }
            this.updateUndoButton();
            return;
        }
        if (!this._panning) return;
        const wasPanning = this._panning;
        this._panning = false;
        this._panStart = null;
        if (wasPanning) this.noteGraphGesture();
        try {
            this.viewport.releasePointerCapture(e.pointerId);
        } catch (_) {
            /* ignore */
        }
    }

    cancelScheduledFit() {
        if (this._fitRaf) {
            cancelAnimationFrame(this._fitRaf);
            this._fitRaf = 0;
        }
    }

    /** display:none→表示直後は viewport サイズが 0 のことがあるため数フレーム再試行 */
    scheduleFitToContent(focusLabel, options = {}) {
        this.cancelScheduledFit();
        let attempts = 0;
        const maxAttempts = 12;
        const step = () => {
            this._fitRaf = 0;
            if (!this.layout) {
                this._needsFit = false;
                return;
            }
            if (this.fitToContent(focusLabel, options)) {
                this._needsFit = false;
                return;
            }
            if (++attempts < maxAttempts) {
                this._fitRaf = requestAnimationFrame(step);
            } else {
                this._needsFit = false;
            }
        };
        requestAnimationFrame(() => {
            this._fitRaf = requestAnimationFrame(step);
        });
    }

    fitToContent(focusLabel, options = {}) {
        const bbox = this.gRoot.getBBox();
        if (!bbox.width && !bbox.height) return false;

        const rect = this.viewport.getBoundingClientRect();
        const pad = 48;
        const w = rect.width - pad * 2;
        const h = rect.height - pad * 2;
        if (w <= 0 || h <= 0) return false;

        let k = Math.min(w / bbox.width, h / bbox.height, 1.25);
        k = Math.max(0.2, Math.min(2, k));

        let cx = bbox.x + bbox.width / 2;
        let cy = bbox.y + bbox.height / 2;
        if (focusLabel && this.layout?.graph) {
            const n = this.layout.graph.node(focusLabel);
            if (n) {
                cx = n.x;
                cy = n.y;
            }
        }

        this.transform.k = k;
        this.transform.x = rect.width / 2 - cx * k;
        this.transform.y = rect.height / 2 - cy * k;
        if (options.user) this.markViewCustomized();
        this.applyTransform();
        return true;
    }

    appendEdgePaths(edge, points, dimmed) {
        const d = pointsToPath(points);

        const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hit.setAttribute("class", "label-graph-edge-hit");
        if (edge.disconnected) hit.classList.add("label-graph-edge-hit--stub");
        hit.setAttribute("d", d);
        hit.setAttribute("data-edge-id", edge.id || "");
        if (edge.choiceIndex != null) {
            hit.setAttribute("data-choice-index", String(edge.choiceIndex));
        }
        if (dimmed) hit.classList.add("is-dimmed");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "label-graph-edge");
        path.setAttribute("data-kind", edge.kind);
        if (edge.exitKind) {
            path.setAttribute("data-exit-kind", edge.exitKind);
        }
        path.setAttribute("d", d);
        if (edge.disconnected) path.classList.add("is-stub");
        if (edge.kind === "if_inline" || edge.kind === "if_rejoin") {
            path.setAttribute("marker-end", "url(#label-graph-dot-if-rejoin)");
        } else if (edge.kind === "exit") {
            const dotId =
                edge.exitKind === "return"
                    ? "label-graph-dot-exit-return"
                    : "label-graph-dot-exit-end";
            path.setAttribute("marker-end", `url(#${dotId})`);
        } else if (edge.kind === "call") {
            path.setAttribute("marker-end", "url(#label-graph-arrow-call)");
        } else if (edge.kind === "if_branch") {
            path.setAttribute("marker-end", "url(#label-graph-arrow-if)");
        } else if (edge.kind === "fallthrough") {
            path.setAttribute("marker-end", "url(#label-graph-arrow-fallthrough)");
        } else {
            path.setAttribute("marker-end", "url(#label-graph-arrow)");
        }
        path.setAttribute("pointer-events", "none");
        if (dimmed) path.classList.add("is-dimmed");

        const title = edgeTitle(edge);
        if (title) {
            const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
            let hint = "";
            if (edge.kind === "exit") {
                hint = "（クリックで行を削除）";
            } else if (edge.kind === "goto" || edge.kind === "call") {
                hint = "（クリックで行削除）";
            } else if (edge.disconnected) {
                hint = "（クリックで行削除・ドラッグでつなぐ）";
            } else if (edge.kind === "choice") {
                hint = "（クリックで接続を切る）";
            } else if (edge.kind === "if_inline" && edge.bodyPreview) {
                hint = "（クリックで @if へ）";
            } else if (
                edge.kind === "if_inline" ||
                edge.kind === "if_rejoin"
            ) {
                hint = "";
            } else if (edge.kind === "if_branch") {
                hint = "（条件が真のときだけ別ラベルへ）";
            }
            t.textContent = title + hint;
            hit.appendChild(t);
        }
        this.bindEdgeInteractions(edge, hit, points);
        this.gEdges.appendChild(hit);
        this.gEdges.appendChild(path);

        let labelPt = null;
        if (edge.kind === "exit") {
            labelPt = exitStubLabelPoint(points);
        } else if (edge.kind === "if_rejoin") {
            labelPt = ifRejoinLabelPoint(points);
        } else if (edge.disconnected) {
            labelPt =
                edge.kind === "if_inline" && edge.bodyPreview
                    ? ifStubLabelPoint(points)
                    : choiceStubLabelPoint(points);
        }

        if (edge.kind === "if_inline" && edge.detail) {
            if (edge.bodyPreview) {
                appendIfStubLabel(
                    this.gEdges,
                    edge,
                    labelPt,
                    dimmed,
                    (e) => this.onIfBranchClick?.(e)
                );
            } else {
                appendEdgeLabel(
                    this.gEdges,
                    String(edge.detail),
                    points,
                    dimmed,
                    labelPt,
                    edge.kind
                );
            }
            return;
        }

        const labelText = edgeDisplayLabel(edge);
        if (labelText) {
            appendEdgeLabel(
                this.gEdges,
                labelText,
                points,
                dimmed,
                labelPt,
                edge.kind === "exit" ? `exit-${edge.exitKind}` : edge.kind
            );
        }
    }
}

function stubAttachX(edge, fromLay, fromNode) {
    if (edge.stubLayoutX != null) return fromLay.x + edge.stubLayoutX;
    if (edge.kind === "choice") {
        return choiceAttachX(edge, fromLay, fromNode);
    }
    if (edge.kind === "if_inline" || edge.kind === "if_branch") {
        return branchAttachX(edge, fromLay, fromNode);
    }
    return fromLay.x;
}

function branchAttachX(edge, fromLay, fromNode) {
    const n = Math.max(1, edge.branchGroupSize || edge.choiceGroupSize || 1);
    const i = edge.branchIndex ?? edge.choiceIndex ?? 0;
    const w = fromLay.width || 88;
    const minSpacing = 64;
    const span = n <= 1 ? w : Math.max(w, (n - 1) * minSpacing);
    return n <= 1
        ? fromLay.x
        : fromLay.x - span / 2 + (span * i) / (n - 1);
}

function sanitizeClipKey(name) {
    return String(name).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** スタブなしラベルの dagre 下端余白（if 等は diagnostics の layoutPadBottom を使う） */
const DAGRE_NODE_PAD_MIN = 10;

function nodeContentBottomY(fromLay, fromNode) {
    const nodeH = fromNode?.preview ? 50 : 36;
    return fromLay.y - fromLay.height / 2 + nodeH;
}

function stubBaseY(fromLay, fromNode, edge) {
    return nodeContentBottomY(fromLay, fromNode) + (edge?.stubYOffset ?? 0);
}

function choiceAttachX(edge, fromLay, fromNode) {
    const n = Math.max(1, edge.choiceGroupSize || 1);
    const i = edge.choiceIndex ?? 0;
    const w = fromLay.width || 88;
    const minSpacing = 64;
    const span = n <= 1 ? w : Math.max(w, (n - 1) * minSpacing);
    return n <= 1
        ? fromLay.x
        : fromLay.x - span / 2 + (span * i) / (n - 1);
}

/** 下余白付きノードでは dagre の始点が箱の最下端になるのを、見た目のラベル下端に合わせる */
function adjustDagreEdgePoints(points, edge, fromLay, fromNode) {
    if (!points?.length || !fromLay || !fromNode?.layoutPadBottom) {
        return points;
    }
    const pts = points.map((p) => ({ x: p.x, y: p.y }));
    const y = stubBaseY(fromLay, fromNode, edge);
    const x = stubAttachX(edge, fromLay, fromNode);
    pts[0] = { x, y };
    if (pts.length > 1 && pts[1].y < y + 12) {
        pts[1] = { x: pts[1].x, y: y + 12 };
    }
    return pts;
}

function computeChoiceStubPoints(edge, fromLay, fromNode) {
    const attachX = stubAttachX(edge, fromLay, fromNode);
    const y0 = stubBaseY(fromLay, fromNode, edge);
    const drop = edge.stubDrop ?? 40;
    const mid = Math.min(14, drop * 0.35);
    return [
        { x: attachX, y: y0 },
        { x: attachX, y: y0 + mid },
        { x: attachX, y: y0 + drop },
    ];
}

function computeIfInlineStubPoints(edge, fromLay, fromNode) {
    const attachX = stubAttachX(edge, fromLay, fromNode);
    const y0 = stubBaseY(fromLay, fromNode, edge);
    const drop = edge.stubDrop ?? 22;
    return [
        { x: attachX, y: y0 },
        { x: attachX, y: y0 + drop },
    ];
}

/** @endif 合流（ラベル内で続きに戻る・ノード下の中央軸） */
function computeIfRejoinStubPoints(edge, fromLay, fromNode) {
    const attachX = stubAttachX(edge, fromLay, fromNode);
    const y0 = stubBaseY(fromLay, fromNode, edge);
    const drop = edge.stubDrop ?? 40;
    return [
        { x: attachX, y: y0 },
        { x: attachX, y: y0 + Math.min(16, drop * 0.32) },
        { x: attachX, y: y0 + drop },
    ];
}

/** @end / @return: ノード下端から短いスタブ（共有ノードにしない） */
function computeExitStubPoints(edge, fromLay, fromNode) {
    const attachX = stubAttachX(edge, fromLay, fromNode);
    const i = edge.exitIndex ?? 0;
    const y0 = stubBaseY(fromLay, fromNode, edge);
    const drop = (edge.stubDrop ?? 26) + i * 6;
    const y1 = y0 + drop;
    return [
        { x: attachX, y: y0 },
        { x: attachX, y: y1 },
    ];
}

function exitStubLabelPoint(points) {
    const b = points[points.length - 1];
    return { x: b.x, y: b.y + 2 };
}

function ifRejoinLabelPoint(points) {
    const b = points[points.length - 1];
    return { x: b.x, y: b.y + 2 };
}

function choiceStubLabelPoint(points) {
    const a = points[0];
    const b = points[points.length - 1];
    return {
        x: a.x,
        y: a.y + (b.y - a.y) * 0.58,
    };
}

/** if スタブ（2行ラベル）の中心 */
function ifStubLabelPoint(points) {
    const a = points[0];
    const b = points[points.length - 1];
    return {
        x: a.x,
        y: a.y + (b.y - a.y) * 0.5,
    };
}

function measureLabelNode(node) {
    const name = node.displayName || node.name || "";
    const NODE_H = node.preview ? 50 : 36;
    const w = measureNodeWidth(name, node.preview);
    const stubPad = Math.max(0, Number(node.layoutPadBottom) || 0);
    return {
        width: w,
        height: NODE_H + (stubPad > 0 ? stubPad : DAGRE_NODE_PAD_MIN),
    };
}

function layoutLabelGraphWithDagre(nodes, edges) {
    const g = new dagre.graphlib.Graph({ multigraph: true, compound: false });
    g.setGraph({
        rankdir: "TB",
        nodesep: 50,
        ranksep: 50,
        edgesep: 20,
        marginx: 32,
        marginy: 24,
        ranker: "network-simplex",
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of nodes) {
        const size = measureLabelNode(node);
        g.setNode(node.name, size);
    }

    const seen = new Set();
    const edgeKeys = new Map();
    for (const edge of edges) {
        if (!edge.from || edge.to == null || edge.to === "") continue;
        if (!g.hasNode(edge.from) || !g.hasNode(edge.to)) continue;
        const edgeName = edge.id || `${edge.from}\0${edge.to}\0${edge.kind}`;
        if (seen.has(edgeName)) continue;
        seen.add(edgeName);
        const label = { id: edge.id, kind: edge.kind };
        g.setEdge(edge.from, edge.to, label, edgeName);
        edgeKeys.set(edge, edgeName);
    }

    dagre.layout(g);

    return { nodes, edges, graph: g, edgeKeys };
}

function pointsToPath(points) {
    if (!points.length) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
}

function edgeTitle(edge) {
    if (edge.kind === "choice") {
        return `「${edge.detail}」→ ${edge.to}`;
    }
    if (edge.kind === "if_branch") {
        const mode = edge.mode === "call" ? "call " : "";
        return `if ${edge.detail} → ${mode}${edge.to}（条件が真のとき）`;
    }
    if (edge.kind === "if_inline") {
        return `if ${edge.detail}（このラベル内・@endif で続き）`;
    }
    if (edge.kind === "if_rejoin") {
        return "@endif 合流（このラベルの続きへ）";
    }
    if (edge.kind === "goto" || edge.kind === "call") {
        return `@${edge.kind} ${edge.to}`;
    }
    if (edge.kind === "fallthrough") {
        return `「${edge.from}」の次の定義「${edge.to}」へ（@goto なし）`;
    }
    if (edge.kind === "exit") {
        return edge.exitKind === "end"
            ? "@end（このラベルで終了）"
            : "@return（呼び出し元へ戻る）";
    }
    return "";
}

/** 矢印上に出す文言（選択肢は脚本の選択肢テキストそのまま） */
function edgeDisplayLabel(edge) {
    if (edge.kind === "choice" && edge.detail) {
        return String(edge.detail);
    }
    if (edge.kind === "if_branch" && edge.detail) {
        return String(edge.detail);
    }
    if (edge.kind === "if_inline" && edge.detail) {
        return String(edge.detail);
    }
    if (edge.kind === "if_rejoin" && edge.detail) {
        return String(edge.detail);
    }
    if (edge.kind === "exit" && edge.detail) {
        return String(edge.detail);
    }
    return null;
}

function edgePathMidpoint(points) {
    const i = Math.floor((points.length - 1) / 2);
    return points[i];
}

function truncateEdgeLabel(text, maxLen) {
    const s = String(text).replace(/\s+/g, " ").trim();
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1) + "…";
}

/** if スタブ: 上＝条件、下＝超短い本文 */
function appendIfStubLabel(parent, edge, labelPt, dimmed, onJump) {
    const pt = labelPt || { x: 0, y: 0 };
    const cond = truncateEdgeLabel(edge.detail, 22);
    const body = truncateEdgeLabel(edge.bodyPreview, 8);
    const lineGap = 10;
    const condY = pt.y - lineGap / 2;
    const bodyY = pt.y + lineGap / 2;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "label-graph-edge-label label-graph-edge-label--if-stub");
    g.setAttribute("data-kind", edge.kind);
    if (dimmed) g.classList.add("is-dimmed");
    if (onJump) {
        g.classList.add("is-if-jumpable");
        g.style.cursor = "pointer";
    }

    const textCond = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textCond.setAttribute("class", "label-graph-edge-label__cond");
    textCond.setAttribute("x", pt.x);
    textCond.setAttribute("y", condY);
    textCond.setAttribute("text-anchor", "middle");
    textCond.setAttribute("dominant-baseline", "central");
    textCond.setAttribute("font-size", "10");
    textCond.textContent = cond;

    const textBody = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textBody.setAttribute("class", "label-graph-edge-label__body");
    textBody.setAttribute("x", pt.x);
    textBody.setAttribute("y", bodyY);
    textBody.setAttribute("text-anchor", "middle");
    textBody.setAttribute("dominant-baseline", "central");
    textBody.setAttribute("font-size", "9");
    textBody.textContent = body;

    const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    tip.textContent = `${edge.detail}\n${edge.bodyPreview}\n（クリックで @if へ）`;
    g.appendChild(tip);
    g.appendChild(textCond);
    g.appendChild(textBody);
    parent.appendChild(g);

    if (onJump) {
        let down = null;
        g.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            if (e.button !== 0) return;
            down = { x: e.clientX, y: e.clientY };
        });
        g.addEventListener("pointerup", (e) => {
            if (!down || e.button !== 0) return;
            e.stopPropagation();
            const dx = e.clientX - down.x;
            const dy = e.clientY - down.y;
            down = null;
            if (dx * dx + dy * dy > 28 * 28) return;
            onJump(edge);
        });
        g.addEventListener("pointercancel", () => {
            down = null;
        });
    }

    const padX = 5;
    const padY = 3;
    let bbox;
    try {
        const b1 = textCond.getBBox();
        const b2 = textBody.getBBox();
        bbox = {
            x: Math.min(b1.x, b2.x),
            y: Math.min(b1.y, b2.y),
            width:
                Math.max(b1.x + b1.width, b2.x + b2.width) -
                Math.min(b1.x, b2.x),
            height:
                Math.max(b1.y + b1.height, b2.y + b2.height) -
                Math.min(b1.y, b2.y),
        };
    } catch (_) {
        const w = Math.max(
            estimateTextWidthPx(cond, 10),
            estimateTextWidthPx(body, 9)
        );
        bbox = { x: -w / 2, y: condY - 7, width: w, height: lineGap + 14 };
    }

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", bbox.x - padX);
    rect.setAttribute("y", bbox.y - padY);
    rect.setAttribute("width", String(Math.max(bbox.width + padX * 2, 18)));
    rect.setAttribute("height", String(bbox.height + padY * 2));
    rect.setAttribute("rx", "3");
    g.insertBefore(rect, textCond);
}

function appendEdgeLabel(parent, fullText, points, dimmed, labelPt, kind) {
    const pt = labelPt || edgePathMidpoint(points);
    const display = truncateEdgeLabel(fullText, 28);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "label-graph-edge-label");
    if (kind) g.setAttribute("data-kind", kind);
    if (dimmed) g.classList.add("is-dimmed");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pt.x);
    text.setAttribute("y", pt.y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.textContent = display;

    if (fullText !== display) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = fullText;
        g.appendChild(t);
    }

    g.appendChild(text);
    parent.appendChild(g);

    const padX = 6;
    const padY = 4;
    let bbox;
    try {
        bbox = text.getBBox();
    } catch (_) {
        const w = estimateTextWidthPx(display, 11);
        bbox = { x: -w / 2, y: -7, width: w, height: 14 };
    }

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", bbox.x - padX);
    rect.setAttribute("y", bbox.y - padY);
    rect.setAttribute(
        "width",
        String(Math.max(bbox.width + padX * 2, 18))
    );
    rect.setAttribute("height", String(bbox.height + padY * 2));
    rect.setAttribute("rx", "3");
    g.insertBefore(rect, text);
}

/** 日本語混じりのラベル幅（getBBox 失敗時のフォールバック） */
function estimateTextWidthPx(text, fontSizePx) {
    let w = 0;
    for (const ch of String(text)) {
        w += ch.charCodeAt(0) > 0xff ? fontSizePx : fontSizePx * 0.55;
    }
    return w;
}
