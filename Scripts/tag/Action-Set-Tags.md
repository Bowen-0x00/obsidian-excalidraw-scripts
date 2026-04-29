---
name: 高级标签管理面板
description: 悬浮面板：可视化的标签（Tags）编辑器，支持回车快速添加、点击移除，实时同步到选中元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 当需要对画布中的元素快速添加、移除或管理自定义标签（tags）时，点击运行唤起悬浮面板。
features:
  - 提供可拖拽的悬浮标签管理面板
  - 支持回车快速添加标签，并实时同步到当前选中元素的 customData 中
  - 支持点击快速移除标签，以及一键清除所有选中元素的标签
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_selection: "⚠️ 当前未选中任何元素，您可以先配置标签，随后选中元素将自动应用。",
    notice_cleared: "🧹 已清除所选元素的标签",
    panel_title: "🏷️ 标签编辑器",
    input_placeholder: "输入新标签后按回车...",
    btn_add: "添加",
    notice_exists: "⚠️ 标签已存在！",
    no_tags: "暂无标签...",
    btn_clear: "清除全部",
    btn_done: "完成"
  },
  en: {
    notice_no_selection: "⚠️ No element selected. You can configure tags first, and they will be applied to selected elements automatically.",
    notice_cleared: "🧹 Cleared tags from selected elements",
    panel_title: "🏷️ Tag Editor",
    input_placeholder: "Type a new tag and press Enter...",
    btn_add: "Add",
    notice_exists: "⚠️ Tag already exists!",
    no_tags: "No tags yet...",
    btn_clear: "Clear All",
    btn_done: "Done"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();

// ==========================================
// 1. 状态管理与初始化
// ==========================================
let uiState = {
    tags: []
};

// 读取当前选中元素的标签状态（以第一个元素为准）
const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length > 0 && selectedEls[0]?.customData?.tags) {
    uiState.tags = [...selectedEls[0].customData.tags];
} else if (selectedEls.length === 0) {
    new Notice(t("notice_no_selection"));
}

// ==========================================
// 2. 核心逻辑 (实时应用到元素)
// ==========================================
async function applyTags() {
    const els = ea.getViewSelectedElements();
    if (els.length === 0) return;

    els.forEach((el) => {
        if (uiState.tags.length > 0) {
            el.customData = { ...el.customData, tags: [...uiState.tags] };
        } else {
            // 如果标签列表为空，则清理 customData 中的 tags
            if (el.customData && el.customData.tags) {
                delete el.customData.tags;
            }
        }
    });

    ea.copyViewElementsToEAforEditing(els);
    await ea.addElementsToView(false, false, false);
}

function clearTags() {
    uiState.tags = [];
    applyTags();
    renderTags();
    new Notice(t("notice_cleared"));
}

// ==========================================
// 3. UI 构建与交互
// ==========================================
let renderTags; // 提前声明渲染函数以便内部调用

function createTagsPanel() {
    const PANEL_ID = "ea-tags-adv-panel";
    if (document.getElementById(PANEL_ID)) {
        document.getElementById(PANEL_ID).remove(); // 如果已存在则先移除，确保状态刷新
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `position:fixed; top:150px; right:100px; width:300px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.25); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    // 头部 (支持拖拽)
    const header = document.createElement('div');
    header.style.cssText = `padding:12px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:14px;">${t("panel_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0;">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;

    // 输入区
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = "display:flex; gap:8px;";
    
    const tagInput = document.createElement('input');
    tagInput.type = "text";
    tagInput.placeholder = t("input_placeholder");
    tagInput.style.cssText = "flex:1; background:var(--background-modifier-form-field); border:1px solid var(--background-modifier-border); border-radius:4px; padding:6px 10px; color:var(--text-normal); font-size:13px;";
    
    const btnAdd = document.createElement('button');
    btnAdd.innerText = t("btn_add");
    btnAdd.style.cssText = "padding:6px 12px; font-size:13px; background:var(--interactive-accent); color:var(--text-on-accent); border:none; border-radius:4px; cursor:pointer;";
    
    // 添加标签的核心函数
    const handleAddTag = () => {
        const val = tagInput.value.trim();
        if (val && !uiState.tags.includes(val)) {
            uiState.tags.push(val);
            tagInput.value = "";
            renderTags();
            applyTags();
        } else if (uiState.tags.includes(val)) {
            new Notice(t("notice_exists"));
        }
    };

    tagInput.onkeydown = (e) => { if (e.key === "Enter") handleAddTag(); };
    btnAdd.onclick = handleAddTag;

    inputWrapper.appendChild(tagInput);
    inputWrapper.appendChild(btnAdd);
    content.appendChild(inputWrapper);

    // 标签碎片 (Chips) 容器
    const tagsContainerWrapper = document.createElement('div');
    tagsContainerWrapper.style.cssText = `background:var(--background-secondary-alt); border:1px solid var(--background-modifier-border); border-radius:6px; padding:10px; min-height:80px; max-height:150px; overflow-y:auto;`;
    
    const tagsList = document.createElement('div');
    tagsList.style.cssText = "display:flex; flex-wrap:wrap; gap:8px;";
    tagsContainerWrapper.appendChild(tagsList);
    content.appendChild(tagsContainerWrapper);

    // 渲染标签碎片的函数
    renderTags = () => {
        tagsList.innerHTML = "";
        if (uiState.tags.length === 0) {
            tagsList.innerHTML = `<span style="color:var(--text-faint); font-size:12px; font-style:italic;">${t("no_tags")}</span>`;
            return;
        }

        uiState.tags.forEach((tag, index) => {
            const chip = document.createElement('div');
            chip.style.cssText = "display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:var(--interactive-normal); border:1px solid var(--background-modifier-border); border-radius:12px; font-size:12px; color:var(--text-normal);";
            
            const textSpan = document.createElement('span');
            textSpan.innerText = tag;
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = "✕";
            delBtn.style.cssText = "background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0; margin:0; font-size:10px; line-height:1;";
            delBtn.onclick = () => {
                uiState.tags.splice(index, 1);
                renderTags();
                applyTags();
            };
            
            chip.appendChild(textSpan);
            chip.appendChild(delBtn);
            tagsList.appendChild(chip);
        });
    };
    renderTags(); // 初始渲染

    panel.appendChild(content);

    // 底部操作区
    const footer = document.createElement('div');
    footer.style.cssText = `padding:10px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; background:var(--background-secondary); border-radius: 0 0 8px 8px;`;
    
    const btnClear = document.createElement('button');
    btnClear.innerText = t("btn_clear");
    btnClear.style.cssText = "background:none; border:none; color:var(--text-error); cursor:pointer; font-size:13px; padding:4px;";
    btnClear.onclick = clearTags;
    
    const btnDone = document.createElement('button');
    btnDone.innerText = t("btn_done");
    btnDone.className = "mod-cta";
    btnDone.style.cssText = "padding:4px 16px; font-size:13px; cursor:pointer;";
    btnDone.onclick = () => panel.remove();
    
    footer.appendChild(btnClear);
    footer.appendChild(btnDone);
    panel.appendChild(footer);

    document.body.appendChild(panel);

    // 事件绑定：关闭面板
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽逻辑
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; 
        startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); 
        initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { 
            isDragging = false; 
            document.onmousemove = null; 
            document.onmouseup = null; 
        };
    };

    // 自动聚焦到输入框
    setTimeout(() => tagInput.focus(), 100);
}

createTagsPanel();