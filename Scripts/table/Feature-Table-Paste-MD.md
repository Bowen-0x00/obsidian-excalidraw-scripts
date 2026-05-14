---
name: 粘贴 Markdown 表格解析引擎
description: 后台引擎：拦截并解析粘贴板中的 Markdown 表格，自动转化为支持行列拖拽与内容自适应的 Excalidraw 模拟表格元素。
author: ymjr
version: 1.2.0
license: MIT
usage: 后台常驻。在画板中按下 Ctrl+V 粘贴 Markdown 语法的表格时，自动识别并生成对应的表格方块组。
features:
  - 采用“二次排版扫描”，先让原生引擎计算真实容器高度，再执行二次校准，彻底解决文本换行导致的重叠错位问题。
  - 自动剔除 Markdown 干扰符号。
dependencies:
  - 需配合「模拟表格核心引擎」共同使用以获得行列同步拖拽体验。
autorun: true
---
/*
```javascript
*/
var locales = {
    zh: {
        log_parse_error: "[Feature: PasteMarkdownTable] 解析 Markdown 表格错误:",
        log_no_core: "EA_Core 未运行，无法挂载 Markdown 表格粘贴引擎",
        log_unmounted: "[{id}] 🔌 Markdown 表格粘贴引擎已卸载",
        log_mounted: "[{id}] 🚀 Markdown 表格粘贴引擎挂载完毕"
    },
    en: {
        log_parse_error: "[Feature: PasteMarkdownTable] Error parsing Markdown table:",
        log_no_core: "EA_Core not running, cannot mount Paste Markdown Table engine",
        log_unmounted: "[{id}] 🔌 Paste Markdown Table Engine Unmounted",
        log_mounted: "[{id}] 🚀 Paste Markdown Table Engine Mounted"
    }
};


const SCRIPT_ID = "ymjr.feature.paste-markdown-table";

