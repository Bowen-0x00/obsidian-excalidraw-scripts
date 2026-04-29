---
name: 修改表格行列
description: 在选中的表格单元格处插入新的行或列。
author: ymjr
version: 1.0.0
license: MIT
---
/*
```javascript
*/
const selectedElements = ea.getViewSelectedElements();
if (!selectedElements.length) {
    new Notice("请先选中一个单元格");
    return;
}

const selectedElement = selectedElements[0];
if (!selectedElement?.customData?.table) {
    new Notice("选中的元素不是有效的表格单元格");
    return;
}

const actionMap = {
    "row_before": { type: "row", dir: "before", text: "⬆️ 在上方插入行" },
    "row_after":  { type: "row", dir: "after",  text: "⬇️ 在下方插入行" },
    "col_before": { type: "col", dir: "before", text: "⬅️ 在左侧插入列" },
    "col_after":  { type: "col", dir: "after",  text: "➡️ 在右侧插入列" }
};

const choices = Object.keys(actionMap);
const displays = choices.map(k => actionMap[k].text);

const actionKey = await utils.suggester(displays, choices, "请选择行列插入位置");
if (!actionKey) return;

const { type, dir } = actionMap[actionKey];

const elements = ea.getViewElements();
const tableEls = ea.getElementsInTheSameGroupWithElement(selectedElement, elements);
const groupIds = selectedElement?.groupIds;

let changedEls = [];
const id = selectedElement.id;
const isRow = type === "row";
const metric = isRow ? "height" : "width";
const coord = isRow ? "y" : "x";
const idxKey = isRow ? "row" : "col";
const totalKey = isRow ? "rowNum" : "colNum";

const refValue = selectedElement[coord];
const refSize = selectedElement[metric];
const refIndex = selectedElement.customData.table[idxKey];

tableEls.forEach(el => {
    if (!el?.customData?.table) return;
    
    // 全局增加行列总数
    el.customData.table[totalKey] += 1;

    // 克隆同行/列的元素
    if (el.customData.table[idxKey] === refIndex) {
        ea.style.strokeColor = el.strokeColor;
        ea.style.strokeWidth = el.strokeWidth;
        ea.style.strokeStyle = el.strokeStyle;
        ea.style.strokeSharpness = el.strokeSharpness;
        ea.style.roundness = el.roundness;
        ea.style.roughness = el.roughness;
        
        let newElId = ea.addRect(
            isRow ? el.x : el.x + el.width * (dir === 'after' ? 1 : -1),
            isRow ? el.y + el.height * (dir === 'after' ? 1 : -1) : el.y,
            el.width,
            el.height
        );
        
        const newEl = ea.getElement(newElId);
        newEl.customData = JSON.parse(JSON.stringify(el.customData));
        newEl.customData.table[idxKey] = refIndex + (dir === 'after' ? 1 : 0);
        newEl.groupIds = groupIds;
    }

    // 平移受到挤压的其它元素
    if (el.groupIds?.[0] === groupIds[0] && el.containerId !== id) {
        if (dir === 'after' && el[coord] > refValue) {
            el[coord] += refSize;
            changedEls.push(el);
        } else if (dir === 'before' && el[coord] < refValue) {
            el[coord] -= refSize;
            changedEls.push(el);
        }
        
        if (el.customData.table[idxKey] > refIndex || (dir === 'before' && el.customData.table[idxKey] === refIndex)) {
            el.customData.table[idxKey] += 1;
            changedEls.push(el);
        }
    }
});

ea.copyViewElementsToEAforEditing(changedEls);
await ea.addElementsToView(false, false);
ea.clear();