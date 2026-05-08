---
name: 解除脑图属性
description: 将选中元素及其子节点从脑图结构中脱离，转换为普通元素，并修复原脑图排版。
author: ymjr
version: 1.0.2
usage: 选中要解除的脑图节点，运行该脚本即可。
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_selection: "⚠️ 请先选中要解除脑图的节点",
    notice_not_mindmap: "⚠️ 选中的元素包含非脑图节点或未检测到脑图结构",
    notice_success: "✅ 成功分离 {count} 个节点，原脑图已重新排版"
  },
  en: {
    notice_no_selection: "⚠️ Please select a mindmap node to detach",
    notice_not_mindmap: "⚠️ Selected elements are not mindmap nodes",
    notice_success: "✅ Successfully detached {count} nodes and re-layouted"
  }
};

const { Notice } = ea.obsidian;

const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) { new Notice(t("notice_no_selection")); return; }

const elementsMap = ea.getViewElements().reduce((acc, el) => { acc.set(el.id, el); return acc; }, new Map());
const mindmapNodes = selectedEls.filter(el => el.customData?.mindmap);

if (mindmapNodes.length === 0) { new Notice(t("notice_not_mindmap")); return; }

let toProcess = new Set();
let internalArrows = new Set();
let boundaryArrows = new Set();
let affectedRoots = new Set();

// 找出选中的"最高层级"脱离点，即它的父节点没有被选中
const detachedRoots = mindmapNodes.filter(node => {
  if (node.id === node.customData.mindmap.root) return true; 
  const parentSelected = mindmapNodes.some(p => p.id === node.customData.mindmap.parent);
  return !parentSelected;
});

// 定位需要删除的父级边界箭头，并记录受影响的根节点以便后续重排
detachedRoots.forEach(node => {
  affectedRoots.add(node.customData.mindmap.root);
  if (node.id !== node.customData.mindmap.root) {
    const parentId = node.customData.mindmap.parent;
    const arrow = Array.from(elementsMap.values()).find(a => 
      a.type === "arrow" && a.startBinding?.elementId === parentId && a.endBinding?.elementId === node.id
    );
    if (arrow) boundaryArrows.add(arrow);
  }
});

// 递归向下获取所有子节点和内部连线
const traverse = (nodeId) => {
  const el = elementsMap.get(nodeId);
  if (el) toProcess.add(el);
  const children = Array.from(elementsMap.values()).filter(e => e.customData?.mindmap?.parent === nodeId && e.id !== nodeId);
  children.forEach(c => traverse(c.id));
  const arrows = Array.from(elementsMap.values()).filter(e => e.type === "arrow" && e.startBinding?.elementId === nodeId);
  arrows.forEach(a => internalArrows.add(a));
};

detachedRoots.forEach(node => traverse(node.id));
boundaryArrows.forEach(ba => internalArrows.delete(ba)); // 确保边界箭头不混入内部箭头

ea.clear();
const nodes = Array.from(toProcess);
const inArrows = Array.from(internalArrows);
const outArrows = Array.from(boundaryArrows);

ea.copyViewElementsToEAforEditing([...nodes, ...inArrows, ...outArrows]);

// 1. 剥离节点属性
nodes.forEach(el => {
  const eaEl = ea.getElement(el.id);
  if (eaEl && eaEl.customData) delete eaEl.customData.mindmap;
});

// 2. 剥离内部连线的特殊属性，使其变为普通箭头
inArrows.forEach(arr => {
  const eaArr = ea.getElement(arr.id);
  if (eaArr && eaArr.customData) delete eaArr.customData.curveArrow;
});

// 3. 删除切断联系的边界箭头
outArrows.forEach(arr => {
  const eaArr = ea.getElement(arr.id);
  if (eaArr) eaArr.isDeleted = true;
});

await ea.addElementsToView(false, false, true);
new Notice(t("notice_success", { count: nodes.length }));

// 4. 让引擎修复（重新排版）被挖掉一块的原脑图
setTimeout(async () => {
  if (!window.MindmapAPI || !window.MindmapAPI.runLayout) return;
  const currentSceneElements = ea.getViewElements();
  for (const rootId of affectedRoots) {
    const rootEl = currentSceneElements.find(e => e.id === rootId && !e.isDeleted);
    // 如果剥离的是脑图根节点本身，rootEl 会失去 mindmap 属性，这里直接跳过
    if (!rootEl || !rootEl.customData?.mindmap) continue; 
    
    const treeElements = currentSceneElements.filter(el => {
      if (el.customData?.mindmap?.root === rootId) return true;
      if (el.type === "arrow" && el.startBinding) {
        const startEl = currentSceneElements.find(e => e.id === el.startBinding.elementId);
        return startEl?.customData?.mindmap?.root === rootId;
      }
      return false;
    });

    const elementsToLoad = [...treeElements];
    treeElements.forEach(el => {
      if (el.boundElements) {
        el.boundElements.forEach(b => {
          if (b.type === "text") {
            const textEl = currentSceneElements.find(e => e.id === b.id);
            if (textEl) elementsToLoad.push(textEl);
          }
        });
      }
    });
    await window.MindmapAPI.runLayout(elementsToLoad, true, ea);
  }
}, 150);