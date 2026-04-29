---
name: 复制脑图为Markdown
description: 将选中的脑图导出为层级结构的 Markdown 列表文本，并复制到剪贴板。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中脑图节点，运行此脚本即可将整棵树导出为 Markdown 文本到剪贴板。
features:
  - 递归遍历脑图节点结构
  - 将脑图节点内容转换为无序列表与标题格式
  - 按画布Y坐标顺序导出同级节点
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "⚠️ 请先选中要复制的脑图节点！",
    notice_not_mindmap: "⚠️ 当前选中的元素不是脑图节点！",
    notice_no_root: "⚠️ 未找到该脑图的根节点！",
    notice_success: "✨ 成功将脑图结构复制到剪贴板！",
    log_fail: "剪贴板写入失败:",
    notice_fail: "❌ 复制失败，请检查控制台报错。"
  },
  en: {
    notice_select: "⚠️ Please select a mindmap node first!",
    notice_not_mindmap: "⚠️ The selected element is not a mindmap node!",
    notice_no_root: "⚠️ Root node not found for this mindmap!",
    notice_success: "✨ Mindmap structure copied to clipboard!",
    log_fail: "Clipboard write failed:",
    notice_fail: "❌ Copy failed, please check console for errors."
  }
};
const { Notice } = ea.obsidian;

const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

const selectedEl = selectedEls.find(el => el.customData?.mindmap) || selectedEls[0];
if (!selectedEl?.customData?.mindmap) {
    new Notice(t("notice_not_mindmap"));
    return;
}

// 构建 elementsMap，修复前一版的报错
const elements = ea.getViewElements();
const elementsMap = new Map();
elements.forEach(el => elementsMap.set(el.id, el));

const rootId = selectedEl.customData.mindmap.root;
const rootEl = elementsMap.get(rootId);

if (!rootEl) {
    new Notice(t("notice_no_root"));
    return;
}

// 获取节点文本内容，并将多行文本的换行符替换为空格，防止破坏 Markdown 列表结构
function getNodeText(element) {
    if (!element) return "";
    let text = "";
    if (element.type === "text") {
        text = element.originalText || element.text;
    } else if (element.boundElements) {
        const textBound = element.boundElements.find(b => b.type === "text");
        if (textBound) {
            const textEl = elementsMap.get(textBound.id);
            text = textEl ? (textEl.originalText || textEl.text) : "";
        }
    }
    if (!text) text = `![[${ea.targetView.file.path}#^group=${element.id}]]`;
    return text.replace(/\n/g, " ");
}

let mdResult = "";

function traverse(currentEl, depth) {
    if (!currentEl) return;
    
    // 强制匹配格式：0级为 ## 标题，1级及以上为 - 列表
    let prefix = "";
    let indent = "";
    if (depth === 0) {
        prefix = "## ";
    } else {
        indent = "\t".repeat(Math.max(0, depth - 1));
        prefix = "- ";
    }
    
    mdResult += `${indent}${prefix}${getNodeText(currentEl)}\n`;

    // 寻找连出的子节点
    const startArrows = (currentEl.boundElements || [])
        .filter(b => b.type === "arrow")
        .map(b => elementsMap.get(b.id))
        .filter(arrow => arrow && arrow.startBinding?.elementId === currentEl.id);

    // 按照子节点在画布上的 Y 坐标（从上到下）排序导出
    const children = startArrows
        .map(arrow => elementsMap.get(arrow.endBinding?.elementId))
        .filter(Boolean)
        .sort((a, b) => a.y - b.y);

    children.forEach(child => traverse(child, depth + 1));
}

// 开始遍历
traverse(rootEl, 0);

try {
    await navigator.clipboard.writeText(mdResult);
    new Notice(t("notice_success"));
} catch (error) {
    console.error(t("log_fail"), error);
    new Notice(t("notice_fail"));
}