---
name: 垂直等距分布
description: 动作脚本：将选中的多个元素/群组在垂直区间内智能等距分布。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中3个或以上的元素（支持独立图元、群组、容器），运行此脚本即可在它们占据的垂直总高度内将其等距对齐排布。
features:
  - 基于图的广度优先搜索，智能提取并合并不可分割的实体 (如 Group + Container + Bound Text)
  - 依据真实的视觉重心坐标进行分布，避免带文字容器分布不均
  - 防止文字被双重位移的底层校验机制
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    log_start: "垂直等距分布 (Group & Container Fixed V2)"
  },
  en: {
    log_start: "Vertical Distribution (Group & Container Fixed V2)"
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
    const b = ea.getBoundingBox(editedGroup);
    // 计算真实的 Y 轴中心点
    return { 
        box: { ...b, x: b.topX, y: b.topY, centerY: b.topY + b.height / 2 }, 
        group: editedGroup 
    };
});

if (num > 1) {
    // 按 Y 轴视觉中心坐标排序
    const sortedEls = boxes.sort((a, b) => a.box.centerY - b.box.centerY);

    const yCenterMin = sortedEls[0].box.centerY;
    const yCenterMax = sortedEls[num - 1].box.centerY;
    const yStep = (yCenterMax - yCenterMin) / (num - 1);
    
    let targetCenterY = yCenterMin + yStep;
    
    for (let i = 1; i < num - 1; i++) {
        let disY = targetCenterY - sortedEls[i].box.centerY;
        
        sortedEls[i].group.forEach(el => {
            if (el.type === "text" && el.containerId) {
                const containerExists = sortedEls[i].group.some(gEl => gEl.id === el.containerId);
                if (containerExists) return; 
            }
            el.y += disY;
        });
        targetCenterY += yStep;
    }
} else if (rawSelected[0].frameId) {
    const frame = allElsMap.get(rawSelected[0].frameId);
    if (frame) {
        let disY = (frame.y + frame.height / 2) - boxes[0].box.centerY;
        boxes[0].group.forEach(el => {
            if (el.type === "text" && el.containerId) {
                if (boxes[0].group.some(gEl => gEl.id === el.containerId)) return;
            }
            el.y += disY;
        });
    }
}

await ea.addElementsToView(false, false);