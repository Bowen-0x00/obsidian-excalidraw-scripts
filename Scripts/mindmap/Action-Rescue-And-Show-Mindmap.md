---
name: 解绑选中并恢复脑图可见性
description: 恢复脑图及其附属元素的显示，解除选中分支的脑图属性，保留其他元数据。
author: ymjr
version: 1.2.0
license: MIT
usage: 脑图节点意外隐藏或连线结构损坏时运行。不会清空 customData，也不会强制显示无关的隐藏元素。
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: { done: "脑图已恢复显示，选中分支已解绑；其他元数据保持不变。", stale: "画布已关闭、切换或为只读模式。", error: "恢复失败：{message}" },
  en: { done: "Mindmaps revealed and selected branches detached. Other metadata is preserved.", stale: "The drawing closed, changed, or is read-only.", error: "Rescue failed: {message}" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { done: "腦圖已恢復顯示，選取分支已解綁；其他中繼資料保持不變。", stale: "畫布已關閉、切換或為唯讀模式。", error: "恢復失敗：{message}" };
const { Notice } = ea.obsidian;
const view = ea.targetView, api = view?.excalidrawAPI, filePath = view?.file?.path;
const ids = ea.getViewSelectedElements().map(el => el.id);
const engine = ea.plugin.app.workspace.containerEl.ownerDocument.defaultView.MindmapAPI;
let worker;
try {
  if (engine?.rescue) { await engine.rescue(ids, ea); new Notice(t("done")); return; }
  const check = () => { if (!view?._loaded || view.semaphores?.viewunload || view.file?.path !== filePath || view.excalidrawAPI !== api || api.getAppState().viewModeEnabled) throw new Error(t("stale")); };
  check();
  const all = api.getSceneElements(), nodes = all.filter(el => el.customData?.mindmap), nodeIds = new Set(nodes.map(el => el.id)), selected = new Set(ids), groups = new Set(), children = new Map();
  for (const node of nodes) {
    for (const group of node.groupIds || []) groups.add(group);
    const parent = node.customData.mindmap.parent;
    if (parent && parent !== node.id) { if (!children.has(parent)) children.set(parent, []); children.get(parent).push(node.id); }
  }
  const stack = [...selected];
  while (stack.length) for (const child of children.get(stack.pop()) || []) if (!selected.has(child)) { selected.add(child); stack.push(child); }
  const edits = all.filter(el => nodeIds.has(el.id) || nodeIds.has(el.containerId) || nodeIds.has(el.frameId) || nodeIds.has(el.customData?.parent) || (!el.customData?.mindmap && !el.customData?.zoomHide && el.groupIds?.some(g => groups.has(g))) || (["arrow", "line"].includes(el.type) && nodeIds.has(el.startBinding?.elementId) && nodeIds.has(el.endBinding?.elementId)));
  worker = ExcalidrawAutomate.getAPI(view); worker.copyViewElementsToEAforEditing(edits);
  for (const el of worker.getElements()) {
    el.customData = { ...el.customData }; delete el.customData.hide;
    if (el.customData.mindmap) { if (selected.has(el.id)) delete el.customData.mindmap; else el.customData.mindmap.status = "open"; }
  }
  const baseline = all.map(el => [el.id, el.version, el.versionNonce]);
  const validate = () => {
    check();
    const current = api.getSceneElements();
    if (current.length !== baseline.length || current.some((el, i) => el.id !== baseline[i][0] || el.version !== baseline[i][1] || el.versionNonce !== baseline[i][2])) throw new Error(t("stale"));
  };
  validate();
  if (await view.addElements({ newElements: worker.getElements(), save: false, captureUpdate: "IMMEDIATELY", validateBeforePublish: validate }) === false) throw new Error(t("stale"));
  new Notice(t("done"));
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
finally { worker?.destroy(); }
