---
name: 导出脑图为Markdown文件
description: 安全导出整棵脑图为 Markdown，同名文件必须确认后才覆盖。
author: ymjr
version: 1.1.0
license: MIT
usage: 选中脑图节点运行。取消不写入；支持库根目录，保护当前绘图文件不被覆盖。
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: { select: "请先选中脑图节点。", invalid: "脑图结构无效：存在循环、多父节点或丢失的根节点。", filename: "导出文件路径（库内 .md 文件）", overwrite: "覆盖已有文件", cancel: "取消", question: "文件已存在：{path}", done: "已导出：{path}", bad_path: "请输入有效的库内 Markdown 路径，不能覆盖当前绘图或文件夹。", stale: "画布已关闭或切换文件，请重新运行。", error: "导出失败：{message}" },
  en: { select: "Select a mindmap node first.", invalid: "Invalid mindmap: cycle, multiple parents, or missing root.", filename: "Export path (.md file inside the vault)", overwrite: "Overwrite existing file", cancel: "Cancel", question: "File exists: {path}", done: "Exported: {path}", bad_path: "Enter a valid vault Markdown path. The current drawing and folders cannot be overwritten.", stale: "The drawing closed or changed. Run the script again.", error: "Export failed: {message}" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { select: "請先選取腦圖節點。", invalid: "腦圖結構無效：存在循環、多父節點或遺失的根節點。", filename: "匯出檔案路徑（庫內 .md 檔案）", overwrite: "覆寫既有檔案", cancel: "取消", question: "檔案已存在：{path}", done: "已匯出：{path}", bad_path: "請輸入有效的庫內 Markdown 路徑，不能覆寫目前繪圖或資料夾。", stale: "畫布已關閉或切換檔案，請重新執行。", error: "匯出失敗：{message}" };
const { Notice, normalizePath } = ea.obsidian;
const view = ea.targetView, api = view?.excalidrawAPI, filePath = view?.file?.path, vault = ea.plugin.app.vault;
const selected = ea.getViewSelectedElements().find(el => el.customData?.mindmap);
if (!selected) { new Notice(t("select")); return; }
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
const check = () => { if (!view._loaded || view.semaphores?.viewunload || view.excalidrawAPI !== api || view.file?.path !== filePath) throw new Error(t("stale")); };
try {
  check();
  const root = api.getSceneElements().find(el => el.id === selected.customData.mindmap.root);
  if (!root) throw new Error(t("invalid"));
  const texts = new Map(api.getSceneElements().map(el => [el.id, el]));
  const text = root.type === "text" ? root : texts.get(root.boundElements?.find(b => b.type === "text")?.id);
  const name = (text?.originalText || text?.text || "Untitled_Mindmap").replace(/[\r\n\\/:*?"<>|]/g, "_").trim();
  const directory = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) + "/" : "";
  const defaultPath = `${directory}${name}.md`;
  const input = await utils.inputPrompt(t("filename"), defaultPath, defaultPath);
  if (input == null || !input.trim()) return;
  check();
  const target = normalizePath(input.trim());
  if (!/\.md$/i.test(target) || target === filePath || /^[\\/]|^[a-z]:/i.test(input.trim()) || target.split("/").some(part => !part || part === ".." || part === ".") || vault.getFolderByPath(target)) throw new Error(t("bad_path"));
  let existing = vault.getFileByPath(target);
  let confirmedContent = null;
  if (existing) {
    const confirmed = await utils.suggester([t("overwrite"), t("cancel")], [true, false], t("question", { path: target }));
    if (confirmed !== true) return;
    check(); confirmedContent = await vault.read(existing); check();
  }
  const markdown = exportTree(api.getSceneElements(), selected.customData.mindmap.root);
  check();
  if (existing) {
    // Refuse a race with another writer after the overwrite choice rather than losing its edits.
    await vault.process(existing, current => { check(); if (current !== confirmedContent) throw new Error(t("stale")); return markdown; });
  } else {
    // Vault.create fails rather than overwriting if a competing writer created the path meanwhile.
    await vault.create(target, markdown);
  }
  new Notice(t("done", { path: target }));
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
