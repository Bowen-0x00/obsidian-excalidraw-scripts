---
name: 解除脑图属性
description: 安全解除选中分支的脑图属性，恢复隐藏内容并清理父级连线。
author: ymjr
version: 1.1.0
usage: 选中脑图节点运行。引擎未运行时仍可解绑；不会删除其他 customData 字段。
---
/*
```javascript
*/
var locales = {
  zh: { select: "请先选中脑图节点。", done: "已解除 {count} 个节点的脑图属性。", stale: "画布已关闭、切换或为只读模式。", error: "解绑失败：{message}" },
  en: { select: "Select mindmap nodes first.", done: "Detached {count} mindmap nodes.", stale: "The drawing closed, changed, or is read-only.", error: "Detach failed: {message}" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { select: "請先選取腦圖節點。", done: "已解除 {count} 個節點的腦圖屬性。", stale: "畫布已關閉、切換或為唯讀模式。", error: "解綁失敗：{message}" };
const { Notice } = ea.obsidian;
const view = ea.targetView, api = view?.excalidrawAPI, filePath = view?.file?.path;
const ids = ea.getViewSelectedElements().filter(el => el.customData?.mindmap).map(el => el.id);
if (!ids.length) { new Notice(t("select")); return; }
const engine = ea.plugin.app.workspace.containerEl.ownerDocument.defaultView.MindmapAPI;
let worker;
try {
  if (engine?.detach) { const count = await engine.detach(ids, ea); new Notice(t("done", { count })); return; }
  // Standalone recovery is intentionally independent of the engine, including corrupt cyclic maps.
  const check = () => { if (!view?._loaded || view.semaphores?.viewunload || view.file?.path !== filePath || view.excalidrawAPI !== api || api.getAppState().viewModeEnabled) throw new Error(t("stale")); };
  check();
  const all = api.getSceneElements(), map = new Map(all.map(el => [el.id, el])), children = new Map(), removed = new Set(), stack = [...ids];
  for (const el of all) if (el.customData?.mindmap?.parent && el.customData.mindmap.parent !== el.id) {
    const key = el.customData.mindmap.parent; if (!children.has(key)) children.set(key, []); children.get(key).push(el.id);
  }
  while (stack.length) {
    const id = stack.pop(); if (removed.has(id) || !map.get(id)?.customData?.mindmap) continue;
    removed.add(id); for (const child of children.get(id) || []) stack.push(child);
  }
  const groups = new Set(), edits = new Map(), boundary = new Set();
  for (const id of removed) for (const group of map.get(id).groupIds || []) groups.add(group);
  for (const el of all) {
    const start = el.startBinding?.elementId, end = el.endBinding?.elementId;
    if (removed.has(el.id) || removed.has(el.containerId) || removed.has(el.frameId) || removed.has(el.customData?.parent) || (!el.customData?.mindmap && !el.customData?.zoomHide && el.groupIds?.some(g => groups.has(g))) || (["arrow", "line"].includes(el.type) && (removed.has(start) || removed.has(end)))) edits.set(el.id, el);
    if (["arrow", "line"].includes(el.type) && !removed.has(start) && removed.has(end)) { boundary.add(el.id); if (map.has(start)) edits.set(start, map.get(start)); }
  }
  worker = ExcalidrawAutomate.getAPI(view); worker.copyViewElementsToEAforEditing([...edits.values()]);
  for (const el of worker.getElements()) {
    el.customData = { ...el.customData };
    if (removed.has(el.id)) delete el.customData.mindmap;
    if (removed.has(el.id) || !el.customData.mindmap) delete el.customData.hide;
    if (["arrow", "line"].includes(el.type)) { delete el.customData.curveArrow; if (boundary.has(el.id)) el.isDeleted = true; }
    if (el.boundElements) el.boundElements = el.boundElements.filter(b => !boundary.has(b.id));
  }
  const baseline = all.map(el => [el.id, el.version, el.versionNonce]);
  const validate = () => {
    check();
    const current = api.getSceneElements();
    if (current.length !== baseline.length || current.some((el, i) => el.id !== baseline[i][0] || el.version !== baseline[i][1] || el.versionNonce !== baseline[i][2])) throw new Error(t("stale"));
  };
  validate();
  if (await view.addElements({ newElements: worker.getElements(), save: false, captureUpdate: "IMMEDIATELY", validateBeforePublish: validate }) === false) throw new Error(t("stale"));
  new Notice(t("done", { count: removed.size }));
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
finally { worker?.destroy(); }
