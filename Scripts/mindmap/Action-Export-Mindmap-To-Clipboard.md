---
name: 复制脑图为Markdown
description: 按脑图展开方向导出层级列表，剪贴板写入失败时显示可复制文本。
author: ymjr
version: 1.1.0
license: MIT
usage: 选中任一脑图节点运行，导出整棵树，包含折叠内容。循环或多父结构会提示错误。
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: { select: "请先选中脑图节点。", invalid: "脑图结构无效：存在循环、多父节点或丢失的根节点。", done: "脑图已复制到剪贴板。", manual: "剪贴板不可用，请手动复制以下内容", error: "导出失败：{message}" },
  en: { select: "Select a mindmap node first.", invalid: "Invalid mindmap: cycle, multiple parents, or missing root.", done: "Mindmap copied to clipboard.", manual: "Clipboard unavailable. Copy the text below", error: "Export failed: {message}" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { select: "請先選取腦圖節點。", invalid: "腦圖結構無效：存在循環、多父節點或遺失的根節點。", done: "腦圖已複製到剪貼簿。", manual: "剪貼簿無法使用，請手動複製以下內容", error: "匯出失敗：{message}" };
const { Modal, Notice } = ea.obsidian;
const view = ea.targetView, api = view?.excalidrawAPI, filePath = view?.file?.path;
const selected = ea.getViewSelectedElements().find(el => el.customData?.mindmap);
if (!selected) { new Notice(t("select")); return; }
/** Shared export convention: horizontal trees sort vertically; vertical trees sort horizontally. */
function exportTree(elements, rootId) {
  const map = new Map(elements.filter(el => !el.isDeleted).map(el => [el.id, el])), root = map.get(rootId), children = new Map(), parents = new Map();
  if (!root?.customData?.mindmap) throw new Error(t("invalid"));
  const horizontal = !["TD", "BU"].includes(root.customData.mindmap.settings?.direction);
  const nodes = elements.filter(el => !el.isDeleted && el.customData?.mindmap?.root === rootId), ids = new Set(nodes.map(el => el.id));
  for (const el of elements) {
    const a = el.startBinding?.elementId, b = el.endBinding?.elementId;
    if (el.isDeleted || !["arrow", "line"].includes(el.type) || !ids.has(a) || !ids.has(b)) continue;
    if (parents.has(b) || a === b) throw new Error(t("invalid"));
    parents.set(b, a); if (!children.has(a)) children.set(a, []); children.get(a).push(map.get(b));
  }
  const textOf = el => {
    const text = el.type === "text" ? el : map.get(el.boundElements?.find(b => b.type === "text")?.id);
    return String(text?.originalText || text?.text || `![[${filePath}#^group=${el.id}]]`).replace(/\r?\n/g, " ");
  };
  const lines = [], seen = new Set(), stack = [{ el: root, depth: 0 }];
  while (stack.length) {
    const { el, depth } = stack.pop(); if (seen.has(el.id)) throw new Error(t("invalid")); seen.add(el.id);
    lines.push(`${depth ? "\t".repeat(depth - 1) + "- " : "## "}${textOf(el)}`);
    const next = children.get(el.id) || []; next.sort((a, b) => horizontal ? a.y - b.y : a.x - b.x);
    for (let i = next.length - 1; i >= 0; i--) stack.push({ el: next[i], depth: depth + 1 });
  }
  if (seen.size !== ids.size || parents.has(rootId)) throw new Error(t("invalid"));
  return lines.join("\n") + "\n";
}
try {
  if (!view._loaded || view.excalidrawAPI !== api || view.file?.path !== filePath) throw new Error(t("invalid"));
  const markdown = exportTree(api.getSceneElements(), selected.customData.mindmap.root);
  try { await view.containerEl.ownerDocument.defaultView.navigator.clipboard.writeText(markdown); new Notice(t("done")); }
  catch {
    await new Promise(resolve => {
      class CopyModal extends Modal {
        onOpen() {
          this.setTitle(t("manual"));
          const input = this.contentEl.createEl("textarea", { attr: { rows: "12", "aria-label": t("manual") } });
          input.value = markdown; input.readOnly = true; input.setCssStyles({ width: "100%", minHeight: "180px" }); input.focus(); input.select();
        }
        onClose() { this.contentEl.empty(); resolve(); }
      }
      new CopyModal(ea.plugin.app).open();
    });
  }
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
