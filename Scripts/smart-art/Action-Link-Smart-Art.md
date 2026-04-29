---
name: SmartArt 实时生成器
description: 悬浮面板：选中模板容器或文本，输入缩进大纲，画布元素将【实时发生形变与替换】，所见即所得。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板上带有层级编号（如 1.1, 1.2）的文本节点，或包裹这些文本的图形容器。运行脚本将唤起“SmartArt 构建”浮动面板。在文本框内通过回车缩进键入大纲层级文本，画布中的图形和文字将根据大纲实时动态更新。
features:
  - 独立的纯净单栏 React 级重绘浮动面板
  - 支持穿透容器提取文字并绑定 Node ID
  - 随着输入内容实时刷新 `refreshTextDimensions` 以确保容器根据新文字内容自动撑开宽高
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "⚠️ 请先选中包含层级编号 (如 1.1, 1.2) 的文本，或包裹着它们的图形容器！",
    notice_cancelled: "↩️ 已撤销 SmartArt 更改",
    notice_done: "✅ SmartArt 渲染完成！",
    ui_title: "✨ SmartArt 实时构建",
    ui_tip: "📝 在此输入大纲，画布将实时更新",
    ui_placeholder: "一级主题\n  子节点 A\n  子节点 B\n    孙节点 B1\n另一个主题",
    ui_undo: "撤销",
    ui_apply: "应用并关闭",
    node_missing: "[{id}] 空缺"
  },
  en: {
    notice_select: "⚠️ Please select text with hierarchy numbers (e.g., 1.1, 1.2) or their containers first!",
    notice_cancelled: "↩️ SmartArt changes reverted",
    notice_done: "✅ SmartArt rendering complete!",
    ui_title: "✨ SmartArt Live Builder",
    ui_tip: "📝 Enter outline here, canvas updates in real-time",
    ui_placeholder: "Main Topic\n  Child A\n  Child B\n    Grandchild B1\nAnother Topic",
    ui_undo: "Undo",
    ui_apply: "Apply & Close",
    node_missing: "[{id}] Missing"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();
const elementsMap = api.App.scene.nonDeletedElementsMap;

// ==========================================
// 1. 穿透获取目标文本元素 (支持容器与独立文本)
// ==========================================
const targetEls = [];
let hasNewNodeIds = false;

selectedEls.forEach(el => {
    let textEls = [];

    // 情况A：直接选中了文本
    if (el.type === "text") textEls.push(el);

    // 情况B：选中了带文本的容器 (如圆角矩形、菱形等)
    if (el.boundElements) {
        el.boundElements.forEach(b => {
            if (b.type === "text") {
                const boundText = elementsMap.get(b.id);
                if (boundText) textEls.push(boundText);
            }
        });
    }

    // 提取并固化 Node ID
    textEls.forEach(textEl => {
        let nodeId = textEl.customData?.smartartNodeId;
        
        // 如果没有绑定过，且文本长得像层级编号 (1, 1.1, 1.2.1)
        if (!nodeId && /^(\d+\.)*\d+$/.test(textEl.text.trim())) {
            nodeId = textEl.text.trim();
            hasNewNodeIds = true;
        }

        if (nodeId) {
            // 防重录入
            if (!targetEls.find(t => t.id === textEl.id)) {
                targetEls.push({
                    id: textEl.id,
                    nodeId: nodeId,
                    originalText: textEl.originalText || textEl.text // 记录初始状态，用于取消时恢复
                });
            }
        }
    });
});

if (targetEls.length === 0) {
    new Notice(t("notice_select"), 4000);
    return;
}

// 首次固化 ID 到画布 (触发一次更新以保存 customData)
if (hasNewNodeIds) {
    const initElements = api.getSceneElements().map(el => {
        const target = targetEls.find(t => t.id === el.id);
        if (target && !el.customData?.smartartNodeId) {
            return {
                ...el,
                customData: { ...(el.customData || {}), smartartNodeId: target.nodeId },
                version: el.version + 1
            };
        }
        return el;
    });
    api.updateScene({ elements: initElements });
}

// 全局缓存命名空间
if (!ExcalidrawAutomate.plugin._ymjr_smartart) ExcalidrawAutomate.plugin._ymjr_smartart = {};
const ctx = ExcalidrawAutomate.plugin._ymjr_smartart;


// ==========================================
// 2. 核心大纲解析器
// ==========================================
function parseIndentedText(rawText) {
    const lines = rawText.split('\n');
    const map = {};
    let currentLevels = []; 

    lines.forEach(line => {
        if (line.trim() === '') return;
        
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1].replace(/\t/g, '    ').length : 0;
        const cleanText = line.replace(/^\s*([-*+]|\d+\.)\s+/, '').trim();

        let levelIndex = 0;
        while (levelIndex < currentLevels.length && currentLevels[levelIndex].indent < indent) {
            levelIndex++;
        }

        if (levelIndex === currentLevels.length) {
            currentLevels.push({ indent, count: 1 });
        } else {
            currentLevels = currentLevels.slice(0, levelIndex + 1);
            currentLevels[levelIndex].indent = indent;
            currentLevels[levelIndex].count++;
        }

        const numbering = currentLevels.map(l => l.count).join('.');
        map[numbering] = cleanText;
    });

    return map;
}

