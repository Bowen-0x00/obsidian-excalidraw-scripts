---
name: 导出至 Eagle
description: 将当前选中的元素或纯图片快速推送保存至 Eagle 灵感库。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板元素后运行，弹出非模态悬浮窗（可拖拽标题栏移动），不影响画板操作。
features:
  - 悬浮非模态 UI 面板（支持自由拖拽）
  - 自动识别纯图片直传，混合元素渲染 SVG 上传
  - 导出失败时智能提示检查 Eagle 软件与 API 状态
---
/*
```javascript
*/
var locales = {
    zh: {
        notice_select: "请先选中需要导出的连线或元素！",
        export_title: "🦅 导出至 Eagle",
        tags_label: "标签 (逗号分隔)",
        tags_ph: "例如: Obsidian, Excalidraw",
        btn_export: "确认导出",
        btn_exporting: "发送中...",
        settings_toggle: "⚙️ 接口设置",
        eagle_url: "Eagle 接口",
        eagle_token: "Eagle 令牌 (Token)",
        export_success: "✅ 成功发送到 Eagle！",
        export_fail: "❌ 导出失败！请检查：\n1. Eagle 软件是否已打开\n2. Token 与端口设置是否正确",
        file_not_found: "找不到图片源文件: {id}"
    },
    en: {
        notice_select: "Please select elements to export first!",
        export_title: "🦅 Export to Eagle",
        tags_label: "Tags (Comma separated)",
        tags_ph: "e.g., Obsidian, Excalidraw",
        btn_export: "Confirm Export",
        btn_exporting: "Sending...",
        settings_toggle: "⚙️ API Settings",
        eagle_url: "Eagle URL",
        eagle_token: "Eagle Token",
        export_success: "✅ Successfully sent to Eagle!",
        export_fail: "❌ Export failed! Please check:\n1. Is Eagle running?\n2. Are URL/Token correct?",
        file_not_found: "Source file not found: {id}"
    }
};

const path = require('path');
const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

await ea.addElementsToView(); 
const targetView = ea.targetView;
const plugin = ea.plugin;
const activeFile = app.workspace.getActiveFile();

const isAllImages = selectedEls.every(el => el.type === "image");

