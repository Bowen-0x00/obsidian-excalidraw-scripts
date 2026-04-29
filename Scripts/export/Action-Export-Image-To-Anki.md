---
name: 导出至 Anki
description: 将当前选中的元素或图片快速生成带有正面文本的 Anki 卡片。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板元素后运行，弹出非模态悬浮窗（可拖拽标题栏移动），不影响画板操作。
features:
  - 悬浮非模态 UI 面板（支持自由拖拽）
  - 导出失败时智能提示检查 AnkiConnect 服务
---
/*
```javascript
*/
var locales = {
    zh: {
        notice_select: "请先选中需要导出的连线或元素！",
        export_title: "🚀 导出至 Anki",
        anki_front: "正面内容 (Front)",
        anki_front_ph: "输入正面文本内容...",
        tags_label: "标签 (逗号分隔)",
        tags_ph: "例如: Obsidian, Excalidraw",
        btn_export: "确认导出",
        btn_exporting: "发送中...",
        settings_toggle: "⚙️ 接口设置",
        anki_url: "AnkiConnect 接口",
        export_success: "✅ 成功导出到 Anki！",
        export_fail: "❌ 导出失败！请检查：\n1. 是否已打开 Anki\n2. 是否已安装并启动 AnkiConnect 插件"
    },
    en: {
        notice_select: "Please select elements to export first!",
        export_title: "🚀 Export to Anki",
        anki_front: "Front Content",
        anki_front_ph: "Enter front text...",
        tags_label: "Tags (Comma separated)",
        tags_ph: "e.g., Obsidian, Excalidraw",
        btn_export: "Confirm Export",
        btn_exporting: "Sending...",
        settings_toggle: "⚙️ API Settings",
        anki_url: "AnkiConnect URL",
        export_success: "✅ Successfully exported to Anki!",
        export_fail: "❌ Export failed! Please check:\n1. Is Anki open?\n2. Is AnkiConnect running?"
    }
};

const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

await ea.addElementsToView(); 
const targetView = ea.targetView;
const plugin = ea.plugin;

// 提前生成 SVG Base64
function embedFontsInSVG(svg, plugin) {
    if (!plugin.settings.exportSVGFont) return svg;
    const defs = svg.querySelector("defs") || document.createElement("defs");
    if(!svg.querySelector("defs")) svg.prepend(defs);
    let fonts = `<style>`;
    let texts = svg.querySelectorAll('text');
    let fontFamilySet = new Set();
    for (let text of texts) {
        let fontFamily = text.getAttribute('font-family')?.split(',')[0];
        if (fontFamily && !fontFamilySet.has(fontFamily)) {
            let fontDef = plugin[`FontDef-${fontFamily.replace(/^"|"$/g, '')}`];
            if(fontDef) fonts += fontDef;
            fontFamilySet.add(fontFamily);
        }
    }
    fonts += `</style>`;
    defs.innerHTML += fonts;
    return svg;
}

let base64SVG = "";
try {
    let svgNode = await targetView.svg(targetView.getScene(true), undefined, true);
    if (plugin.settings.exportSVGFont) {
        svgNode = embedFontsInSVG(svgNode, plugin);
    }
    base64SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgNode.outerHTML.replaceAll("&nbsp;", " "))))}`;
} catch(e) {
    console.warn("SVG Generate Warn:", e);
}

// 读取设置
let settings = ea.getScriptSettings() || {};
if (!settings["ymjr_anki_config"]) {
    settings["ymjr_anki_config"] = { "anki url": "[http://127.0.0.1:8765](http://127.0.0.1:8765)" };
    ea.setScriptSettings(settings);
}
const currentConfig = Object.assign({}, settings["ymjr_anki_config"]);

// 清理旧 UI 并注入新 UI
if (ExcalidrawAutomate.plugin._ymjr_ankiPanel) {
    ExcalidrawAutomate.plugin._ymjr_ankiPanel.remove();
}
document.getElementById("ymjr-anki-style")?.remove();

const styleEl = document.createElement("style");
styleEl.id = "ymjr-anki-style";
styleEl.innerHTML = `
    .ymjr-anki-panel {
        position: fixed; bottom: 30px; right: 30px; z-index: 999999;
        background: var(--background-primary); border: 1px solid var(--background-modifier-border);
        border-radius: 12px; width: 340px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: flex; flex-direction: column; overflow: hidden;
        font-family: var(--font-interface); color: var(--text-normal);
        animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ymjr-header {
        padding: 14px 18px; font-weight: 600; font-size: 1.1em;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary-alt);
        cursor: grab; user-select: none;
    }
    .ymjr-header:active { cursor: grabbing; }
    .ymjr-close { cursor: pointer; opacity: 0.6; transition: 0.2s; font-size: 1.2em; border: none; background: transparent; color: inherit; padding: 0;}
    .ymjr-close:hover { opacity: 1; color: var(--text-error); }
    .ymjr-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .ymjr-form-group { display: flex; flex-direction: column; gap: 6px; }
    .ymjr-form-group label { font-size: 0.85em; opacity: 0.8; font-weight: 500; }
    .ymjr-input {
        background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border);
        border-radius: 6px; padding: 8px 10px; color: var(--text-normal); font-size: 0.95em; outline: none;
        resize: vertical; min-height: 38px;
    }
    .ymjr-input:focus { border-color: var(--interactive-accent); box-shadow: 0 0 0 2px rgba(var(--interactive-accent-rgb), 0.2); }
    .ymjr-settings-toggle { font-size: 0.85em; cursor: pointer; opacity: 0.7; user-select: none; }
    .ymjr-settings-panel {
        background: var(--background-secondary); border-radius: 8px; padding: 12px;
        display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--background-modifier-border);
    }
    .ymjr-btn-submit {
        background: var(--interactive-accent); color: var(--text-on-accent);
        border: none; border-radius: 8px; padding: 10px; font-weight: 600; font-size: 1em;
        cursor: pointer; transition: 0.2s; margin-top: 5px;
    }
    .ymjr-btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
    .ymjr-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(styleEl);

