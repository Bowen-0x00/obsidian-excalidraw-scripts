---
name: 设置逐个显示序列
description: 根据选中的连线（画笔）轨迹，自动为穿过的元素按顺序生成动画序列（Index）。智能识别群组与容器。
author: ymjr
version: 1.0.0
license: MIT
usage: 使用画笔或连线穿过你需要做动画的元素，保持选中该连线并运行此脚本。
dependencies:
  - 配合 [Feature-StepAppear-Engine] 核心引擎使用
autorun: false
---
/*
```javascript
*/
const locales = {
  zh: {
    notice_select: "❌ 请先选中一条穿过目标元素的连线或画笔！",
    notice_success: "✨ 成功生成 {count} 步动画序列！请启动引擎体验。"
  },
  en: {
    notice_select: "❌ Please select a line or freedraw crossing target elements!",
    notice_success: "✨ Successfully generated {count} animation steps!"
  }
};

const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length !== 1 || !["line", "arrow", "freedraw"].includes(selectedEls[0].type)) {
    new Notice(t("notice_select"));
    return;
}

const lineEl = selectedEls[0];
const elements = ea.getViewElements();
const allElsMap = new Map(elements.map(e => [e.id, e]));

// --- 内置工具函数：获取坐标点的元素 ---
function getElementsAtPosition(elements, x, y, excludeArrows = true) {
    const els = elements.filter((el) => {
        if (excludeArrows && el.type === "arrow") return false;
        const box = ea.getBoundingBox([el]);
        return x >= box.topX && x <= box.topX + box.width && y >= box.topY && y <= box.topY + box.height;
    });
    // 按距离中心点的距离排序
    els.sort((a, b) => {
        return (x - a.x) ** 2 + (y - a.y) ** 2 - ((x - b.x) ** 2 + (y - b.y) ** 2);
    });
    return els;
}

// --- 核心逻辑：基于图的广度优先搜索，提取并合并实体 ---
function getCompleteEntity(startEl) {
    const related = [];
    const queue = [startEl];
    const added = new Set([startEl.id]);

    while(queue.length > 0) {
        const curr = queue.shift();
        related.push(curr);

        // 1. 获取同组元素
        const groupEls = ea.getElementsInTheSameGroupWithElement(curr, elements);
        for (const gEl of groupEls) {
            if (!added.has(gEl.id)) { added.add(gEl.id); queue.push(gEl); }
        }

        // 2. 获取绑定的文字元素 (Container -> Text)
        if (curr.boundElements) {
            for (const b of curr.boundElements) {
                const bEl = allElsMap.get(b.id);
                if (bEl && bEl.type === "text" && bEl.containerId === curr.id) {
                    if (!added.has(bEl.id)) { added.add(bEl.id); queue.push(bEl); }
                }
            }
        }

        // 3. 获取父容器 (Text -> Container)
        if (curr.containerId) {
            const cEl = allElsMap.get(curr.containerId);
            if (cEl && !added.has(cEl.id)) { added.add(cEl.id); queue.push(cEl); }
        }
    }
    return related;
}

const visitedIds = new Set();
let index = 0;
let modifiedElements = [];

// 遍历线条的点，寻找触碰到的元素
lineEl.points.forEach((p) => {
    // 替换为调用内置的 getElementsAtPosition
    let touchedEls = getElementsAtPosition(elements, lineEl.x + p[0], lineEl.y + p[1]);
    
    if (touchedEls && touchedEls.length > 0) {
        // 找到第一个尚未被处理的元素
        const unvisitedEl = touchedEls.find(e => !visitedIds.has(e.id));
        
        if (unvisitedEl) {
            // 获取整个不可分割的实体组 (群组+容器+文字)
            const entityGroup = getCompleteEntity(unvisitedEl);
            
            // 为整个实体组打上相同的动画 Index，并标记为已访问
            entityGroup.forEach((el) => {
                visitedIds.add(el.id);
                el.customData = {
                    ...el.customData,
                    appear: {
                        index: index
                    }
                };
                modifiedElements.push(el);
            });
            // 处理完一个完整的实体组后，Index 步进
            index++;
        }
    }
});

// 移除引导线，更新变动的元素
ea.deleteViewElements([lineEl]);
if (modifiedElements.length > 0) {
    ea.copyViewElementsToEAforEditing(modifiedElements);
    await ea.addElementsToView(false, false, false);
}

new Notice(t("notice_success").replace("{count}", index));