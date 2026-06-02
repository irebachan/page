/**
 * ラベル接続の SVG ノードグラフ（dagre で縦レイアウト、パン・ズーム）
 */
class LabelGraphView {
    constructor(container, options = {}) {
        this.container = container;
        this.onNodeClick = options.onNodeClick || null;
        this.onConnect = options.onConnect || null;
        this.onConnectChoice = options.onConnectChoice || null;
        this.onRemoveEdge = options.onRemoveEdge || null;
        this.onUndo = options.onUndo || null;
        this.canUndo = options.canUndo || null;
        this.data = null;
        this.state = { filter: "", currentLabel: null };
        this.layout = null;
        this.transform = { x: 0, y: 0, k: 1 };
        this._panning = false;
        this._panStart = null;
        this._needsFit = false;
        this._connectMode = false;
        this._connectFrom = null;
        this._linkDragFrom = null;
        this._linkDragEdge = null;
        this._linkDragMoved = false;
        this._dragLine = null;
        this._nodeCenters = new Map();
        this._suppressNextNodeClick = false;
        this._nodePointerDown = null;

        container.innerHTML = "";
        container.classList.add("label-graph-view");

        this.toolbar = document.createElement("div");
        this.toolbar.className = "label-graph-toolbar";
        this.toolbar.innerHTML = `
            <button type="button" data-action="zoom-in" title="拡大">＋</button>
            <button type="button" data-action="zoom-out" title="縮小">－</button>
            <button type="button" data-action="fit" title="全体を表示">全体</button>
            <span class="label-graph-toolbar__sep" aria-hidden="true"></span>
            <button type="button" data-action="connect" title="2つのノードを順にクリックして @goto を追加・変更">接続</button>
            <button type="button" data-action="undo" title="直前のグラフ操作を戻す" disabled>戻す</button>
        `;
        this.connectBtn = this.toolbar.querySelector('[data-action="connect"]');
        this.undoBtn = this.toolbar.querySelector('[data-action="undo"]');
        container.appendChild(this.toolbar);

        this.viewport = document.createElement("div");
        this.viewport.className = "label-graph-viewport";
        this.viewport.setAttribute("tabindex", "0");
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

        this.toolbar.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            if (action === "zoom-in") this.zoomBy(1.2);
            else if (action === "zoom-out") this.zoomBy(1 / 1.2);
            else if (action === "fit") this.fitToContent();
            else if (action === "connect") this.toggleConnectMode();
            else if (action === "undo") this.onUndo?.();
            this.updateUndoButton();
        });

        this.viewport.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        this.viewport.addEventListener("pointerdown", (e) => this.onPointerDown(e));
        this.viewport.addEventListener("pointermove", (e) => this.onPointerMove(e));
        this.viewport.addEventListener("pointerup", (e) => this.onPointerUp(e));
        this.viewport.addEventListener("pointercancel", (e) => this.onPointerUp(e));
        this.viewport.addEventListener("keydown", (e) => this.onKeyDown(e));
    }

    toggleConnectMode() {
        this._connectMode = !this._connectMode;
        this._connectFrom = null;
        this.clearConnectHighlight();
        this.connectBtn?.classList.toggle("is-active", this._connectMode);
        this.viewport.classList.toggle("is-connect-mode", this._connectMode);
    }

    onKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
            e.preventDefault();
            if (this.onUndo?.()) this.updateUndoButton();
            return;
        }
        if (e.key === "Escape") {
            if (this._connectMode) this.toggleConnectMode();
            this.cancelLinkDrag();
            this._nodePointerDown = null;
        }
    }

    updateUndoButton() {
        if (!this.undoBtn) return;
        const ok = this.canUndo?.() ?? false;
        this.undoBtn.disabled = !ok;
    }

    isRealTargetNode(name) {
        return name && !String(name).startsWith("__open__");
    }

    /** 線: ドラッグで接続、静止クリックで削除 */
    bindEdgeInteractions(edge, hitEl, points) {
        if (edge.kind === "fallthrough") {
            hitEl.style.cursor = "default";
            return;
        }
        hitEl.style.cursor = "grab";
        hitEl.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            if (this._connectMode || e.button !== 0) return;
            this._linkDragMoved = false;
            this.startLinkDragFromEdge(edge, points, e);
        });
    }

    clientToGraph(clientX, clientY) {
        const rect = this.viewport.getBoundingClientRect();
        const { x: tx, y: ty, k } = this.transform;
        return {
            x: (clientX - rect.left - tx) / k,
            y: (clientY - rect.top - ty) / k,
        };
    }

    handleConnectNode(name) {
        if (!this.onConnect || !this.isRealTargetNode(name)) return;
        if (!this._connectFrom) {
            this._connectFrom = name;
            this.highlightConnectFrom(name);
            return;
        }
        const from = this._connectFrom;
        this._connectFrom = null;
        this.clearConnectHighlight();
        if (from === name) return;
        this.onConnect(from, name);
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
        if (!from || from === targetName || !this.onConnect) return;
        this.onConnect(from, targetName);
    }

    render(data, state = {}) {
        this.data = data;
        this.state = {
            filter: (state.filter || "").trim().toLowerCase(),
            currentLabel: state.currentLabel ?? null,
        };
        if (state.fit) this._needsFit = true;

        const nodes = data?.nodes || [];
        const edges = data?.edges || [];

        if (typeof dagre === "undefined" || typeof dagre.graphlib === "undefined") {
            this.missingLibEl.hidden = false;
            this.emptyEl.hidden = true;
            this.viewport.hidden = true;
            this.toolbar.hidden = true;
            return;
        }
        this.missingLibEl.hidden = true;
        this.toolbar.hidden = false;
        this.viewport.hidden = false;

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
            this._needsFit = false;
            this.fitToContent(this.state.currentLabel);
        }
        this.applyTransform();
    }

    setCurrentLabel(name) {
        if (this.state.currentLabel === name) return;
        this.state.currentLabel = name;
        if (!this.layout) return;
        this.gNodes.querySelectorAll(".label-graph-node").forEach((g) => {
            const n = g.getAttribute("data-name");
            g.classList.toggle("is-current", n === name);
        });
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
            <marker id="label-graph-arrow-fallthrough" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="label-graph-arrowhead-fallthrough"/>
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

        const stubEdges = [];
        for (const edge of edges) {
            const dimmed = !this.edgeMatchesFilter(edge);

            if (edge.kind === "choice" && edge.disconnected) {
                stubEdges.push({ edge, dimmed });
                continue;
            }

            const edgeName = edgeKeys.get(edge) || edge.id;
            const lay = graph.edge(edge.from, edge.to, edgeName);
            if (!lay || !lay.points || lay.points.length < 2) continue;

            this.appendEdgePaths(edge, lay.points, dimmed);
        }

        for (const { edge, dimmed } of stubEdges) {
            const fromLay = graph.node(edge.from);
            if (!fromLay) continue;
            const stubPoints = computeChoiceStubPoints(edge, fromLay);
            this.appendEdgePaths(edge, stubPoints, dimmed);
        }

        this._nodeCenters.clear();
        let clipKey = 0;
        for (const node of nodes) {
            const lay = graph.node(node.name);
            if (!lay) continue;
            this._nodeCenters.set(node.name, { x: lay.x, y: lay.y });

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "label-graph-node");
            g.setAttribute("data-name", node.name);
            g.setAttribute("transform", `translate(${lay.x - lay.width / 2},${lay.y - lay.height / 2})`);
            if (node.name === this.state.currentLabel) g.classList.add("is-current");
            if (node.ghost) g.classList.add("is-ghost");
            if (!this.nodeMatchesFilter(node.name)) g.classList.add("is-dimmed");

            const clipId = this.ensureNodeClip(lay, sanitizeClipKey(node.name) + clipKey++);
            g.setAttribute("clip-path", `url(#${clipId})`);

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", lay.width);
            rect.setAttribute("height", lay.height);
            rect.setAttribute("rx", "6");
            g.appendChild(rect);

            const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            nameText.setAttribute("class", "label-graph-node__name");
            nameText.setAttribute("x", lay.width / 2);
            nameText.setAttribute("y", node.preview ? lay.height * 0.36 : lay.height / 2);
            nameText.setAttribute("text-anchor", "middle");
            nameText.setAttribute("dominant-baseline", "central");
            const displayName = node.displayName || node.name;
            nameText.textContent = displayName;
            g.appendChild(nameText);

            if (node.preview) {
                const prev = document.createElementNS("http://www.w3.org/2000/svg", "text");
                prev.setAttribute("class", "label-graph-node__preview");
                prev.setAttribute("x", lay.width / 2);
                prev.setAttribute("y", lay.height * 0.72);
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
                if (this._connectMode) {
                    this.handleConnectNode(node.name);
                    return;
                }
                this._nodePointerDown = {
                    name: node.name,
                    x: e.clientX,
                    y: e.clientY,
                };
            });

            this.gNodes.appendChild(g);
        }
    }

    applyTransform() {
        const { x, y, k } = this.transform;
        this.gRoot.setAttribute("transform", `translate(${x},${y}) scale(${k})`);
    }

    onWheel(e) {
        e.preventDefault();
        const rect = this.viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        this.zoomAt(mx, my, factor);
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
        this.applyTransform();
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest(".label-graph-node")) return;
        if (e.target.closest(".label-graph-edge-hit")) return;
        this._panning = true;
        this._panStart = {
            x: e.clientX,
            y: e.clientY,
            tx: this.transform.x,
            ty: this.transform.y,
        };
        this.viewport.setPointerCapture(e.pointerId);
    }

    onPointerMove(e) {
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
        this.transform.x =
            this._panStart.tx + (e.clientX - this._panStart.x);
        this.transform.y =
            this._panStart.ty + (e.clientY - this._panStart.y);
        this.applyTransform();
    }

    handleNodeTap(nodeName) {
        if (!nodeName || nodeName.startsWith("__open__")) return;
        if (this._connectMode) {
            this.handleConnectNode(nodeName);
            return;
        }
        if (this.onNodeClick) this.onNodeClick(nodeName);
    }

    onPointerUp(e) {
        if (this._nodePointerDown) {
            const pending = this._nodePointerDown;
            this._nodePointerDown = null;
            const dx = e.clientX - pending.x;
            const dy = e.clientY - pending.y;
            if (dx * dx + dy * dy <= 64) {
                this.handleNodeTap(pending.name);
            }
            return;
        }
        if (this._linkDragFrom || this._linkDragEdge) {
            const edge = this._linkDragEdge;
            const moved = this._linkDragMoved;
            const targetEl = document.elementFromPoint(e.clientX, e.clientY);
            const nodeG = targetEl?.closest?.(".label-graph-node");
            const targetName = nodeG?.getAttribute("data-name");

            if (!moved && edge && this.onRemoveEdge) {
                this.onRemoveEdge(edge);
            } else if (moved && targetName && this.isRealTargetNode(targetName)) {
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
        this._panning = false;
        this._panStart = null;
        try {
            this.viewport.releasePointerCapture(e.pointerId);
        } catch (_) {
            /* ignore */
        }
    }

    fitToContent(focusLabel) {
        const bbox = this.gRoot.getBBox();
        if (!bbox.width && !bbox.height) return;

        const rect = this.viewport.getBoundingClientRect();
        const pad = 48;
        const w = rect.width - pad * 2;
        const h = rect.height - pad * 2;
        if (w <= 0 || h <= 0) return;

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
        this.applyTransform();
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
        path.setAttribute("d", d);
        if (edge.disconnected) path.classList.add("is-stub");
        if (edge.kind === "call") {
            path.setAttribute("marker-end", "url(#label-graph-arrow-call)");
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
            if (edge.kind === "fallthrough") {
                t.textContent = title;
            } else {
                t.textContent =
                    title +
                    (edge.disconnected
                        ? "（ドラッグでつなぐ・クリックで選択肢行を削除）"
                        : "（ドラッグで付け替え・クリックで接続を切る）");
            }
            hit.appendChild(t);
        }
        this.bindEdgeInteractions(edge, hit, points);
        this.gEdges.appendChild(hit);
        this.gEdges.appendChild(path);

        const labelText = edgeDisplayLabel(edge);
        if (labelText) {
            const labelPt = edge.disconnected
                ? choiceStubLabelPoint(points)
                : null;
            appendEdgeLabel(
                this.gEdges,
                labelText,
                points,
                dimmed,
                labelPt,
                edge.kind
            );
        }
    }
}

function sanitizeClipKey(name) {
    return String(name).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** 未接続の選択肢: ノード下端から別々の縦線（重ならないよう間隔を確保） */
function computeChoiceStubPoints(edge, fromLay) {
    const n = Math.max(1, edge.choiceGroupSize || 1);
    const i = edge.choiceIndex ?? 0;
    const w = fromLay.width || 88;
    const minSpacing = 62;
    const span = n <= 1 ? w : Math.max(w, (n - 1) * minSpacing);
    const attachX =
        n <= 1
            ? fromLay.x
            : fromLay.x - span / 2 + (span * i) / (n - 1);
    const y0 = fromLay.y + fromLay.height / 2;
    const y1 = y0 + 48 + i * 14;

    return [
        { x: attachX, y: y0 },
        { x: attachX, y: y0 + 16 },
        { x: attachX, y: y1 },
    ];
}

function choiceStubLabelPoint(points) {
    const a = points[0];
    const b = points[points.length - 1];
    return {
        x: a.x,
        y: a.y + (b.y - a.y) * 0.58,
    };
}

function measureLabelNode(node) {
    const name = node.displayName || node.name || "";
    const NODE_H = node.preview ? 50 : 36;
    const w = measureNodeWidth(name, node.preview);
    return { width: w, height: NODE_H };
}

function layoutLabelGraphWithDagre(nodes, edges) {
    const g = new dagre.graphlib.Graph({ multigraph: true, compound: false });
    g.setGraph({
        rankdir: "TB",
        nodesep: 44,
        ranksep: 64,
        edgesep: 16,
        marginx: 32,
        marginy: 32,
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
        g.setEdge(edge.from, edge.to, { id: edge.id, kind: edge.kind }, edgeName);
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
        const mode = edge.mode === "call" ? "call " : "";
        return `「${edge.detail}」→ ${mode}${edge.to}`;
    }
    if (edge.kind === "goto" || edge.kind === "call") {
        return `@${edge.kind} ${edge.to}`;
    }
    if (edge.kind === "fallthrough") {
        return `「${edge.from}」の次の定義「${edge.to}」へ（@goto なし）`;
    }
    return "";
}

/** 矢印上に出す文言（選択肢は脚本の選択肢テキストそのまま） */
function edgeDisplayLabel(edge) {
    if (edge.kind === "choice" && edge.detail) {
        if (edge.mode === "call") return `call: ${edge.detail}`;
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