const panel = document.createElement("div");
panel.className = "ymjr-anki-panel";
panel.innerHTML = `
    <div class="ymjr-header" id="anki-drag-header">
        <span>${t("export_title")}</span>
        <button class="ymjr-close">×</button>
    </div>
    <div class="ymjr-body">
        <div class="ymjr-form-group">
            <label>${t("anki_front")}</label>
            <textarea id="anki-front" class="ymjr-input" rows="2" placeholder="${t("anki_front_ph")}"></textarea>
        </div>
        <div class="ymjr-form-group">
            <label>${t("tags_label")}</label>
            <input type="text" id="anki-tags" class="ymjr-input" placeholder="${t("tags_ph")}" value="Obsidian,Excalidraw" />
        </div>
        <div class="ymjr-settings-toggle">${t("settings_toggle")} ▾</div>
        <div id="anki-settings" class="ymjr-settings-panel" style="display: none;">
            <div class="ymjr-form-group">
                <label>${t("anki_url")}</label>
                <input type="text" id="cfg-anki-url" class="ymjr-input" value="${currentConfig["anki url"]}">
            </div>
        </div>
        <button id="anki-btn-submit" class="ymjr-btn-submit">${t("btn_export")}</button>
    </div>
`;
document.body.appendChild(panel);
ExcalidrawAutomate.plugin._ymjr_ankiPanel = panel;

// ==== 拖拽逻辑 ====
const header = panel.querySelector('#anki-drag-header');
let isDragging = false, startX, startY, initialLeft, initialTop;

header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.ymjr-close')) return; // 点关闭按钮时不触发拖拽
    isDragging = true;
    
    // 拖拽前将定位由 bottom/right 转为绝对的 left/top
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel.style.left = initialLeft + 'px';
    panel.style.top = initialTop + 'px';
    
    startX = e.clientX;
    startY = e.clientY;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
});

function onMouseMove(e) {
    if (!isDragging) return;
    panel.style.left = (initialLeft + (e.clientX - startX)) + 'px';
    panel.style.top = (initialTop + (e.clientY - startY)) + 'px';
}

function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// ==== 交互逻辑 ====
panel.querySelector('.ymjr-close').onclick = () => panel.remove();

const btnSettings = panel.querySelector('.ymjr-settings-toggle');
const panelSettings = panel.querySelector('#anki-settings');
btnSettings.onclick = () => {
    panelSettings.style.display = panelSettings.style.display === "none" ? "flex" : "none";
};

const btnSubmit = panel.querySelector('#anki-btn-submit');
btnSubmit.onclick = async () => {
    currentConfig["anki url"] = panel.querySelector('#cfg-anki-url').value.trim();
    settings["ymjr_anki_config"] = currentConfig;
    ea.setScriptSettings(settings);

    const frontText = panel.querySelector('#anki-front').value.trim();
    if (!frontText) return new Notice(t("anki_front_ph"));
    
    const tags = panel.querySelector('#anki-tags').value.split(',').map(el => el.trim()).filter(Boolean);

    btnSubmit.disabled = true;
    btnSubmit.innerText = t("btn_exporting");

    try {
        let data = {
            "action": "addNotes", "version": 6,
            "params": {
                "notes": [{
                    "deckName": "Default", "modelName": "Basic",
                    "fields": { "Front": frontText, "Back": `<img src="${base64SVG}">` },
                    "tags": tags
                }]
            }
        };
        
        let res = await fetch(currentConfig["anki url"], { method: 'POST', body: JSON.stringify(data) });
        let result = await res.json();
        if (result.error) throw new Error(result.error);
        
        new Notice(t("export_success"));
        panel.remove();
    } catch (e) {
        console.error("[Anki Export Error]:", e);
        new Notice(t("export_fail"), 5000);
        btnSubmit.disabled = false;
        btnSubmit.innerText = t("btn_export");
    }
};