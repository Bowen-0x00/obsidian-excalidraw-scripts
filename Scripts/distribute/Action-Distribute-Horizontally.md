---
name: 水平等距分布
description: 动作脚本：将选中的多个元素/群组在水平区间内智能等距分布。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中3个或以上的元素（支持独立图元、群组、容器），运行此脚本即可在它们占据的水平总宽度内将其等距对齐排布。
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
    log_start: "水平等距分布 (Group & Container Fixed V2)"
  },
  en: {
    log_start: "Horizontal Distribution (Group & Container Fixed V2)"
  }
};
console.log(t("log_start"));
const api = ea.getExcalidrawAPI();
const rawSelected = ea.getViewSelectedElements();
if (rawSelected.length < 1) return;

const allElements = ea.getViewElements();
const allElsMap = new Map(allElements.map(e => [e.id, e]));

// --- 核心逻辑：基于图的广度优先搜索，提取并合并不可分割的实体 (Group + Container + Bound Text) ---
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

            // 1. 同一 Group 的其他成员
            const groupEls = ea.getElementsInTheSameGroupWithElement(curr, allElements);
            for (const gEl of groupEls) {
                if (!added.has(gEl.id)) {
                    added.add(gEl.id);
                    queue.push(gEl);
                }
            }

            // 2. 如果当前是容器，强制拉取它绑定的内部文字
            if (curr.boundElements) {
                for (const b of curr.boundElements) {
                    const bEl = allElsMap.get(b.id);
                    // 仅绑定作为文本的元素 (排除外接连线等)
                    if (bEl && bEl.type === "text" && bEl.containerId === curr.id) {
                        if (!added.has(bEl.id)) {
                            added.add(bEl.id);
                            queue.push(bEl);
                        }
                    }
                }
            }

            // 3. 如果当前是内部文字，强制拉取它的父容器
            if (curr.containerId) {
                const cEl = allElsMap.get(curr.containerId);
                if (cEl && !added.has(cEl.id)) {
                    added.add(cEl.id);
                    queue.push(cEl);
                }
            }
        }
        return related;
    }

    // 遍历所有选中的元素，划分独立的实体组件
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

// 拷贝所有关联元素到编辑区，防止 Excalidraw 引用断裂
const elementsToEdit = entities.flat();
ea.copyViewElementsToEAforEditing(elementsToEdit);

// 获取编辑区内的实体引用，并计算真实的视觉包围盒
const boxes = entities.map(group => {
    const editedGroup = group.map(el => ea.elementsDict[el.id]).filter(Boolean);
    const b = ea.getBoundingBox(editedGroup);
    return { 
        box: { ...b, x: b.topX, y: b.topY, centerX: b.topX + b.width / 2 }, 
        group: editedGroup 
    };
});

if (num > 1) {
    // 按包围盒的真实中心 X 坐标排序，确保分布依据视觉重心
    const sortedEls = boxes.sort((a, b) => a.box.centerX - b.box.centerX);

    // 取两端元素的中心为锚定极值
    const xCenterMin = sortedEls[0].box.centerX;
    const xCenterMax = sortedEls[num - 1].box.centerX;
    const xStep = (xCenterMax - xCenterMin) / (num - 1);
    
    let targetCenterX = xCenterMin + xStep;
    
    // 首尾元素作为锚点不动，只移动中间的元素
    for (let i = 1; i < num - 1; i++) {
        let disX = targetCenterX - sortedEls[i].box.centerX;
        
        sortedEls[i].group.forEach(el => {
            // 【防双重偏移机制】如果是被容器带着跑的文字，且容器也在本次移动列表中，则交由 Excalidraw 引擎自动对齐
            if (el.type === "text" && el.containerId) {
                const containerExists = sortedEls[i].group.some(gEl => gEl.id === el.containerId);
                if (containerExists) return; 
            }
            el.x += disX;
        });
        targetCenterX += xStep;
    }
} else if (rawSelected[0].frameId) { 
    // 单元素在 Frame 中的居中逻辑
    const frame = allElsMap.get(rawSelected[0].frameId);
    if (frame) {
        let disX = (frame.x + frame.width / 2) - boxes[0].box.centerX;
        boxes[0].group.forEach(el => {
            if (el.type === "text" && el.containerId) {
                if (boxes[0].group.some(gEl => gEl.id === el.containerId)) return;
            }
            el.x += disX;
        });
    }
}

await ea.addElementsToView(false, false);