// ==========================================
// 3. 画布实时连动逻辑
// ==========================================
const applyToCanvas = (currentMap, restoreOriginal = false) => {
    let updatedCount = 0;
    const elements = api.getSceneElements().map(el => {
        const target = targetEls.find(t => t.id === el.id);
        if (target) {
            // 确定目标文本
            let finalText = target.originalText;
            if (!restoreOriginal) {
                // 如果用户输入了内容但未匹配到当前节点，给一个视觉缺省提示
                const isMapEmpty = Object.keys(currentMap).length === 0;
                finalText = isMapEmpty ? target.originalText : (currentMap[target.nodeId] || t("node_missing", { id: target.nodeId }));
            }

            if (el.text !== finalText) {
                let updatedEl = { ...el, text: finalText, originalText: finalText, version: el.version + 1 };
                
                // 实时重算物理宽高，确保与图形容器的排版完美契合
                try {
                    if (typeof ExcalidrawLib !== 'undefined') {
                        const dims = ExcalidrawLib.refreshTextDimensions(updatedEl, null, elementsMap, finalText);
                        updatedEl.width = dims.width;
                        updatedEl.height = dims.height;
                        updatedEl.baseline = dims.baseline;
                    }
                } catch(e) {}
                
                updatedCount++;
                return updatedEl;
            }
        }
        return el;
    });

    if (updatedCount > 0) {
        api.updateScene({ elements });
    }
};


// ==========================================
// 4. 纯净单栏 UI 构建 (悬浮面板)
// ==========================================
function createLiveSmartArtPanel() {
    const existingPanel = document.getElementById("ea-smartart-live-panel");
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = "ea-smartart-live-panel";
    panel.style.cssText = `position:fixed; top:15%; left:10%; width:380px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.3); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    // 头部拖拽区
    const header = document.createElement('div');
    header.style.cssText = `padding:12px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:14px; color:var(--text-normal);">${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:14px;">✕</button>`;
    panel.appendChild(header);

    // 内容区：只需一个文本框
    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:8px; height: 350px;`;
    content.innerHTML = `<label style="font-size:12px; font-weight:bold; color:var(--text-muted);">${t("ui_tip")}</label>`;
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = t("ui_placeholder");
    textarea.style.cssText = "flex: 1; resize: none; padding: 12px; border-radius: 6px; border: 1px solid var(--background-modifier-border); background: var(--background-secondary-alt); color: var(--text-normal); font-family: var(--font-monospace); font-size: 13px; white-space: pre; outline: none;";
    textarea.value = ctx.lastInputText || "";
    content.appendChild(textarea);
    panel.appendChild(content);

    // 底部操作区
    const footer = document.createElement('div');
    footer.style.cssText = `padding:12px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end; gap:10px; background:var(--background-secondary); border-radius: 0 0 8px 8px;`;
    
    const btnCancel = document.createElement('button');
    btnCancel.innerText = t("ui_undo");
    btnCancel.style.cssText = "padding: 6px 16px; cursor:pointer;";
    
    const btnDone = document.createElement('button');
    btnDone.innerText = t("ui_apply"); 
    btnDone.className = "mod-cta";
    btnDone.style.cssText = "padding: 6px 16px; cursor:pointer; font-weight:bold;";
    
    footer.appendChild(btnCancel); 
    footer.appendChild(btnDone);
    panel.appendChild(footer);

    document.body.appendChild(panel);

    // ==========================================
    // 5. 交互事件挂载
    // ==========================================
    
    // 监听打字，实时刷新画板
    textarea.oninput = () => {
        ctx.lastInputText = textarea.value;
        const currentMap = parseIndentedText(textarea.value);
        applyToCanvas(currentMap, false);
    };

    // 关闭/撤销逻辑：恢复原状
    const handleCancel = () => {
        applyToCanvas({}, true); // 强制恢复初始文本
        panel.remove();
        new Notice(t("notice_cancelled"));
    };

    header.querySelector('#close-btn').onclick = handleCancel;
    btnCancel.onclick = handleCancel;

    // 完成逻辑：保存并关闭
    btnDone.onclick = () => {
        panel.remove();
        // 触发一次视图重绘以确保底层彻底落盘
        api.updateScene({ appState: { ...api.getAppState() } });
        new Notice(t("notice_done"));
    };

    // 拖拽逻辑防跳跃
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; 
        startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); 
        panel.style.transform = 'none';
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { 
            isDragging = false; 
            document.onmousemove = null; document.onmouseup = null; 
        };
    };

    // 如果一开始就有缓存文字，立刻执行一次实时渲染
    if (textarea.value) {
        applyToCanvas(parseIndentedText(textarea.value), false);
    }
    
    setTimeout(() => { textarea.focus(); }, 100);
}

// 唤起实时发生器
createLiveSmartArtPanel();