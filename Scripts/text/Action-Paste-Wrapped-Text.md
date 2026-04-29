---
name: 限制宽度粘贴
description: 弹窗确认面板：将剪贴板文本粘贴至画板，并根据设定的“单行字符数”进行自动折行排版。
author: ymjr
version: 1.0.0
license: MIT
usage: 复制大段文本后运行此脚本，脚本将弹出一个输入框询问每行允许的最大字符数，随后自动读取剪贴板并在画板中心以指定宽度自动换行生成文本节点。
features:
  - 支持中英文混合的字符串截断排版算法
  - 自动拦截并处理剪贴板的异步读取
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_empty: "剪贴板为空！",
    notice_done: "✅ 粘贴排版完成",
    ui_title: "📋 粘贴排版设置",
    ui_label: "单行最大字符数:",
    ui_cancel: "取消",
    ui_confirm: "生成文本"
  },
  en: {
    notice_empty: "Clipboard is empty!",
    notice_done: "✅ Paste wrapping complete",
    ui_title: "📋 Paste Formatting Settings",
    ui_label: "Max chars per line:",
    ui_cancel: "Cancel",
    ui_confirm: "Generate Text"
  }
};
const { Notice } = ea.obsidian;

async function readClipboard() {
    if (!navigator.clipboard) return "";
    try { return await navigator.clipboard.readText(); } 
    catch (err) { console.error('Clipboard Error:', err); return ""; }
}

let clipboardData = await readClipboard();
if (!clipboardData) {
    new Notice(t("notice_empty"));
    return;
}

// 提取当前配置，如果没有则初始化
let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["pasteWrapped"] ?? { charLimit: 30 };

function createPastePanel() {
    if (document.getElementById("ea-paste-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-paste-panel";
    panel.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:260px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;
    content.innerHTML = `<b style="text-align:center; margin-bottom:5px;">${t("ui_title")}</b>`;

    const row = document.createElement('div');
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    row.innerHTML = `<label style="font-size:13px;">${t("ui_label")}</label>`;
    const limitInput = document.createElement('input');
    limitInput.type = "number";
    limitInput.value = settings.charLimit;
    limitInput.style.cssText = "width:60px; text-align:center;";
    row.appendChild(limitInput);
    content.appendChild(row);

    const footer = document.createElement('div');
    footer.style.cssText = `display:flex; justify-content:space-between; margin-top:5px; gap:10px;`;
    
    const btnCancel = document.createElement('button');
    btnCancel.innerText = t("ui_cancel");
    btnCancel.onclick = () => panel.remove();
    
    const btnConfirm = document.createElement('button');
    btnConfirm.innerText = t("ui_confirm");
    btnConfirm.className = "mod-cta";
    btnConfirm.onclick = async () => {
        const num = Number(limitInput.value) || 30;
        // 保存配置
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["pasteWrapped"] = { charLimit: num };
        await ExcalidrawAutomate.plugin.saveSettings();
        panel.remove();
        executePaste(num);
    };

    footer.appendChild(btnCancel);
    footer.appendChild(btnConfirm);
    content.appendChild(footer);
    panel.appendChild(content);
    document.body.appendChild(panel);
}

async function executePaste(num) {
    const api = ea.getExcalidrawAPI();
    const canvas = ea.targetView.contentEl.querySelector('canvas.excalidraw__canvas.interactive');
    const ctx = canvas.getContext("2d");
    
    // 清洗 HTML 标签
    let data = clipboardData
        .replace(/<span.*?>/g, '').replaceAll('</span>', '')
        .replace(/<mark.*?>/g, '').replaceAll('</mark>', '')
        .replace(/<font.*?>/g, '').replaceAll('</font>', '');

    ctx.save();
    ea.clear();
    const state = api.getAppState();
    ea.style.fontSize = state.currentItemFontSize;
    ea.style.fontFamily = state.currentItemFontFamily;
    ctx.font = window.ExcalidrawLib.getFontString({ fontSize: ea.style.fontSize, fontFamily: ea.style.fontFamily });
    
    // 按标准字符计算渲染宽度
    const { width } = ctx.measureText('的'.repeat(num));

    let id = await ea.addText(0, 0, data, {
        textAlign: "left",
        textVerticalAlign: "top",
        box: "rectangle",
        boxPadding: 0,
        width: width
    });

    let element = ea.getElement(id);
    element.strokeColor = "transparent";

    await ea.addElementsToView(true, false, true);
    ctx.restore();
    new Notice(t("notice_done"));
}

createPastePanel();