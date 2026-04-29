---
name: 对角线等距分布
description: 将选中的多个元素/群组在两端确定的直线上等距分布。智能合并容器与文字，支持局部选中的群组自动扩展。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画布上的三个或更多目标元素，运行本脚本。元素将以最左侧和最右侧（或最上和最下）的元素为端点基准，在连线方向上进行等距均匀分布。如果是单个元素选中且位于 Frame 中，将使其在该 Frame 内绝对居中。
features:
  - 智能合并计算（基于图的 BFS）：精确识别 Group 内所有嵌套子元素及文字容器以作为一个整体实体处理
  - 完美适配对角线及任意倾斜直线的间距分布计算
  - 单元素选中时支持一键绝对居中对其所在的 Frame 容器
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    log_start: "对角线等距分布 (Diagonally Distribution)"
  },
  en: {
    log_start: "Diagonally Distribution"
  }
};
console.log(t("log_start"));
const api = ea.getExcalidrawAPI();
const rawSelected = ea.getViewSelectedElements();
if (rawSelected.length < 1) return;

const allElements = ea.getViewElements();
const allElsMap = new Map(allElements.map(e => [e.id, e]));

// --- 核心逻辑：基于图的广度优先搜索，提取并合并实体 ---
function getDistributionEntities(selectedEls) {
    const visited = new Set();
    const components = [];

    function getRelated(startEl) {
        const related = [];
        const queue = [startEl];
        const added = new Set([startEl.id]);

        while(queue.length > 0) {
            const curr = queue.shift();
            related.push(curr);

            const groupEls = ea.getElementsInTheSameGroupWithElement(curr, allElements);
            for (const gEl of groupEls) {
                if (!added.has(gEl.id)) { added.add(gEl.id); queue.push(gEl); }
            }

            if (curr.boundElements) {
                for (const b of curr.boundElements) {
                    const bEl = allElsMap.get(b.id);
                    if (bEl && bEl.type === "text" && bEl.containerId === curr.id) {
                        if (!added.has(bEl.id)) { added.add(bEl.id); queue.push(bEl); }
                    }
                }
            }

            if (curr.containerId) {
                const cEl = allElsMap.get(curr.containerId);
                if (cEl && !added.has(cEl.id)) { added.add(cEl.id); queue.push(cEl); }
            }
        }
        return related;
    }

    for (const sel of selectedEls) {
        if (!visited.has(sel.id)) {
            const comp = getRelated(sel);
            comp.forEach(e => visited.add(e.id));
            components.push(comp);
        }
    }
    return components;
}

const entities = getDistributionEntities(rawSelected);
const num = entities.length;
if (num < 1) return;

const elementsToEdit = entities.flat();
ea.copyViewElementsToEAforEditing(elementsToEdit);

const boxes = entities.map(group => {
    const editedGroup = group.map(el => ea.elementsDict[el.id]).filter(Boolean);
    let b = ea.getBoundingBox(editedGroup);
    // 同时计算 X 和 Y 轴的真实视觉中心
    return { 
        box: { ...b, x: b.topX, y: b.topY, centerX: b.topX + b.width / 2, centerY: b.topY + b.height / 2 }, 
        group: editedGroup 
    };
});

if (num > 1) {
    // 优先按 X 中心排序，如果 X 几乎相同，则按 Y 中心排序，以此确定两端端点
    const sortedEls = boxes.sort((a, b) => {
        if (Math.abs(a.box.centerX - b.box.centerX) < 0.1) {
            return a.box.centerY - b.box.centerY;
        }
        return a.box.centerX - b.box.centerX;
    });

    const xCenterMin = sortedEls[0].box.centerX;
    const xCenterMax = sortedEls[num - 1].box.centerX;
    const xStep = (xCenterMax - xCenterMin) / (num - 1);
    
    const yCenterMin = sortedEls[0].box.centerY;
    const yCenterMax = sortedEls[num - 1].box.centerY;
    const yStep = (yCenterMax - yCenterMin) / (num - 1);
    
    let targetCenterX = xCenterMin + xStep;
    let targetCenterY = yCenterMin + yStep;
    
    for (let i = 1; i < num - 1; i++) {
        let disX = targetCenterX - sortedEls[i].box.centerX;
        let disY = targetCenterY - sortedEls[i].box.centerY;
        
        sortedEls[i].group.forEach(el => {
            if (el.type === "text" && el.containerId) {
                const containerExists = sortedEls[i].group.some(gEl => gEl.id === el.containerId);
                if (containerExists) return;
            }
            el.x += disX; 
            el.y += disY; 
        });
        
        targetCenterX += xStep;
        targetCenterY += yStep;
    }
} else if (rawSelected[0].frameId) {
    const frame = allElsMap.get(rawSelected[0].frameId);
    if (frame) {
        let disX = (frame.x + frame.width / 2) - boxes[0].box.centerX;
        let disY = (frame.y + frame.height / 2) - boxes[0].box.centerY;
        
        boxes[0].group.forEach(el => {
            if (el.type === "text" && el.containerId) {
                if (boxes[0].group.some(gEl => gEl.id === el.containerId)) return;
            }
            el.x += disX;
            el.y += disY;
        });
    }
}

await ea.addElementsToView(false, false);