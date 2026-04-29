---
name: 文本局部格式设置
description: 悬浮面板：在文本编辑模式下，快速为选中的文字添加局部加粗或变色效果。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行此脚本以唤起“局部样式工具”悬浮面板。随后双击进入文本编辑模式并用光标选中一段文字，点击悬浮面板上的“局部加粗”或使用取色器选择颜色后点击“应用局部颜色”，即可为选中片段赋予独立样式。
features:
  - 构建原生悬浮控制台，并结合 `onmousedown` 事件的 `preventDefault` 技巧防止输入框失焦
  - 自动向被选中范围注入 `boldPartial` 或 `colorPartial` 属性
dependencies:
  - 需要依赖 [Feature-Text-Render-Engine] 进行最终的 Canvas 绘制
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_enter_edit: "请先进入文本编辑状态！",
    notice_select_text: "请选中需要设置样式的文字！",
    notice_bold_added: "已添加局部加粗",
    notice_color_added: "已添加局部变色",
    ui_title: "✨ 局部样式工具",
    ui_btn_bold: "B 局部加粗",
    ui_btn_color: "应用局部颜色"
  },
  en: {
    notice_enter_edit: "Please enter text edit mode first!",
    notice_select_text: "Please select the text to style!",
    notice_bold_added: "Partial bold added",
    notice_color_added: "Partial color added",
    ui_title: "✨ Partial Style Tool",
    ui_btn_bold: "B Partial Bold",
    ui_btn_color: "Apply Color"
  }
};

const { Notice } = ea.obsidian;

function applyPartialStyle(type, value) {
    const api = ea.getExcalidrawAPI();
    const editable = ea.targetView.contentEl.querySelector(".excalidraw-textEditorContainer textarea");
    const editingTextElement = api.getAppState().editingTextElement;
    
    if (!editable || !editingTextElement) {
        new Notice(t("notice_enter_edit"));
        return;
    }
    if (editable.selectionStart === editable.selectionEnd) {
        new Notice(t("notice_select_text"));
        return;
    }

    editingTextElement.customData = editingTextElement.customData || {};
    const startNewlineNum = editable.value.substring(0, editable.selectionStart).split("\n").length - 1;
    const endNewlineNum = editable.value.substring(0, editable.selectionEnd).split("\n").length - 1;
    
    const start = editable.selectionStart - startNewlineNum;
    const end = editable.selectionEnd - endNewlineNum;

    if (type === 'bold') {
        editingTextElement.customData.boldPartial = editingTextElement.customData.boldPartial || [];
        editingTextElement.customData.boldPartial.push({ start, end });
        new Notice(t("notice_bold_added"));
    } else if (type === 'color') {
        editingTextElement.customData.colorPartial = editingTextElement.customData.colorPartial || [];
        editingTextElement.customData.colorPartial.push({ start, end, color: value });
        new Notice(t("notice_color_added"));
    }

    ea.copyViewElementsToEAforEditing([editingTextElement]);
    ea.addElementsToView(false, false, false);
    
    // 恢复编辑框焦点
    setTimeout(() => editable.focus(), 50);
}

function createPartialStylePanel() {
    if (document.getElementById("ea-partial-style-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-partial-style-panel";
    panel.style.cssText = `position:fixed; top:200px; right:150px; width:200px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:8px 12px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:13px;">${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer;">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:12px; display:flex; flex-direction:column; gap:10px;`;

    // 局部加粗按钮 (注意 onmousedown 结合 preventDefault 防止输入框失焦)
    const btnBold = document.createElement('button');
    btnBold.innerText = t("ui_btn_bold");
    btnBold.style.cssText = "font-weight:bold; cursor:pointer; width:100%; padding:6px; border-radius:4px; background:var(--interactive-normal);";
    btnBold.onmousedown = (e) => { e.preventDefault(); applyPartialStyle('bold'); };
    content.appendChild(btnBold);

    // 局部变色区
    const colorDiv = document.createElement('div');
    colorDiv.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px;";
    
    const colorPicker = document.createElement('input');
    colorPicker.type = "color";
    colorPicker.value = "#ff0000";
    colorPicker.style.cssText = "width:35px; height:30px; padding:0; border:none; cursor:pointer; background:none;";
    
    const btnColor = document.createElement('button');
    btnColor.innerText = t("ui_btn_color");
    btnColor.style.cssText = "cursor:pointer; flex:1; padding:6px; border-radius:4px; background:var(--interactive-normal);";
    btnColor.onmousedown = (e) => { e.preventDefault(); applyPartialStyle('color', colorPicker.value); };

    colorDiv.appendChild(colorPicker);
    colorDiv.appendChild(btnColor);
    content.appendChild(colorDiv);

    panel.appendChild(content);
    document.body.appendChild(panel);

    header.querySelector('#close-btn').onclick = () => panel.remove();

    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}

createPartialStylePanel();