// SVG Base64
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
if (!isAllImages) {
    try {
        let svgNode = await targetView.svg(targetView.getScene(true), undefined, true);
        if (plugin.settings.exportSVGFont) svgNode = embedFontsInSVG(svgNode, plugin);
        base64SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgNode.outerHTML.replaceAll("&nbsp;", " "))))}`;
    } catch(e) {
        console.warn("SVG Generate Warn:", e);
    }
}

// 读取设置
let settings = ea.getScriptSettings() || {};
if (!settings["ymjr_eagle_config"]) {
    settings["ymjr_eagle_config"] = { 
        "eagle url": "http://localhost:41595",
        "eagle token": "bcb88edd-23c6-434a-beb1-b7d891cf3613" 
    };
    ea.setScriptSettings(settings);
}
const currentConfig = Object.assign({}, settings["ymjr_eagle_config"]);

// 清理旧 UI 并注入新 UI
if (ExcalidrawAutomate.plugin._ymjr_eaglePanel) {
    ExcalidrawAutomate.plugin._ymjr_eaglePanel.remove();
}
document.getElementById("ymjr-eagle-style")?.remove();

const styleEl = document.createElement("style");
styleEl.id = "ymjr-eagle-style";
styleEl.innerHTML = `
    .ymjr-eagle-panel {
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
panel.className = "ymjr-eagle-panel";
panel.innerHTML = `
    <div class="ymjr-header" id="eagle-drag-header">
        <span>${t("export_title")}</span>
        <button class="ymjr-close">×</button>
    </div>
    <div class="ymjr-body">
        <div class="ymjr-form-group">
            <label>${t("tags_label")}</label>
            <input type="text" id="eagle-tags" class="ymjr-input" placeholder="${t("tags_ph")}" value="Obsidian,Excalidraw" />
        </div>
        <div class="ymjr-settings-toggle">${t("settings_toggle")} ▾</div>
        <div id="eagle-settings" class="ymjr-settings-panel" style="display: none;">
            <div class="ymjr-form-group">
                <label>${t("eagle_url")}</label>
                <input type="text" id="cfg-eagle-url" class="ymjr-input" value="${currentConfig["eagle url"]}">
            </div>
            <div class="ymjr-form-group">
                <label>${t("eagle_token")}</label>
                <input type="text" id="cfg-eagle-token" class="ymjr-input" value="${currentConfig["eagle token"]}">
            </div>
        </div>
        <button id="eagle-btn-submit" class="ymjr-btn-submit">${t("btn_export")}</button>
    </div>
`;
document.body.appendChild(panel);
ExcalidrawAutomate.plugin._ymjr_eaglePanel = panel;

// ==== 拖拽逻辑 ====
const header = panel.querySelector('#eagle-drag-header');
let isDragging = false, startX, startY, initialLeft, initialTop;

header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.ymjr-close')) return;
    isDragging = true;
    
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
const panelSettings = panel.querySelector('#eagle-settings');
btnSettings.onclick = () => {
    panelSettings.style.display = panelSettings.style.display === "none" ? "flex" : "none";
};

const btnSubmit = panel.querySelector('#eagle-btn-submit');
btnSubmit.onclick = async () => {
    currentConfig["eagle url"] = panel.querySelector('#cfg-eagle-url').value.trim();
    currentConfig["eagle token"] = panel.querySelector('#cfg-eagle-token').value.trim();
    settings["ymjr_eagle_config"] = currentConfig;
    ea.setScriptSettings(settings);

    const tags = panel.querySelector('#eagle-tags').value.split(',').map(el => el.trim()).filter(Boolean);

    btnSubmit.disabled = true;
    btnSubmit.innerText = t("btn_exporting");

    try {
        if (isAllImages) {
            for (let selectedEl of selectedEls) {
                let embeddedFile = targetView.excalidrawData.getFile(selectedEl.fileId);
                if (!embeddedFile) {
                    new Notice(t("file_not_found", { id: selectedEl.fileId }));
                    continue;
                }
                
                let abstractPath, fileName;
                if (embeddedFile.file) {
                    abstractPath = path.join(embeddedFile.file.vault.adapter.basePath, embeddedFile.file.path);
                    fileName = embeddedFile.file.name;
                } else if (embeddedFile.hyperlink) {
                    let match = embeddedFile.hyperlink.match(/file:\/\/.*(\w:.*?)$/);
                    if (!match) continue;
                    abstractPath = decodeURIComponent(match[1]).replace('\\', '/');
                    fileName = abstractPath.match(/\/([^/]+)$/)[1];
                }
                
                let data = {
                    "path": abstractPath, "name": fileName, "website": '', 
                    "tags": tags, "token": currentConfig["eagle token"]
                };
                let res = await fetch(`${currentConfig["eagle url"]}/api/item/addFromPath`, { method: 'POST', body: JSON.stringify(data) });
                if (!res.ok) throw new Error("Eagle request failed");
            }
        } else {
            let data = { "items": [{
                "url": base64SVG,
                "name": activeFile ? activeFile.basename : "Excalidraw Export",
                "website": activeFile ? `obsidian://advanced-uri?&filepath=${activeFile.path}&block=${selectedEls[0].id}` : '',
                "tags": tags
            }]};
            let res = await fetch(`${currentConfig["eagle url"]}/api/item/addFromURLs`, { method: 'POST', body: JSON.stringify(data) });
            if (!res.ok) throw new Error("Eagle request failed");
        }
        
        new Notice(t("export_success"));
        panel.remove();
    } catch (e) {
        console.error("[Eagle Export Error]:", e);
        new Notice(t("export_fail"), 5000);
        btnSubmit.disabled = false;
        btnSubmit.innerText = t("btn_export");
    }
};