const handlePaste = async (contextPayload) => {
    const { ea, api, payload, event } = contextPayload;
    if (!ea || !api || !payload || typeof payload.text !== "string") {
        return false;
    }

    let text = payload.text.trim();

    // 1. 按行分割并进行基础校验
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return false;

    // 2. 识别 Markdown 表格的分隔行
    const separatorLine = lines[1];
    const isMarkdownTable = /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(separatorLine) || 
                            /^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(separatorLine) && separatorLine.includes('-');

    if (!isMarkdownTable) return false;

    try {
        // 3. 拦截原生粘贴行为
        contextPayload.intercepted = true;
        payload.text = '';
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        // 4. 解析表格数据为 2D 数组
        const tableData = [];
        for (let i = 0; i < lines.length; i++) {
            if (i === 1) continue; 

            let rowText = lines[i];
            if (rowText.startsWith('|')) rowText = rowText.substring(1);
            if (rowText.endsWith('|')) rowText = rowText.substring(0, rowText.length - 1);

            const cols = rowText.split('|').map(c => c.trim());
            tableData.push(cols);
        }

        const rowNum = tableData.length;
        const colNum = Math.max(...tableData.map(r => r.length));
        if (rowNum === 0 || colNum === 0) return false;

        // 5. 初始化样式与坐标
        ea.clear();
        const state = api.getAppState();
        ea.style.strokeColor = state.currentItemStrokeColor;
        ea.style.strokeWidth = 2;
        ea.style.roughness = 0;
        ea.style.backgroundColor = "transparent";
        ea.style.fontFamily = state.currentItemFontFamily || 1;
        ea.style.fontSize = state.currentItemFontSize || 20;

        const cellWidth = 160;
        const cellHeight = 60; // 基础初始高度
        const origin = ea.getViewLastPointerPosition() || {x: 0, y: 0};
        const startX = origin.x;
        const startY = origin.y;

        let rootId = undefined;
        let previewIDs = [];

        // 6. 第一遍扫描：按固定大小生成表格并喂给 Excalidraw 引擎
        for (let i = 0; i < rowNum; i++) {
            for (let j = 0; j < colNum; j++) {
                let cellText = tableData[i][j] || "";
                
                // 清理会导致画布排版杂乱的纯文本 Markdown 符号
                cellText = cellText.replace(/\*\*(.*?)\*\*/g, '$1')
                                   .replace(/\*(.*?)\*/g, '$1')
                                   .replace(/~~(.*?)~~/g, '$1')
                                   .replace(/__(.*?)__/g, '$1')
                                   .replace(/`(.*?)`/g, '$1');

                let x = startX + j * cellWidth;
                let y = startY + i * cellHeight; // 暂时的初始 Y

                let rectId = ea.addRect(x, y, cellWidth, cellHeight);
                if (!rootId) rootId = rectId;

                let rectEl = ea.getElement(rectId);
                rectEl.customData = {
                    ...rectEl.customData,
                    table: { root: rootId, row: i, col: j, rowNum: rowNum, colNum: colNum }
                };
                previewIDs.push(rectId);

                if (cellText !== "") {
                    let textId = ea.addText(x + cellWidth / 2, y + cellHeight / 2, cellText, { 
                        textAlign: "center",
                        verticalAlign: "middle",
                    });
                    
                    let textEl = ea.getElement(textId);
                    textEl.containerId = rectId; // 建立容器绑定
                    rectEl.boundElements = rectEl.boundElements || [];
                    rectEl.boundElements.push({ type: "text", id: textId });

                    previewIDs.push(textId);
                }
            }
        }

        ea.addToGroup(previewIDs);
        // 第一遍渲染不保存至历史 (storeAction: false)
        await ea.addElementsToView(false, false, false);

        // 7. --- 关键修复：二次排版扫描 ---
        // 给原生引擎一点时间，让它依据文本长度真实撑开绑定的矩形容器
        await new Promise(res => setTimeout(res, 100));

        const sceneElements = api.getSceneElements();
        let changedEls = new Map();
        
        let rowGroups = {};
        previewIDs.forEach(id => {
            let el = sceneElements.find(e => e.id === id);
            if (el && el.type === "rectangle" && el.customData?.table) {
                let r = el.customData.table.row;
                if (!rowGroups[r]) rowGroups[r] = [];
                rowGroups[r].push(JSON.parse(JSON.stringify(el))); // 深拷贝准备修改
            }
        });

        let currentRealY = startY;

        for (let i = 0; i < rowNum; i++) {
            if (!rowGroups[i]) continue;

            // 7.1 提取该行内被 Excalidraw 自动撑开的最大真实高度
            let maxHeight = cellHeight;
            rowGroups[i].forEach(rect => {
                let realRect = sceneElements.find(e => e.id === rect.id);
                if (realRect && realRect.height > maxHeight) {
                    maxHeight = realRect.height;
                }
            });

            // 7.2 统一调齐这行的矩形高度，并向下累加推演正确的 Y 轴
            rowGroups[i].forEach(rect => {
                rect.y = currentRealY;
                rect.height = maxHeight;
                changedEls.set(rect.id, rect);

                // 7.3 同步修正矩形内绑定文本的相对坐标，确保始终居中
                let boundText = rect.boundElements?.find(b => b.type === "text");
                if (boundText) {
                    let textEl = sceneElements.find(e => e.id === boundText.id);
                    if (textEl) {
                        textEl = JSON.parse(JSON.stringify(textEl));
                        textEl.y = rect.y + rect.height / 2 - textEl.height / 2;
                        textEl.x = rect.x + rect.width / 2 - textEl.width / 2;
                        changedEls.set(textEl.id, textEl);
                    }
                }
            });

            currentRealY += maxHeight; // 为下一行的起点叠加真实高度
        }

        // 8. 提交最终修正后的无重叠场景，并正式保存一条历史撤销记录
        const finalSceneEls = sceneElements.map(el => changedEls.has(el.id) ? changedEls.get(el.id) : el);
        api.updateScene({ elements: finalSceneEls, storeAction: "capture" });
        
        return true;

    } catch (e) {
        console.error(t("log_parse_error"), e);
        return false;
    }
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    // 监听粘贴钩子
    window.EA_Core.registerHook(SCRIPT_ID, 'onPaste', handlePaste, 55);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();