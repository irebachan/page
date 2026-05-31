// ノベルプレイヤー - ゲームロジックと表示を管理
class NovelPlayer {
    constructor() {
        this.parser = new ScriptParser();
        this.script = [];
        this.labels = {};
        this.labelSourceLines = {};
        this.index = 0;

        // DOM要素
        this.nameBox = document.getElementById("name");
        this.textBox = document.getElementById("text");
        this.textContainer = document.querySelector(".text-container");
        this.nextBtn = document.getElementById("next");
        this.prevBtn = document.getElementById("prev");
        this.previewHistory = [];
        this.choicesBox = document.getElementById("choices");
        this.scriptEditorHost = document.getElementById("scriptEditorHost");
        this.scenarioEditor = null;
        this.restartBtn = document.getElementById("restart");
        this.prevChoiceBtn = document.getElementById("prevChoice");
        this.labelList = document.getElementById("labelList");
        this.labelFilterInput = document.getElementById("labelFilter");
        this.previewFromCursorBtn = document.getElementById("previewFromCursorButton");
        this.scriptDiagnostics = document.getElementById("scriptDiagnostics");
        this.refErrorBadge = document.getElementById("refErrorBadge");
        this.refErrorList = document.getElementById("refErrorList");
        this.labelFlowModal = document.getElementById("labelFlowModal");
        this.labelFlowModalList = document.getElementById("labelFlowModalList");
        this.labelFlowModalFilter = document.getElementById("labelFlowModalFilter");
        this.novelMenuPanel = document.getElementById("novelMenuPanel");
        this.saveButton = document.getElementById("saveButton");
        this.loadButton = document.getElementById("loadButton");
        this.fileInput = document.getElementById("fileInput");
        this.clearButton = document.getElementById("clearButton");
        this.copyButton = document.getElementById("copyButton");
        this.previewUnit = document.getElementById("previewUnit");
        this.syncEditorOnLabelJump = document.getElementById("syncEditorOnLabelJump");
        this.SYNC_EDITOR_LABEL_KEY = "novelPlayer.syncEditorOnLabelJump";
        /** プレビューが「1行ずつ」のとき、次に進むときの script[index] 内の行オフセット */
        this.lineUnitIndex = 0;
        /** 画面上に表示している script の位置（編集後も維持） */
        this.viewIndex = 0;
        this.viewLineUnit = 0;
        /** ラベルジャンプで最後に移動したラベル（「移動」で再テスト用） */
        this.lastJumpLabel = "";
        /** @call の戻り先 */
        this.callStack = [];

        // イベントリスナーの設定
        this.nextBtn.addEventListener("click", () => this.showLine());
        if (this.prevBtn) {
            this.prevBtn.addEventListener("click", () => this.showPrev());
        }
        if (this.prevChoiceBtn) {
            this.prevChoiceBtn.addEventListener("click", () => this.jumpToLastChoice());
        }
        this.restartBtn.addEventListener("click", () => this.restart());
        this.updateScriptDebounced = this.debounce(() => this.updateScript(), 300);
        this.initScenarioEditor();
        this.saveButton.addEventListener("click", () => this.saveScriptToFile());
        this.loadButton.addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) => this.loadScriptFromFile(e));
        this.clearButton.addEventListener("click", () => this.clearScriptText());
        this.copyButton.addEventListener("click", () => this.copyToClipboard());

        if (this.previewFromCursorBtn) {
            this.previewFromCursorBtn.addEventListener("click", () => this.previewFromEditorLine());
        }

        if (this.labelFilterInput) {
            this.labelFilterInput.addEventListener("input", () => this.refreshLabelList());
        }

        if (this.labelFlowModalFilter) {
            this.labelFlowModalFilter.addEventListener("input", () => this.refreshLabelFlow());
        }

        if (this.scriptDiagnostics) {
            this.scriptDiagnostics.addEventListener("toggle", () => {
                if (this.scriptDiagnostics.open) {
                    this.refreshReferenceErrors();
                }
            });
        }

        if (this.previewUnit) {
            this.previewUnit.addEventListener("change", () => {
                this.lineUnitIndex = 0;
                this.restart();
            });
        }

        this.initSyncEditorOnLabelJump();

        // テキストクリックで次へ進む機能
        this.textContainer.addEventListener("click", () => {
            if (this.nextBtn.style.display !== "none") {
                this.showLine();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (this.isEditorFocused() || e.defaultPrevented) return;
            if (e.key === "ArrowRight" && this.nextBtn.style.display !== "none") {
                e.preventDefault();
                this.showLine();
            } else if (e.key === "ArrowLeft" && this.previewHistory.length > 0) {
                e.preventDefault();
                this.showPrev();
            }
        });

        // 初期スクリプト
        this.defaultScript = `
@morning

// この行はプレビューに表示されず、エクスポート後もコメントとして残ります

#ユウ
おはよう。今日はいい天気だね。
散歩でもしようか。
どこに行きたい？

@goto choice_start

@choice_start
- 公園に行く => park
- 図書館に行く => library
- カフェに行く => cafe

@park
#ユウ
公園は静かでいいなあ。
鳥の声が聞こえるね。

#
（周りを見渡すと、人はまばらで静かな公園でした）

#ミナ
ほら、鳩が集まってるよ。
パンをあげてみようか？

@choice_park
- パンをあげる => feed_birds
- やめておく => dont_feed
- ミナに話しかける => call mina_park_talk

@mina_park_talk
#ミナ
昨日見た映画、すごくよかったんだ。

#ユウ
へえ、また教えて。
@return

@feed_birds
#ユウ
鳩にパンをあげたよ。
たくさん集まってきたね。

@goto ending

@dont_feed
#ユウ
やめておこう。
自然の生態系を乱さないほうがいいよね。

@goto ending

@library
#ユウ
本って落ち着くよね。
静かな雰囲気が好きなんだ。

#ミナ
今日の新刊はなんだろう。
ミステリー小説を探してみようか？

@choice_library
- ミステリーを探す => mystery
- 科学の本を探す => science
- 司書さんに聞く => call ask_librarian

@ask_librarian
#司書
新刊コーナーは奥です。
@return

@mystery
#ユウ
このミステリー小説、面白そうだね。
借りていこうか。

@goto ending

@science
#ユウ
最新の科学の本を見つけたよ。
知識が広がりそうだね。

@goto ending

@cafe
#ユウ
このカフェの雰囲気、好きだな。

#ミナ
コーヒーが美味しいよね。
ケーキも食べてみる？

@choice_cafe
- ケーキを注文する => cake
- コーヒーだけにする => coffee_only

@cake
#ユウ
このショートケーキ、すごく美味しいよ。
また来たいね。

@goto ending

@coffee_only
#ユウ
コーヒーだけで十分だよ。
香りが素晴らしいね。

@goto ending

@ending
#ナレーター
楽しい一日が過ごせました。

@choice_end
- もう一度やり直す => morning
- 終了する => end

@end

`;

        // 初期化
        this.init();
    }

    initSyncEditorOnLabelJump() {
        if (!this.syncEditorOnLabelJump) return;
        const stored = localStorage.getItem(this.SYNC_EDITOR_LABEL_KEY);
        if (stored !== null) {
            this.syncEditorOnLabelJump.checked = stored === "1";
        }
        this.syncEditorOnLabelJump.addEventListener("change", () => {
            localStorage.setItem(
                this.SYNC_EDITOR_LABEL_KEY,
                this.syncEditorOnLabelJump.checked ? "1" : "0"
            );
        });
    }

    isSyncEditorOnLabelJumpEnabled() {
        return !this.syncEditorOnLabelJump || this.syncEditorOnLabelJump.checked;
    }

    /** コンソール確認用: novelPlayer.getPreviewDebugState() */
    getPreviewDebugState() {
        const line = this.script[this.viewIndex];
        return {
            viewIndex: this.viewIndex,
            playbackIndex: this.index,
            callStackDepth: this.callStack.length,
            callStack: this.callStack.map((f) => ({
                index: f.index,
                returnToChoice: f.returnToChoice,
                at: this.script[f.index]?.type,
            })),
            nearLabel: this.getLabelForIndex(this.viewIndex),
            currentItem: line
                ? { type: line.type, sourceLine: line.sourceLine }
                : null,
        };
    }

    debounce(fn, ms) {
        let timer = null;
        return () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(fn, ms);
        };
    }

    initScenarioEditor() {
        if (!this.scriptEditorHost || !window.ScenarioEditor) {
            console.error("ScenarioEditor が読み込まれていません");
            return;
        }
        this.scenarioEditor = window.ScenarioEditor.create(this.scriptEditorHost, {
            onChange: () => this.updateScriptDebounced(),
            onPreviewShortcut: () => this.previewFromEditorLine(),
        });
    }

    getScriptText() {
        return this.scenarioEditor ? this.scenarioEditor.getValue() : "";
    }

    setScriptText(text) {
        if (this.scenarioEditor) {
            this.scenarioEditor.setValue(text);
        }
    }

    isEditorFocused() {
        return this.scenarioEditor ? this.scenarioEditor.isFocused() : false;
    }

    focusEditor() {
        this.scenarioEditor?.focus();
    }

    init() {
        // 初期スクリプトをエディタに表示
        this.setScriptText(this.defaultScript.trim());
        this.updateScript();

        // 次へボタンの初期状態設定（ゲーム開始時は表示）
        this.nextBtn.style.display = "block";
    }

    resetPreviewState() {
        this.previewHistory = [];
        this.index = 0;
        this.lineUnitIndex = 0;
        this.viewIndex = 0;
        this.viewLineUnit = 0;
        this.lastJumpLabel = "";
        this.callStack = [];
        this.updatePrevButton();
    }

    updateScript(options = {}) {
        const preservePosition = options.preservePreviewPosition !== false;
        const anchor = preservePosition ? this.capturePreviewAnchor() : null;

        const rawScript = this.getScriptText();
        const parseResult = this.parser.parse(rawScript);
        this.script = parseResult.script;
        this.labels = parseResult.labels;
        this.labelSourceLines = parseResult.labelSourceLines || {};
        this.callStack = [];

        const resolved =
            preservePosition && anchor
                ? this.resolvePreviewAnchorAfterParse(anchor)
                : { viewIndex: 0, viewLineUnit: 0 };
        this.viewIndex = resolved.viewIndex;
        this.viewLineUnit = resolved.viewLineUnit;
        this.renderCurrentView();
        this.refreshReferenceErrors();
    }

    isNovelMenuOpen() {
        return (
            this.novelMenuPanel && this.novelMenuPanel.classList.contains("is-open")
        );
    }

    isScriptDiagnosticsOpen() {
        return this.scriptDiagnostics && this.scriptDiagnostics.open;
    }

    refreshLabelUI() {
        this.refreshLabelList();
        this.refreshLabelFlowIfOpen();
    }

    getLabelFilterText() {
        return (this.labelFilterInput?.value || "").trim().toLowerCase();
    }

    getLabelFlowFilterText() {
        return (this.labelFlowModalFilter?.value || "").trim().toLowerCase();
    }

    isLabelFlowModalOpen() {
        return this.labelFlowModal && this.labelFlowModal.style.display === "block";
    }

    openLabelFlowModal() {
        if (!this.labelFlowModal) return;
        if (this.labelFlowModalFilter && this.labelFilterInput) {
            this.labelFlowModalFilter.value = this.labelFilterInput.value;
        }
        this.refreshLabelFlow();
        this.labelFlowModal.style.display = "block";
        if (this.labelFlowModalFilter) {
            this.labelFlowModalFilter.focus();
        }
    }

    closeLabelFlowModal() {
        if (this.labelFlowModal) {
            this.labelFlowModal.style.display = "none";
        }
    }

    refreshLabelFlowIfOpen() {
        if (this.isLabelFlowModalOpen()) {
            this.refreshLabelFlow();
        }
    }

    capturePreviewAnchor() {
        const vi = this.viewIndex;
        const line = this.script[vi];
        return {
            label: this.script.length ? this.getLabelForIndex(vi) : null,
            viewIndex: vi,
            viewLineUnit: this.viewLineUnit || 0,
            sourceLine: line?.sourceLine,
            itemType: line?.type,
            speaker: line?.type === "line" ? line.name : null,
            textHead:
                line?.type === "line"
                    ? (line.text || "").split("\n")[0].trim().slice(0, 80)
                    : null,
            choiceKey:
                line?.type === "choice"
                    ? line.choices.map((c) => c.text).join("|")
                    : null,
            editorSourceLine: this.isEditorFocused()
                ? this.getEditorSourceLine()
                : null,
        };
    }

    resolvePreviewAnchorAfterParse(anchor) {
        if (anchor.editorSourceLine !== null) {
            const byCursor = this.findPreviewIndexForSourceLine(anchor.editorSourceLine);
            if (byCursor) return byCursor;
        }
        if (anchor.label && this.labels.hasOwnProperty(anchor.label)) {
            const inLabel = this.findPositionWithinLabel(anchor.label, anchor);
            if (inLabel) return inLabel;
        }
        if (anchor.itemType === "line" && anchor.speaker !== null) {
            const byLine = this.findLineByContent(anchor.speaker, anchor.textHead, anchor);
            if (byLine) return byLine;
        }
        if (anchor.itemType === "choice" && anchor.choiceKey) {
            const byChoice = this.findChoiceByKey(anchor.choiceKey);
            if (byChoice) return byChoice;
        }
        if (anchor.sourceLine != null) {
            const bySource = this.findPreviewIndexForSourceLine(anchor.sourceLine);
            if (bySource) return bySource;
        }
        return {
            viewIndex: this.clampScriptIndex(anchor.viewIndex),
            viewLineUnit: anchor.viewLineUnit || 0,
        };
    }

    getNextLabelPosition(afterIndex) {
        let min = this.script.length;
        for (const pos of Object.values(this.labels)) {
            if (pos > afterIndex && pos < min) min = pos;
        }
        return min;
    }

    lineContentMatches(line, anchor) {
        if (anchor.speaker !== null && line.name !== anchor.speaker) return false;
        if (!anchor.textHead) return true;
        const head = (line.text || "").split("\n")[0].trim();
        if (head === anchor.textHead) return true;
        if (head.startsWith(anchor.textHead) || anchor.textHead.startsWith(head)) {
            return true;
        }
        const minLen = Math.min(head.length, anchor.textHead.length, 16);
        return minLen >= 4 && head.slice(0, minLen) === anchor.textHead.slice(0, minLen);
    }

    resolveLineUnitForAnchor(lineItem, anchor) {
        const parts = (lineItem.text || "").split("\n");
        if (!this.isPreviewLineUnit() || parts.length <= 1) return 0;
        if (anchor.editorSourceLine != null) {
            return this.getLineUnitForSourceLine(lineItem, anchor.editorSourceLine);
        }
        return Math.min(anchor.viewLineUnit || 0, parts.length - 1);
    }

    findPositionWithinLabel(labelName, anchor) {
        const start = this.labels[labelName];
        const end = this.getNextLabelPosition(start);
        for (let i = start; i < end; i++) {
            const line = this.script[i];
            if (line.type === "line" && this.lineContentMatches(line, anchor)) {
                return {
                    viewIndex: i,
                    viewLineUnit: this.resolveLineUnitForAnchor(line, anchor),
                };
            }
            if (
                line.type === "choice" &&
                anchor.itemType === "choice" &&
                line.choices.map((c) => c.text).join("|") === anchor.choiceKey
            ) {
                return { viewIndex: i, viewLineUnit: 0 };
            }
        }
        return { viewIndex: start, viewLineUnit: 0 };
    }

    findLineByContent(speaker, textHead, anchor) {
        for (let i = 0; i < this.script.length; i++) {
            const line = this.script[i];
            if (line.type !== "line" || line.name !== speaker) continue;
            if (textHead && !this.lineContentMatches(line, anchor)) continue;
            return {
                viewIndex: i,
                viewLineUnit: this.resolveLineUnitForAnchor(line, anchor),
            };
        }
        return null;
    }

    findChoiceByKey(choiceKey) {
        for (let i = 0; i < this.script.length; i++) {
            const line = this.script[i];
            if (
                line.type === "choice" &&
                line.choices.map((c) => c.text).join("|") === choiceKey
            ) {
                return { viewIndex: i, viewLineUnit: 0 };
            }
        }
        return null;
    }

    getLineUnitForSourceLine(lineItem, targetSourceLine) {
        const rawLines = this.getScriptText().split("\n");
        const start = lineItem.sourceLine;
        if (start === undefined) return 0;
        if (targetSourceLine <= start) return 0;

        const parts = (lineItem.text || "").split("\n");
        let unit = 0;
        let i = start + 1;
        while (i < rawLines.length) {
            const t = rawLines[i].trim();
            if (t === "" || t.startsWith("#") || t.startsWith("@") || t.startsWith("//")) {
                break;
            }
            if (i === targetSourceLine) return unit;
            unit++;
            if (unit >= parts.length) return parts.length - 1;
            i++;
        }
        if (targetSourceLine === start) return 0;
        return Math.min(Math.max(0, targetSourceLine - start - 1), parts.length - 1);
    }

    pushPreviewHistory(state) {
        const top = this.previewHistory[this.previewHistory.length - 1];
        if (
            top &&
            top.viewIndex === state.viewIndex &&
            top.viewLineUnit === state.viewLineUnit
        ) {
            return;
        }
        this.previewHistory.push({
            viewIndex: state.viewIndex,
            viewLineUnit: state.viewLineUnit,
        });
        if (this.previewHistory.length > 150) this.previewHistory.shift();
        this.updatePrevButton();
    }

    updatePrevButton() {
        if (this.prevBtn) {
            this.prevBtn.disabled = this.previewHistory.length === 0;
        }
        this.updateLastChoiceButton();
    }

    hasChoiceInHistory() {
        for (let i = this.previewHistory.length - 1; i >= 0; i--) {
            const item = this.script[this.previewHistory[i].viewIndex];
            if (item && item.type === "choice") return true;
        }
        return false;
    }

    updateLastChoiceButton() {
        if (this.prevChoiceBtn) {
            this.prevChoiceBtn.disabled = !this.hasChoiceInHistory();
        }
    }

    jumpToLastChoice() {
        for (let i = this.previewHistory.length - 1; i >= 0; i--) {
            const state = this.previewHistory[i];
            const item = this.script[state.viewIndex];
            if (item && item.type === "choice") {
                this.previewHistory = this.previewHistory.slice(0, i);
                this.callStack = [];
                this.viewIndex = state.viewIndex;
                this.viewLineUnit = state.viewLineUnit;
                this.renderCurrentView();
                this.updatePrevButton();
                return;
            }
        }
    }

    previewFromEditorLine() {
        const lineNum = this.getEditorSourceLine();
        const pos = this.findPreviewIndexForSourceLine(lineNum);
        if (!pos || !this.script.length) return;

        this.pushPreviewHistory({
            viewIndex: this.viewIndex,
            viewLineUnit: this.viewLineUnit,
        });
        this.callStack = [];
        this.viewIndex = pos.viewIndex;
        this.viewLineUnit = pos.viewLineUnit;
        this.renderCurrentView();
    }

    refreshReferenceErrors() {
        if (typeof collectReferenceErrors !== "function") return;

        const errors = collectReferenceErrors(this.script, this.labels);
        this.updateReferenceErrorBadge(errors);
        if (this.isScriptDiagnosticsOpen()) {
            this.renderReferenceErrorList(errors);
        }
    }

    updateReferenceErrorBadge(errors) {
        if (!this.refErrorBadge) return;
        if (errors.length === 0) {
            this.refErrorBadge.textContent = "なし";
            this.refErrorBadge.classList.remove("has-errors");
        } else {
            this.refErrorBadge.textContent = String(errors.length);
            this.refErrorBadge.classList.add("has-errors");
        }
    }

    renderReferenceErrorList(errors) {
        if (!this.refErrorList) return;

        this.refErrorList.innerHTML = "";

        if (errors.length === 0) {
            const empty = document.createElement("li");
            empty.className = "ref-error-list-empty";
            empty.textContent = "未定義ラベルへの参照はありません";
            this.refErrorList.appendChild(empty);
            return;
        }

        errors.forEach((err) => {
            const li = document.createElement("li");
            li.className = "ref-error-item";
            const btn = document.createElement("button");
            btn.type = "button";
            const lineLabel =
                err.sourceLine !== undefined ? `${err.sourceLine + 1}行目: ` : "";
            btn.textContent = lineLabel + err.message;
            btn.title = "エディタの該当行へ移動";
            btn.addEventListener("click", () => {
                if (err.sourceLine !== undefined) {
                    this.moveEditorToSourceLine(err.sourceLine);
                }
            });
            li.appendChild(btn);
            this.refErrorList.appendChild(li);
        });
    }

    showPrev() {
        const state = this.previewHistory.pop();
        if (!state) return;
        this.viewIndex = state.viewIndex;
        this.viewLineUnit = state.viewLineUnit;
        this.renderCurrentView();
        this.updatePrevButton();
    }

    getEditorSourceLine() {
        if (this.scenarioEditor) {
            return this.scenarioEditor.getCursorLine();
        }
        return 0;
    }

    findPreviewIndexForSourceLine(targetLine) {
        const lines = this.getScriptText().split("\n");
        const trimmed = (lines[targetLine] || "").trim();
        if (
            trimmed.startsWith("@") &&
            !trimmed.startsWith("@goto") &&
            !trimmed.startsWith("@call") &&
            trimmed !== "@return" &&
            trimmed !== "@end"
        ) {
            const name = trimmed.substring(1);
            if (this.labels.hasOwnProperty(name)) {
                return { viewIndex: this.labels[name], viewLineUnit: 0 };
            }
        }
        let best = 0;
        let bestLine = -1;
        for (let i = 0; i < this.script.length; i++) {
            const sl = this.script[i].sourceLine;
            if (sl !== undefined && sl <= targetLine && sl >= bestLine) {
                bestLine = sl;
                best = i;
            }
        }
        const line = this.script[best];
        const viewLineUnit =
            line?.type === "line"
                ? this.getLineUnitForSourceLine(line, targetLine)
                : 0;
        return { viewIndex: best, viewLineUnit };
    }

    getLabelForIndex(idx) {
        let best = null;
        let bestPos = -1;
        for (const [name, pos] of Object.entries(this.labels)) {
            if (pos <= idx && pos > bestPos) {
                bestPos = pos;
                best = name;
            }
        }
        return best;
    }

    clampScriptIndex(idx) {
        if (!this.script.length) return 0;
        return Math.max(0, Math.min(idx, this.script.length - 1));
    }

    refreshLabelList() {
        if (!this.labelList || !this.isNovelMenuOpen()) return;
        let names = Object.keys(this.labels).sort((a, b) => this.labels[a] - this.labels[b]);
        const filter = this.getLabelFilterText();
        if (filter) {
            names = names.filter((n) => n.toLowerCase().includes(filter));
        }
        const current = this.script.length
            ? this.getLabelForIndex(this.viewIndex)
            : null;

        this.labelList.innerHTML = "";
        if (Object.keys(this.labels).length === 0) {
            const empty = document.createElement("span");
            empty.className = "label-list-empty";
            empty.textContent = "（ラベルなし）";
            this.labelList.appendChild(empty);
            return;
        }
        if (names.length === 0) {
            const empty = document.createElement("span");
            empty.className = "label-list-empty";
            empty.textContent = "（該当なし）";
            this.labelList.appendChild(empty);
            return;
        }

        names.forEach((name) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "label-chip";
            if (name === current) btn.classList.add("is-current");
            btn.textContent = name;
            btn.title = `@${name} へ移動`;
            btn.setAttribute("role", "listitem");
            btn.addEventListener("click", () => this.jumpToLabelByName(name));
            this.labelList.appendChild(btn);
        });

        const currentBtn = this.labelList.querySelector(".label-chip.is-current");
        if (currentBtn) {
            currentBtn.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
    }

    refreshLabelFlow() {
        const container = this.labelFlowModalList;
        if (!container || typeof buildLabelFlow !== "function") return;

        const filter = this.getLabelFlowFilterText();
        let flows = buildLabelFlow(this.script, this.labels);
        if (filter) {
            flows = flows.filter((f) => f.name.toLowerCase().includes(filter));
        }

        container.innerHTML = "";
        if (Object.keys(this.labels).length === 0) {
            const empty = document.createElement("p");
            empty.className = "label-flow-empty";
            empty.textContent = "（ラベルなし）";
            container.appendChild(empty);
            return;
        }
        if (flows.length === 0) {
            const empty = document.createElement("p");
            empty.className = "label-flow-empty";
            empty.textContent = "（該当なし）";
            container.appendChild(empty);
            return;
        }

        const current = this.script.length
            ? this.getLabelForIndex(this.viewIndex)
            : null;

        flows.forEach((flow) => {
            const block = document.createElement("div");
            block.className = "label-flow-item";
            if (flow.name === current) block.classList.add("is-current");

            const head = document.createElement("button");
            head.type = "button";
            head.className = "label-flow-name";
            head.textContent = `@${flow.name}`;
            head.title = "このラベルへプレビュー";
            head.addEventListener("click", () => this.jumpToLabelByName(flow.name));
            block.appendChild(head);

            const body = document.createElement("div");
            body.className = "label-flow-body";

            if (flow.incoming.length === 0) {
                const line = document.createElement("div");
                line.className = "label-flow-line label-flow-in";
                line.textContent = "← なし（入口の可能性）";
                body.appendChild(line);
            } else {
                flow.incoming.forEach((ref) => {
                    this.appendLabelFlowLine(body, "← ", ref, "in");
                });
            }

            if (flow.outgoing.length === 0) {
                const line = document.createElement("div");
                line.className = "label-flow-line label-flow-out";
                line.textContent = "→ （分岐・ジャンプなし）";
                body.appendChild(line);
            } else {
                flow.outgoing.forEach((ref) => {
                    this.appendLabelFlowLine(body, "→ ", ref, "out");
                });
            }

            block.appendChild(body);
            container.appendChild(block);
        });
    }

    appendLabelFlowLine(parent, prefix, ref, direction) {
        const line = document.createElement("div");
        line.className =
            "label-flow-line label-flow-" + (direction === "out" ? "out" : "in");

        if (prefix) {
            line.appendChild(document.createTextNode(prefix));
        }

        const parts =
            typeof getLabelFlowRefParts === "function"
                ? getLabelFlowRefParts(ref, direction)
                : [{ type: "text", value: formatLabelFlowRef(ref, direction) }];

        for (const part of parts) {
            if (part.type === "label") {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "label-flow-link";
                btn.textContent = part.value;
                const exists = this.labels.hasOwnProperty(part.value);
                btn.title = exists
                    ? `@${part.value} へ移動`
                    : `未定義ラベル「${part.value}」`;
                if (!exists) btn.classList.add("is-missing");
                if (exists) {
                    btn.addEventListener("click", () =>
                        this.jumpToLabelByName(part.value)
                    );
                } else {
                    btn.disabled = true;
                }
                line.appendChild(btn);
            } else {
                line.appendChild(document.createTextNode(part.value));
            }
        }

        parent.appendChild(line);
    }

    isPreviewLineUnit() {
        return this.previewUnit && this.previewUnit.value === "line";
    }

    /** 本文 @call の戻り先（@call 直後が @ラベル でもファイル順の続きへ） */
    getContinuationAfterCall(callIndex, targetLabel) {
        if (!this.labels.hasOwnProperty(targetLabel)) {
            return callIndex + 1;
        }
        const callItem = this.script[callIndex];
        const callSource = callItem.sourceLine ?? -1;
        const subStart = this.labels[targetLabel];
        let depth = 0;
        let returnScriptIdx = -1;
        for (let i = subStart; i < this.script.length; i++) {
            const item = this.script[i];
            if (item.type === "call") depth++;
            else if (item.type === "return") {
                if (depth === 0) {
                    returnScriptIdx = i;
                    break;
                }
                depth--;
            }
        }
        if (returnScriptIdx < 0) {
            console.warn(
                `@call ${targetLabel}: サブルーチンに @return がありません`
            );
            return Math.min(callIndex + 1, this.script.length);
        }
        for (let i = callIndex + 1; i < this.script.length; i++) {
            const sl = this.script[i].sourceLine;
            if (sl === undefined || sl <= callSource) continue;
            if (i >= subStart && i <= returnScriptIdx) continue;
            return i;
        }
        return returnScriptIdx + 1;
    }

    pushCallReturn(callScriptIndex, targetLabel, isFromChoice) {
        const index = isFromChoice
            ? callScriptIndex
            : this.getContinuationAfterCall(callScriptIndex, targetLabel);
        this.callStack.push({
            index,
            lineUnitIndex: 0,
            returnToChoice: isFromChoice,
        });
    }

    applyReturnFrame(frame) {
        this.index = frame.index;
        this.lineUnitIndex = frame.lineUnitIndex;
        this.viewIndex = frame.index;
        this.viewLineUnit = frame.lineUnitIndex;
        if (frame.returnToChoice) {
            this.renderCurrentView();
        } else {
            this.showLine();
        }
    }

    paintAt(index, lineUnitIndex) {
        const line = this.script[index];
        if (!line) return false;

        if (line.type === "line") {
            const rawText = line.text != null ? line.text : "";
            const parts = rawText.split("\n");
            const useLineUnit = this.isPreviewLineUnit() && parts.length > 1;
            const displayText = useLineUnit ? parts[lineUnitIndex] : rawText;

            if (line.name.trim() === "") {
                this.nameBox.style.display = "none";
                this.nameBox.textContent = "";
            } else {
                this.nameBox.style.display = "block";
                this.nameBox.textContent = line.name;
            }

            this.textBox.textContent = displayText;
            this.nextBtn.style.display = "block";
            this.choicesBox.innerHTML = "";
            this.scrollTextContainerToTop();
            return true;
        }

        if (line.type === "choice") {
            this.nextBtn.style.display = "none";
            this.choicesBox.innerHTML = "";
            this.nameBox.style.display = "none";
            this.nameBox.textContent = "";
            this.textBox.textContent = line.description || "";

            line.choices.forEach((choice) => {
                const btn = document.createElement("button");
                btn.textContent = choice.text;
                btn.onclick = () => {
                    this.pushPreviewHistory({
                        viewIndex: this.viewIndex,
                        viewLineUnit: this.viewLineUnit,
                    });
                    if (this.labels.hasOwnProperty(choice.target)) {
                        if (choice.mode === "call") {
                            this.pushCallReturn(index, choice.target, true);
                        }
                        this.viewIndex = this.labels[choice.target];
                        this.viewLineUnit = 0;
                        this.renderCurrentView();
                    } else {
                        console.error(`ラベル "${choice.target}" が見つかりません`);
                        this.viewIndex = index + 1;
                        this.viewLineUnit = 0;
                        this.renderCurrentView();
                    }
                };
                this.choicesBox.appendChild(btn);
            });
            this.scrollTextContainerToTop();
            return true;
        }

        if (line.type === "end") {
            this.nameBox.textContent = "";
            this.textBox.textContent = "（終わり）";
            this.nextBtn.style.display = "none";
            this.choicesBox.innerHTML = "";
            return true;
        }

        return false;
    }

    syncPlaybackIndexAfterView(viewIndex, viewLineUnit) {
        const line = this.script[viewIndex];
        if (!line) return;

        if (line.type === "line") {
            const parts = (line.text != null ? line.text : "").split("\n");
            const useLineUnit = this.isPreviewLineUnit() && parts.length > 1;
            if (useLineUnit && viewLineUnit < parts.length - 1) {
                this.index = viewIndex;
                this.lineUnitIndex = viewLineUnit + 1;
            } else {
                this.index = viewIndex + 1;
                this.lineUnitIndex = 0;
            }
        } else if (line.type === "choice") {
            this.index = viewIndex;
            this.lineUnitIndex = 0;
        } else if (line.type === "end") {
            this.index = viewIndex + 1;
            this.lineUnitIndex = 0;
        }
        this.viewIndex = viewIndex;
        this.viewLineUnit = viewLineUnit;
    }

    showEndState() {
        this.nameBox.textContent = "";
        this.textBox.textContent = "（終わり）";
        this.nextBtn.style.display = "none";
        this.choicesBox.innerHTML = "";
    }

    renderCurrentView() {
        if (!this.script.length) {
            this.showEndState();
            this.refreshLabelUI();
            return;
        }

        let idx = this.clampScriptIndex(this.viewIndex);
        let lu = this.viewLineUnit || 0;

        while (idx < this.script.length) {
            const line = this.script[idx];
            if (line.type === "goto" || line.type === "call") {
                if (this.labels.hasOwnProperty(line.target)) {
                    idx = this.labels[line.target];
                    lu = 0;
                    continue;
                }
                idx++;
                continue;
            }
            if (line.type === "return") {
                const frame = this.callStack.pop();
                if (frame) {
                    idx = frame.index;
                    lu = frame.lineUnitIndex || 0;
                    this.index = idx;
                    this.lineUnitIndex = lu;
                    if (frame.returnToChoice) {
                        if (this.paintAt(idx, 0)) {
                            this.syncPlaybackIndexAfterView(idx, 0);
                            this.refreshLabelUI();
                            return;
                        }
                    }
                    continue;
                }
                idx++;
                continue;
            }
            if (line.type === "blank" || line.type === "comment") {
                idx++;
                continue;
            }
            if (line.type === "line") {
                const parts = (line.text != null ? line.text : "").split("\n");
                const useLineUnit = this.isPreviewLineUnit() && parts.length > 1;
                if (useLineUnit && lu >= parts.length) {
                    lu = parts.length - 1;
                }
                if (this.paintAt(idx, lu)) {
                    this.syncPlaybackIndexAfterView(idx, lu);
                    this.refreshLabelUI();
                    return;
                }
            }
            if (line.type === "choice" || line.type === "end") {
                if (this.paintAt(idx, 0)) {
                    this.syncPlaybackIndexAfterView(idx, 0);
                    this.refreshLabelUI();
                    return;
                }
            }
            idx++;
        }

        this.showEndState();
        this.refreshLabelUI();
    }

    showLine() {
        if (this.index >= this.script.length) {
            this.showEndState();
            return;
        }

        const line = this.script[this.index];
        if (line.type === "goto") {
            if (this.labels.hasOwnProperty(line.target)) {
                this.index = this.labels[line.target];
                this.lineUnitIndex = 0;
                this.showLine();
            } else {
                console.error(`ラベル "${line.target}" が見つかりません`);
                this.index++;
                this.showLine();
            }
            return;
        }
        if (line.type === "call") {
            if (this.labels.hasOwnProperty(line.target)) {
                this.pushCallReturn(this.index, line.target, false);
                this.index = this.labels[line.target];
                this.lineUnitIndex = 0;
                this.showLine();
            } else {
                console.error(`ラベル "${line.target}" が見つかりません`);
                this.index++;
                this.showLine();
            }
            return;
        }
        if (line.type === "return") {
            const frame = this.callStack.pop();
            if (frame) {
                this.applyReturnFrame(frame);
            } else {
                console.warn("@return に対応する @call がありません");
                this.index++;
                this.showLine();
            }
            return;
        }
        if (line.type === "blank" || line.type === "comment") {
            this.index++;
            this.showLine();
            return;
        }

        const lu =
            line.type === "line" && this.isPreviewLineUnit()
                ? this.lineUnitIndex
                : 0;
        if (this.paintAt(this.index, lu)) {
            this.pushPreviewHistory({
                viewIndex: this.viewIndex,
                viewLineUnit: this.viewLineUnit,
            });
            this.syncPlaybackIndexAfterView(this.index, lu);
        } else {
            this.index++;
            this.showLine();
        }
    }

    // テキストコンテナを上部にスクロールする
    scrollTextContainerToTop() {
        // 少し遅延させてDOMの更新が完了した後にスクロール
        setTimeout(() => {
            this.textContainer.scrollTop = 0;
        }, 10);
    }

    restart() {
        this.previewHistory = [];
        this.index = 0;
        this.lineUnitIndex = 0;
        this.viewIndex = 0;
        this.viewLineUnit = 0;
        this.callStack = [];
        this.renderCurrentView();
        this.updatePrevButton();
    }

    moveEditorToSourceLine(lineNum) {
        if (this.scenarioEditor) {
            this.scenarioEditor.goToLine(lineNum);
        }
    }

    jumpToLabelByName(labelName) {
        if (!labelName || !this.labels.hasOwnProperty(labelName)) {
            alert(`ラベル "${labelName}" が見つかりません`);
            return;
        }
        this.closeLabelFlowModal();
        this.pushPreviewHistory({
            viewIndex: this.viewIndex,
            viewLineUnit: this.viewLineUnit,
        });
        this.callStack = [];
        this.lastJumpLabel = labelName;
        this.viewIndex = this.labels[labelName];
        this.viewLineUnit = 0;
        this.renderCurrentView();

        if (
            this.isSyncEditorOnLabelJumpEnabled() &&
            this.labelSourceLines[labelName] !== undefined
        ) {
            this.moveEditorToSourceLine(this.labelSourceLines[labelName]);
        }
    }

    // テキストエリアの内容をクリップボードにコピー
    copyToClipboard() {
        this.copyOriginalText();
    }

    // シナリオをテキストファイルとして保存
    saveScriptToFile() {
        const scriptContent = this.getScriptText();
        const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
        if (typeof saveFileBlob === "function") saveFileBlob(blob, "scenario", "txt");
        setTimeout(() => this.focusEditor(), 200);
    }

    // シナリオをクリップボードにコピー
    copyOriginalText() {
        const text = this.getScriptText();
        const copy = async () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                this.scenarioEditor?.selectAll();
                document.execCommand("copy");
            }
            if (typeof showTemporaryNotification === "function") {
                showTemporaryNotification("コピーしました");
            }
            setTimeout(() => this.focusEditor(), 200);
        };
        copy().catch((err) => {
            console.error("クリップボードへのコピーに失敗しました:", err);
        });
    }

    // ファイルからシナリオを読み込み
    loadScriptFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.setScriptText(content);
            this.resetPreviewState();
            this.updateScript({ preservePreviewPosition: false });

            this.fileInput.value = '';

            setTimeout(() => this.focusEditor(), 200);
        };
        reader.readAsText(file);
    }

    clearScriptText() {
        if (confirm('テキストエリアをクリアしますか？')) {
            this.setScriptText('');
            this.resetPreviewState();
            this.updateScript({ preservePreviewPosition: false });

            setTimeout(() => this.focusEditor(), 200);
        }
    }
}
