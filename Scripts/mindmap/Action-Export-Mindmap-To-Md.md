---
name: 导出脑图为Markdown文件
description: 将选中的脑图导出为层级结构的 Markdown 列表文本，并保存为文件。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中脑图节点，运行此脚本即可将整棵树导出并保存为一个新的 Markdown 文件到当前文件夹中。
features:
  - 递归遍历脑图节点并转换为 Markdown 结构
  - 弹窗询问并支持自定义导出的文件名
  - 自动创建或覆盖同名 md 文件
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "⚠️ 请先选中要导出的脑图节点！",
    notice_not_mindmap: "⚠️ 当前选中的元素不是脑图节点！",
    notice_no_root: "⚠️ 未找到该脑图的根节点！",
    ui_ask_filename: "是否以根节点文本作为文件名？",
    ui_yes: "Yes (以根节点作为文件名)",
    ui_no: "No (自定义文件名)",
    ui_prompt_filename: "请输入文件名 (包含路径与 .md 后缀):",
    notice_cancelled: "已取消导出。",
    notice_updated: "✅ 已更新文件: {name}",
    notice_success: "✨ 成功导出脑图至: {name}",
    notice_fail: "❌ 导出失败，请检查控制台报错。"
  },
  en: {
    notice_select: "⚠️ Please select a mindmap node to export first!",
    notice_not_mindmap: "⚠️ The selected element is not a mindmap node!",
    notice_no_root: "⚠️ Root node not found for this mindmap!",
    ui_ask_filename: "Use root node text as filename?",
    ui_yes: "Yes (Use root text)",
    ui_no: "No (Custom filename)",
    ui_prompt_filename: "Enter filename (include path and .md suffix):",
    notice_cancelled: "Export cancelled.",
    notice_updated: "✅ File updated: {name}",
    notice_success: "✨ Mindmap exported to: {name}",
    notice_fail: "❌ Export failed, please check console for errors."
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

// 修复：手动构建 elementsMap
const elements = ea.getViewElements();
const elementsMap = new Map();
elements.forEach(el => elementsMap.set(el.id, el));

const rootId = selectedEl.customData.mindmap.root;
const rootEl = elementsMap.get(rootId);

if (!rootEl) {
    new Notice(t("notice_no_root"));
    return;
}

// 获取节点文本内容
function getNodeText(element) {
    if (!element) return "";
    if (element.type === "text") return element.originalText || element.text;
    
    // 如果是容器（矩形等），寻找绑定的文本
    if (element.boundElements) {
        const textBound = element.boundElements.find(b => b.type === "text");
        if (textBound) {
            const textEl = elementsMap.get(textBound.id);
            return textEl ? (textEl.originalText || textEl.text) : "";
        }
    }
    return `![[${ea.targetView.file.path}#^group=${element.id}]]`;
}

// 收集 Markdown 结果
let mdResult = "";

function traverse(currentEl, depth) {
    if (!currentEl) return;
    
    // 生成当前节点的 Markdown
    const indent = "\t".repeat(Math.max(0, depth - 1));
    const prefix = depth === 0 ? "## " : "- ";
    mdResult += `${indent}${prefix}${getNodeText(currentEl)}\n`;

    // 寻找子节点（通过发出箭头寻找）
    const startArrows = (currentEl.boundElements || [])
        .filter(b => b.type === "arrow")
        .map(b => elementsMap.get(b.id))
        .filter(arrow => arrow && arrow.startBinding?.elementId === currentEl.id);

    // 根据子节点在画布上的 Y 坐标排序，保证导出顺序与视觉一致
    const children = startArrows
        .map(arrow => elementsMap.get(arrow.endBinding?.elementId))
        .filter(Boolean)
        .sort((a, b) => a.y - b.y);

    children.forEach(child => traverse(child, depth + 1));
}

// 交互询问：是否以根节点名称作为文件名
const rootText = getNodeText(rootEl).replace(/[\\/:*?"<>|]/g, "_"); // 过滤非法字符
const useRootName = await utils.suggester(
    [t("ui_yes"), t("ui_no")], 
    [true, false], 
    t("ui_ask_filename")
);

let fileName = "";
const currentFilePath = ea.targetView.file.path;
const dirPath = currentFilePath.substring(0, currentFilePath.lastIndexOf("/"));

if (useRootName) {
    fileName = `${dirPath}/${rootText || "Untitled_Mindmap"}.md`;
} else {
    const defaultName = currentFilePath.replace('.md', `.mindmap.md`);
    const input = await utils.inputPrompt(t("ui_prompt_filename"), defaultName, defaultName);
    if (!input) {
        new Notice(t("notice_cancelled"));
        return;
    }
    fileName = input;
}

// 开始遍历生成
traverse(rootEl, 0);

// 写入文件
try {
    let file = app.vault.getAbstractFileByPath(fileName);
    if (file) {
        await app.vault.modify(file, mdResult);
        new Notice(t("notice_updated", { name: fileName }));
    } else {
        await app.vault.create(fileName, mdResult);
        new Notice(t("notice_success", { name: fileName }));
    }
} catch (error) {
    console.error(error);
    new Notice(t("notice_fail"));
}