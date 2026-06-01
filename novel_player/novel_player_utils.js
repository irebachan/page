// ノベルプレイヤー共通ユーティリティ（通知・ファイル保存・クリップボード）

/** HTTPS / localhost など。file:// や LAN の http は false */
function isSecureAppContext() {
    return (
        typeof window !== "undefined" &&
        window.isSecureContext === true &&
        window.location.protocol !== "file:"
    );
}

function canUseWebShareText(text) {
    if (!isSecureAppContext() || typeof navigator.share !== "function") {
        return false;
    }
    if (typeof navigator.canShare !== "function") {
        return true;
    }
    try {
        return navigator.canShare({ text: text ?? "" });
    } catch (_) {
        return false;
    }
}

function canUseClipboardRead() {
    return isSecureAppContext() && navigator.clipboard && navigator.clipboard.readText;
}

function canUseClipboardWrite() {
    return isSecureAppContext() && navigator.clipboard && navigator.clipboard.writeText;
}

function copyTextToClipboard(text) {
    if (canUseClipboardWrite()) {
        return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
        ok = document.execCommand("copy");
    } catch (_) {
        ok = false;
    }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
}

function readTextFromClipboard() {
    if (canUseClipboardRead()) {
        return navigator.clipboard.readText();
    }
    return Promise.reject(new Error("clipboard read unavailable"));
}

function showTemporaryNotification(message) {
    const existing = document.getElementById("temp-notification");
    if (existing) document.body.removeChild(existing);
    const el = document.createElement("div");
    el.id = "temp-notification";
    el.textContent = message;
    el.style.cssText = "position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,0.7);color:white;padding:10px 15px;border-radius:4px;z-index:2000;box-shadow:0 2px 10px rgba(0,0,0,0.2);";
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2000);
}

function saveFileBlob(blob, filenamePrefix, extension) {
    const ext = extension || "txt";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    const dateStr = now.getFullYear() +
        ("0" + (now.getMonth() + 1)).slice(-2) +
        ("0" + now.getDate()).slice(-2) +
        ("0" + now.getHours()).slice(-2) +
        ("0" + now.getMinutes()).slice(-2);
    a.download = filenamePrefix + "_" + dateStr + "." + ext;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}
