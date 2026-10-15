---
name: 脑图核心引擎
description: 脑图折叠、排版与触控操作；按视图隔离，安全处理深层树和无效连线。
author: ymjr
version: 1.1.1
license: MIT
usage: 选中脑图节点，通过键盘或移动端操作条新增、编辑和折叠。根节点不支持新增同级节点。无效的循环或多父结构会提示错误，不修改画布。
features:
  - 按视图串行处理修改，切换文件或卸载后取消过期操作
  - 迭代布局与树遍历，支持深层树并检测循环和多父节点
  - 触控操作条、缩放补偿、拖挂预览及多指防误触
  - 提供 window.MindmapAPI 供动作脚本调用
  - 保留双击编辑与长按菜单；不抢占宿主手势
dependencies:
  - EA_Core Hook 系统
autorun: true
---
/*
```javascript
*/
/** View-scoped controller and iterative forest model. No live scene objects are mutated. */
var locales = {
  zh: {
    tb_child: "子节点", tb_sibling: "同级", tb_fold: "折叠", tb_unfold: "展开", tb_edit: "编辑",
    edit_text: "编辑节点文字", new_text: "新节点", error: "脑图操作失败：{message}",
    stale: "画布已关闭、切换文件或引擎已停止，请重新操作。",
    invalid: "脑图包含循环、重复父节点或断开的节点，请修复连线，或运行脑图恢复/解绑脚本。",
    readonly: "当前画布为只读模式。", empty: "节点文字不能为空。",
    settings: "请通过“修改脑图样式”脚本配置脑图。", mounted: "脑图引擎已启动", stopped: "脑图引擎已停止"
  },
  en: {
    tb_child: "Child", tb_sibling: "Sibling", tb_fold: "Fold", tb_unfold: "Unfold", tb_edit: "Edit",
    edit_text: "Edit node text", new_text: "New node", error: "Mindmap action failed: {message}",
    stale: "The drawing changed, closed, or the engine stopped. Please try again.",
    invalid: "The mindmap contains a cycle, multiple parents, or disconnected nodes. Repair its connectors or run the rescue/detach script.",
    readonly: "The drawing is read-only.", empty: "Node text cannot be empty.",
    settings: "Use Change Mindmap Style to configure the mindmap.", mounted: "Mindmap engine started", stopped: "Mindmap engine stopped"
  }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { ...locales.zh, tb_child: "子節點", tb_sibling: "同級", tb_fold: "摺疊", tb_unfold: "展開", tb_edit: "編輯", edit_text: "編輯節點文字", new_text: "新節點", error: "腦圖操作失敗：{message}", stale: "畫布已關閉、切換檔案或引擎已停止，請重新操作。", invalid: "腦圖包含循環、重複父節點或斷開的節點，請修復連線，或執行腦圖恢復/解綁腳本。", readonly: "目前畫布為唯讀模式。", empty: "節點文字不能為空。", settings: "請透過修改腦圖樣式腳本設定腦圖。", mounted: "腦圖引擎已啟動", stopped: "腦圖引擎已停止" };
const SCRIPT_ID = "ymjr.feature.mindmap-engine";
const plugin = ExcalidrawAutomate.plugin;
const hostWindow = plugin.app.workspace.containerEl.ownerDocument.defaultView;
const core = hostWindow.EA_Core;
if (!core) throw new Error("EA_Core is not running");
plugin[`disable_${SCRIPT_ID}`]?.();
const LEVELS = [
  { level: 1, strokeColor: "black", textColor: "#ffffff", fontSize: 24, strokeWidth: 2 },
  { level: 2, strokeColor: "black", textColor: "black", fontSize: 20, strokeWidth: 1 },
  { level: 3, strokeColor: "black", textColor: "black", fontSize: 16, strokeWidth: 1 },
  { level: 4, strokeColor: "black", textColor: "black", fontSize: 14, strokeWidth: 1 }
];
const THEMES = {
  rainbow: { name: "🌈 Rainbow", rootBg: "#343a40", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419", "#3bc9db"], levels: LEVELS },
  morandi: { name: "Morandi", rootBg: "#495057", colors: ["#5c7a82", "#b38269", "#788560", "#a68894", "#7a6c5d"], levels: LEVELS },
  business: { name: "Business", rootBg: "#0b2545", colors: ["#1864ab", "#0b7285", "#087f5b", "#5f3dc4", "#c92a2a"], levels: LEVELS },
  custom: { name: "Custom", rootBg: "#1e1e1e", colors: ["#e03131", "#1971c2", "#099268"], levels: LEVELS }
};
const DEFAULTS = { direction: "LR", arrowType: "normal", defaultGap: 15, curveLength: 40, lengthBetweenElAndLine: 100, enableFixedPoint: true, theme: "rainbow" };
const finite = (value, fallback, min = 0, max = 10000) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
const clone = value => JSON.parse(JSON.stringify(value));
const append = (map, key, value) => { if (!map.has(key)) map.set(key, []); map.get(key).push(value); };
const isNode = el => el && !el.isDeleted && !el.containerId && !["arrow", "line"].includes(el.type);
const report = error => { console.error(`[${SCRIPT_ID}]`, error); new ea.obsidian.Notice(t("error", { message: error.message || String(error) })); };
/** Reads live settings, including changes saved after engine startup. */
function getConfiguration() {
  let config;
  try { config = JSON.parse(plugin.settings.scriptEngineSettings?.Mindmap_Engine?.["Mindmap Configuration"]?.value || "{}"); } catch { config = {}; }
  if (!config || typeof config !== "object") config = {};
  const storedThemes = config.themes && typeof config.themes === "object" && Object.keys(config.themes).length ? config.themes : THEMES;
  const themes = {};
  for (const [key, value] of Object.entries(storedThemes)) {
    const base = THEMES[key] || THEMES.rainbow;
    const theme = { ...base, ...(value && typeof value === "object" ? value : {}) };
    if (!Array.isArray(theme.colors) || !theme.colors.length) theme.colors = base.colors;
    if (!Array.isArray(theme.levels) || !theme.levels.length) theme.levels = base.levels;
    themes[key] = theme;
  }
  const defaultSettings = normalizeSettings(config.defaultSettings);
  if (!themes[defaultSettings.theme]) defaultSettings.theme = Object.keys(themes)[0];
  return { ...config, themes, defaultSettings };
}
function normalizeSettings(value) {
  const s = { ...DEFAULTS, ...(value && typeof value === "object" ? value : {}) };
  s.direction = ["LR", "RL", "TD", "BU"].includes(s.direction) ? s.direction : "LR";
  s.arrowType = ["normal", "elbow", "curve"].includes(s.arrowType) ? s.arrowType : "normal";
  for (const key of ["defaultGap", "curveLength", "lengthBetweenElAndLine"]) s[key] = finite(s[key], DEFAULTS[key]);
  s.enableFixedPoint = s.enableFixedPoint !== false;
  return s;
}
function styleAt(level, branch, settings, themes) {
  const base = themes[settings.theme] || THEMES.rainbow;
  const theme = { ...THEMES.rainbow, ...(base && typeof base === "object" ? base : {}), ...(settings.theme === "custom" && settings.customTheme || {}) };
  const levels = Array.isArray(theme.levels) && theme.levels.length ? theme.levels : LEVELS;
  const conf = { ...LEVELS[Math.min(level - 1, LEVELS.length - 1)], ...levels[Math.min(level - 1, levels.length - 1)] };
  const colors = Array.isArray(theme.colors) && theme.colors.length ? theme.colors : THEMES.rainbow.colors;
  let backgroundColor = level === 1 ? theme.rootBg : colors[branch % colors.length];
  if (level > 2 && /^#[\da-f]{6}$/i.test(backgroundColor)) {
    const delta = Math.round(2.55 * Math.min((level - 2) * 15, 60));
    backgroundColor = "#" + backgroundColor.slice(1).match(/../g).map(c => Math.min(255, parseInt(c, 16) + delta).toString(16).padStart(2, "0")).join("");
  }
  return { backgroundColor, strokeColor: conf.strokeColor || "black", textColor: conf.textColor || "black", fontSize: finite(conf.fontSize, 20, 8, 200), strokeWidth: finite(conf.strokeWidth, 1, 0.1, 20) };
}
/** Index once; bound text, groups, frames and swimlane attachments are never independent tree nodes. */
function indexScene(elements) {
  const map = new Map(), groups = new Map(), attachments = new Map();
  for (const el of elements) {
    if (!el || el.isDeleted) continue;
    map.set(el.id, el);
    for (const group of el.groupIds || []) append(groups, group, el);
    if (el.containerId) append(attachments, el.containerId, el);
    if (el.frameId) append(attachments, el.frameId, el);
    if (el.customData?.parent) append(attachments, el.customData.parent, el);
  }
  return { map, groups, attachments };
}
function related(index, nodes) {
  const result = new Map();
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const node of nodes) {
    result.set(node.id, node);
    const add = el => { if (el && (!el.customData?.mindmap || nodeIds.has(el.id)) && !el.customData?.zoomHide) result.set(el.id, el); };
    for (const bound of node.boundElements || []) if (bound.type !== "arrow") add(index.map.get(bound.id));
    for (const group of node.groupIds || []) for (const el of index.groups.get(group) || []) add(el);
    for (const el of index.attachments.get(node.id) || []) add(el);
  }
  return [...result.values()];
}
/** Validates all edges before mutation. Iteration is bounded by nodes + edges even for corrupt scenes. */
function buildForest(elements, initialize = false) {
  const index = indexScene(elements), nodes = new Map(), arrows = [];
  for (const el of index.map.values()) if (isNode(el) && (initialize || el.customData?.mindmap)) nodes.set(el.id, { el, parent: null, children: [], arrow: null, level: 1, branch: 0 });
  for (const el of index.map.values()) {
    if (!["arrow", "line"].includes(el.type)) continue;
    const a = nodes.get(el.startBinding?.elementId), b = nodes.get(el.endBinding?.elementId);
    if (!a || !b) continue;
    if (!initialize && a.el.customData.mindmap.root !== b.el.customData.mindmap.root) continue;
    if (a === b || b.parent) throw new Error(t("invalid"));
    b.parent = a; b.arrow = el; a.children.push(b); arrows.push(el);
  }
  const roots = [...nodes.values()].filter(n => !n.parent), order = [], stack = [...roots].reverse();
  while (stack.length) {
    const node = stack.pop(); order.push(node);
    node.level = node.parent ? node.parent.level + 1 : 1;
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  if (order.length !== nodes.size) throw new Error(t("invalid"));
  if (!initialize) for (const node of order) {
    const mm = node.el.customData.mindmap;
    if ((!node.parent && mm.root !== node.el.id) || (node.parent && mm.parent !== node.parent.el.id)) throw new Error(t("invalid"));
  }
  return { ...index, nodes, roots, order, arrows };
}
function descendants(node, includeSelf = false) {
  const result = [], stack = includeSelf ? [node] : [...node.children].reverse();
  while (stack.length) { const n = stack.pop(); result.push(n); for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]); }
  return result;
}
function treeElements(elements, rootId) {
  const index = indexScene(elements), nodes = [...index.map.values()].filter(el => isNode(el) && el.customData?.mindmap?.root === rootId);
  const ids = new Set(nodes.map(el => el.id));
  const result = related(index, nodes);
  for (const el of index.map.values()) if (["arrow", "line"].includes(el.type) && ids.has(el.startBinding?.elementId) && ids.has(el.endBinding?.elementId)) result.push(el);
  return result;
}
function updateLine(parent, child, settings, style) {
  const line = child.arrow, a = parent.el, b = child.el;
  if (!line) return;
  const ports = { LR: [[1, .5], [0, .5]], RL: [[0, .5], [1, .5]], TD: [[.5, 1], [.5, 0]], BU: [[.5, 0], [.5, 1]] }[settings.direction];
  line.x = a.x + a.width * ports[0][0]; line.y = a.y + a.height * ports[0][1];
  const dx = b.x + b.width * ports[1][0] - line.x, dy = b.y + b.height * ports[1][1] - line.y;
  line.angle = 0;
  for (const [key, node, port] of [["startBinding", a, ports[0]], ["endBinding", b, ports[1]]]) {
    line[key] = { ...line[key], elementId: node.id, focus: 0, gap: 1 };
    if (settings.enableFixedPoint) { line[key].fixedPoint = port; line[key].mode = "inside"; }
    else { delete line[key].fixedPoint; delete line[key].mode; }
  }
  const horizontal = ["LR", "RL"].includes(settings.direction);
  line.elbowed = settings.arrowType === "elbow";
  line.customData = { ...line.customData };
  if (settings.arrowType === "curve") line.customData.curveArrow = true; else delete line.customData.curveArrow;
  if (line.elbowed) line.points = horizontal ? [[0, 0], [dx / 2, 0], [dx / 2, dy], [dx, dy]] : [[0, 0], [0, dy / 2], [dx, dy / 2], [dx, dy]];
  else if (line.customData.curveArrow || parent.children.length === 1 || (horizontal ? Math.abs(dy) : Math.abs(dx)) < 1) line.points = [[0, 0], [dx, dy]];
  else line.points = horizontal ? [[0, 0], [dx * .4, dy * .8905], [dx, dy]] : [[0, 0], [dx * .8905, dy * .4], [dx, dy]];
  line.width = Math.abs(dx); line.height = Math.abs(dy);
  line.strokeColor = style.strokeColor; line.strokeWidth = style.strokeWidth;
}
/** Two iterative passes (postorder dimensions, preorder coordinates); move each attachment once. */
function layoutCopies(elements, workingEA) {
  const forest = buildForest(elements), config = getConfiguration(), attached = new Set();
  for (const root of forest.roots) {
    const settings = normalizeSettings(root.el.customData.mindmap.settings || config.defaultSettings);
    const horizontal = ["LR", "RL"].includes(settings.direction), order = [], stack = [root];
    while (stack.length) {
      const node = stack.pop(); order.push(node);
      node.children.sort((a, b) => horizontal ? a.el.y + a.el.height / 2 - b.el.y - b.el.height / 2 : a.el.x + a.el.width / 2 - b.el.x - b.el.width / 2);
      node.level = node.parent ? node.parent.level + 1 : 1;
      node.el.customData.mindmap.level = node.level;
      const style = styleAt(node.level, node.branch, settings, config.themes);
      Object.assign(node.el, { backgroundColor: style.backgroundColor, strokeColor: style.strokeColor, strokeWidth: style.strokeWidth });
      if (node.el.type === "text") { node.el.strokeColor = style.textColor; node.el.fontSize = style.fontSize; }
      for (const bound of node.el.boundElements || []) {
        const text = forest.map.get(bound.id);
        if (text?.type === "text") { text.strokeColor = style.textColor; text.fontSize = style.fontSize; }
      }
      // Native measurements account for changed font sizes before calculating subtree dimensions.
      if (workingEA) for (const el of [node.el, ...(node.el.boundElements || []).filter(b => b.type === "text").map(b => forest.map.get(b.id))]) {
        if (el?.type !== "text") continue;
        workingEA.style.fontSize = el.fontSize; workingEA.style.fontFamily = el.fontFamily;
        const measure = workingEA.measureText(el.originalText || el.text || " ");
        if (!el.containerId) { el.width = measure.width; el.height = measure.height; }
        else { node.el.width = Math.max(node.el.width, measure.width + 20); node.el.height = Math.max(node.el.height, measure.height + 20); }
      }
      for (const value of [node.el.x, node.el.y, node.el.width, node.el.height]) if (!Number.isFinite(value)) throw new Error(t("invalid"));
      for (let i = node.children.length - 1; i >= 0; i--) { node.children[i].branch = node.level === 1 ? i : node.branch; stack.push(node.children[i]); }
    }
    for (let i = order.length - 1; i >= 0; i--) {
      const n = order[i]; n.childrenSpan = n.children.reduce((sum, child) => sum + child.span, 0);
      n.span = n.el.customData?.hide ? 0 : Math.max((horizontal ? n.el.height : n.el.width) + settings.defaultGap, n.childrenSpan);
    }
    root.cross = (horizontal ? root.el.y + root.el.height / 2 : root.el.x + root.el.width / 2) - root.span / 2;
    for (const n of order) {
      if (!n.parent) { n.x = n.el.x; n.y = n.el.y; }
      else if (horizontal) { n.x = n.along; n.y = n.cross + n.span / 2 - n.el.height / 2; }
      else { n.x = n.cross + n.span / 2 - n.el.width / 2; n.y = n.along; }
      const dx = n.x - n.el.x, dy = n.y - n.el.y;
      n.el.x = n.x; n.el.y = n.y;
      for (const extra of related(forest, [n.el])) {
        if (extra.id === n.el.id || forest.nodes.has(extra.id) || attached.has(extra.id)) continue;
        extra.x += dx; extra.y += dy; attached.add(extra.id);
      }
      let cross = n.cross + (n.span - n.childrenSpan) / 2;
      const gap = settings.lengthBetweenElAndLine + settings.curveLength;
      for (const child of n.children) {
        child.cross = cross; cross += child.span;
        child.along = settings.direction === "LR" ? n.x + n.el.width + gap : settings.direction === "RL" ? n.x - gap - child.el.width : settings.direction === "TD" ? n.y + n.el.height + gap : n.y - gap - child.el.height;
      }
      if (n.parent) updateLine(n.parent, n, settings, styleAt(n.level, n.branch, settings, config.themes));
    }
  }
  return forest;
}
let stopped = false;
const controllers = new Map();
function getView(context) {
  const leaves = plugin.app.workspace.getLeavesOfType("excalidraw");
  if (context.canvas) return leaves.find(leaf => leaf.view.containerEl?.contains(context.canvas))?.view;
  if (context.App?.api) return leaves.find(leaf => leaf.view.excalidrawAPI === context.App.api)?.view;
  if (context.scene) {
    const elements = context.scene.getNonDeletedElements();
    return leaves.find(leaf => {
      const scene = leaf.view.excalidrawAPI?.getSceneElements();
      return scene === elements || (context.selectedElements?.[0] && scene?.includes(context.selectedElements[0]));
    })?.view;
  }
  const target = context.event?.target || context.App?.interactiveCanvas;
  if (target) return leaves.find(leaf => leaf.view.containerEl?.contains(target))?.view;
  return undefined;
}
function validController(controller) {
  const v = controller.view;
  return !stopped && !controller.disposed && v._loaded && !v.semaphores?.viewunload && v.file?.path === controller.path && v.excalidrawAPI === controller.api && v.containerEl.isConnected;
}
function assertController(controller) { if (!validController(controller)) throw new Error(t("stale")); }
function disposeController(c) {
  if (c.disposed) return;
  c.disposed = true;
  for (const remove of c.cleanup) remove();
  c.inputModal?.close();
  c.toolbar?.remove(); c.worker.destroy(); c.gesture = null; c.drop = null;
  controllers.delete(c.view);
}
function getController(view) {
  if (stopped || !view || !view._loaded || !view.excalidrawAPI || !view.file) throw new Error(t("stale"));
  let c = controllers.get(view);
  if (c && !validController(c)) { disposeController(c); c = null; }
  if (c) return c;
  const worker = ExcalidrawAutomate.getAPI(view), doc = view.containerEl.ownerDocument;
  c = { view, path: view.file.path, api: view.excalidrawAPI, worker, queue: Promise.resolve(), cleanup: [], disposed: false, gesture: null, pointers: new Set(), toolbar: null, drop: null, dragging: false, uiKey: "" };
  controllers.set(view, c);
  const listen = (target, name, fn, options) => { target.addEventListener(name, fn, options); c.cleanup.push(() => target.removeEventListener(name, fn, options)); };
  const cancel = () => { c.gesture = null; c.drop = null; c.dragging = false; c.pointers.clear(); };
  listen(doc, "pointerdown", event => {
    if (!view.containerEl.contains(event.target)) return;
    c.pointers.add(event.pointerId);
    if (c.pointers.size > 1 && c.gesture) c.gesture.cancelled = true;
  }, true);
  listen(doc, "pointermove", event => {
    const g = c.gesture;
    if (g && g.id === event.pointerId && Math.hypot(event.clientX - g.x, event.clientY - g.y) > 8) g.cancelled = true;
  }, true);
  listen(doc, "pointerup", event => { c.pointers.delete(event.pointerId); }, true);
  listen(doc, "pointercancel", cancel, true);
  listen(doc, "lostpointercapture", event => { if (c.pointers.has(event.pointerId)) cancel(); }, true);
  listen(doc, "contextmenu", event => { if (view.containerEl.contains(event.target)) cancel(); }, true);
  listen(doc.defaultView, "blur", cancel);
  c.cleanup.push(c.api.onChange(() => { if (validController(c)) updateToolbar(c); else disposeController(c); }));
  return c;
}
/** A view-local serialized mutation with its own EA workbench. Never falls back to the active drawing. */
function runAction(activeEa, callback, { allowViewMode = false } = {}) {
  const view = activeEa?.targetView;
  const c = getController(view), path = c.path, api = c.api;
  const result = c.queue.then(async () => {
    assertController(c);
    if (c.path !== path || c.api !== api) throw new Error(t("stale"));
    if (!allowViewMode && api.getAppState().viewModeEnabled) throw new Error(t("readonly"));
    c.worker.clear();
    const snapshot = () => api.getSceneElements().map(el => [el.id, el.version, el.versionNonce]);
    let baseline = snapshot();
    const assertCurrent = () => {
      assertController(c);
      if (!allowViewMode && api.getAppState().viewModeEnabled) throw new Error(t("readonly"));
      const current = api.getSceneElements();
      if (current.length !== baseline.length || current.some((el, i) => el.id !== baseline[i][0] || el.version !== baseline[i][1] || el.versionNonce !== baseline[i][2])) throw new Error(t("stale"));
    };
    const session = { ea: c.worker, api, view, filePath: path, assertCurrent,
      async commit(capture = "IMMEDIATELY") {
        assertCurrent();
        // Text parsing awaits inside view.addElements; recheck immediately before native publication.
        const result = await view.addElements({ newElements: c.worker.getElements(), save: false, newElementsOnTop: false, shouldRestoreElements: false, captureUpdate: capture, validateBeforePublish: assertCurrent });
        assertController(c);
        baseline = snapshot();
        if (result === false) throw new Error(t("stale"));
      },
      async layout(elements, history = true) {
        assertCurrent();
        const pending = new Map(elements.filter(Boolean).map(el => [el.id, el]));
        for (const el of c.worker.getElements()) pending.set(el.id, el);
        c.worker.clear(); c.worker.copyViewElementsToEAforEditing([...pending.values()]);
        layoutCopies(c.worker.getElements(), c.worker);
        await session.commit(history ? "IMMEDIATELY" : "EVENTUALLY");
      }
    };
    try { return await callback(session); } finally { c.worker.clear(); }
  });
  c.queue = result.catch(() => {});
  return result;
}
function fire(promise) { Promise.resolve(promise).catch(report); }
function singleNode(api) {
  const state = api.getAppState(), selected = api.getSceneElements().filter(el => state.selectedElementIds?.[el.id] && !el.containerId);
  return selected.length === 1 && isNode(selected[0]) && selected[0].customData?.mindmap ? selected[0] : null;
}
function freshNode(session, id) {
  const el = session.api.getSceneElements().find(el => el.id === id && !el.isDeleted);
  if (!el?.customData?.mindmap) throw new Error(t("stale"));
  return el;
}
function toggleFold(selected, App, activeEa, recurse = null) {
  return runAction(activeEa, async session => {
    const el = freshNode(session, selected.id), elements = treeElements(session.api.getSceneElements(), el.customData.mindmap.root);
    const forest = buildForest(elements), node = forest.nodes.get(el.id);
    if (!node?.children.length) return;
    session.ea.copyViewElementsToEAforEditing(elements);
    const open = el.customData.mindmap.status === "open", recursive = open || recurse === true;
    const affected = descendants(node);
    const updates = new Map();
    for (const n of affected) if (recursive || n.parent === node) updates.set(n.el.id, n);
    for (const n of updates.values()) {
      const copy = session.ea.getElement(n.el.id);
      copy.customData.mindmap.status = recursive ? (open ? "close" : "open") : copy.customData.mindmap.status;
      for (const extra of related(forest, [n.el])) {
        const item = session.ea.getElement(extra.id);
        if (item) item.customData = { ...item.customData, hide: open };
      }
      if (n.arrow) session.ea.getElement(n.arrow.id).customData = { ...n.arrow.customData, hide: open };
    }
    session.ea.getElement(el.id).customData.mindmap.status = open ? "close" : "open";
    await session.layout(elements, true);
  }, { allowViewMode: true });
}
function isMobile(c) {
  return ea.obsidian.Platform.isMobile || c.api.getAppState().stylesPanelMode === "mobile" || c.view.containerEl.ownerDocument.defaultView.matchMedia("(pointer: coarse)").matches;
}
/** Mobile editing uses a native multiline modal so its textarea focuses during the trusted click. */
function promptText(view, initial) {
  const c = getController(view);
  if (c.inputModal) return Promise.resolve(null);
  return new Promise(resolve => {
    const { Modal, Setting } = ea.obsidian;
    class TextModal extends Modal {
      onOpen() {
        this.setTitle(t("edit_text"));
        const input = this.contentEl.createEl("textarea", { attr: { "aria-label": t("edit_text"), rows: "5" } });
        input.value = initial; input.setCssStyles({ width: "100%", minHeight: "120px" });
        new Setting(this.contentEl).addButton(b => b.setButtonText(t("tb_edit")).setCta().onClick(() => {
          if (!input.value.trim()) { new ea.obsidian.Notice(t("empty")); return; }
          this.result = input.value; this.close();
        }));
        input.focus();
      }
      onClose() { c.inputModal = null; resolve(this.result ?? null); this.contentEl.empty(); }
    }
    c.inputModal = new TextModal(plugin.app);
    c.inputModal.open();
  });
}
async function startEdit(selected, App, activeEa) {
  const c = getController(activeEa?.targetView || getView({ App })); assertController(c);
  if (c.api.getAppState().viewModeEnabled) return;
  const node = c.api.getSceneElements().find(el => el.id === selected.id), index = indexScene(c.api.getSceneElements());
  const text = node?.type === "text" ? node : index.map.get(node?.boundElements?.find(b => b.type === "text")?.id);
  if (!text) return;
  if (App && getView({ App }) === c.view && !isMobile(c)) {
    App.startTextEditing(text === node ? { sceneX: node.x, sceneY: node.y, textElement: text } : { sceneX: node.x, sceneY: node.y, container: node });
    return;
  }
  const textVersion = text.version, textNonce = text.versionNonce;
  const value = await promptText(c.view, text.originalText || text.text || "");
  if (value === null) return;
  assertController(c);
  await runAction(c.worker, async session => {
    const current = freshNode(session, selected.id), elements = treeElements(session.api.getSceneElements(), current.customData.mindmap.root);
    const liveText = session.api.getSceneElements().find(el => el.id === text.id);
    if (!liveText || liveText.version !== textVersion || liveText.versionNonce !== textNonce) throw new Error(t("stale"));
    session.ea.copyViewElementsToEAforEditing(elements);
    const copy = session.ea.getElement(text.id); copy.originalText = value; copy.text = value;
    if (typeof copy.rawText === "string") copy.rawText = value;
    await session.layout(elements, true);
  });
}
async function addNode(selected, pos, App, activeEa) {
  const c = getController(activeEa?.targetView || getView({ App }));
  const live = freshNode({ api: c.api }, selected.id);
  if (pos === "same" && live.id === live.customData.mindmap.root) return null;
  const inline = App && getView({ App }) === c.view && !isMobile(c);
  const value = inline ? t("new_text") : await promptText(c.view, t("new_text"));
  if (value === null) return null;
  assertController(c);
  return runAction(c.worker, async session => {
    const source = freshNode(session, selected.id), elements = treeElements(session.api.getSceneElements(), source.customData.mindmap.root), forest = buildForest(elements);
    const selectedNode = forest.nodes.get(source.id), parent = pos === "same" ? selectedNode.parent : selectedNode;
    if (!parent) return null;
    session.ea.copyViewElementsToEAforEditing(elements);
    const settings = normalizeSettings(forest.map.get(source.customData.mindmap.root).customData.mindmap.settings || getConfiguration().defaultSettings);
    Object.assign(session.ea.style, { fontFamily: session.api.getAppState().currentItemFontFamily, roughness: source.roughness ?? 0, fillStyle: source.fillStyle || "solid", opacity: source.opacity ?? 100, fontSize: 20 });
    const horizontal = ["LR", "RL"].includes(settings.direction);
    let x = source.x, y = source.y;
    if (pos === "same") { if (horizontal) y += source.height + 20; else x += source.width + 20; }
    else {
      if (horizontal) x += source.width + 140; else y += source.height + 140;
      for (const child of parent.children) {
        if (horizontal) y = Math.max(y, child.el.y + child.el.height + 20);
        else x = Math.max(x, child.el.x + child.el.width + 20);
      }
    }
    const id = session.ea.addText(x, y, value, { box: true, textAlign: "center", textVerticalAlign: "middle" });
    const added = session.ea.getElement(id);
    added.customData = { ...added.customData, mindmap: { root: source.customData.mindmap.root, parent: parent.el.id, level: parent.level + 1, status: "open" } };
    const p = session.ea.getElement(parent.el.id); p.customData.mindmap.status = "open";
    for (const child of parent.children) {
      for (const extra of related(forest, [child.el])) {
        const item = session.ea.getElement(extra.id);
        if (item) item.customData = { ...item.customData, hide: false };
      }
      if (child.arrow) session.ea.getElement(child.arrow.id).customData = { ...child.arrow.customData, hide: false };
    }
    const ports = { LR: ["right", "left"], RL: ["left", "right"], TD: ["bottom", "top"], BU: ["top", "bottom"] }[settings.direction];
    session.ea.connectObjects(parent.el.id, ports[0], id, ports[1], { startArrowHead: null });
    await session.layout(elements, true);
    session.api.updateScene({ appState: { selectedElementIds: { [id]: true }, selectedGroupIds: {}, editingGroupId: null } });
    const published = session.api.getSceneElements().find(el => el.id === id);
    if (!published) throw new Error(t("stale"));
    if (inline) App.startTextEditing({ sceneX: published.x, sceneY: published.y, container: published });
    return published;
  });
}
function iconCenter(el, map) {
  const root = map.get(el.customData.mindmap.root), direction = root?.customData?.mindmap?.settings?.direction || "LR";
  const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
  const dx = direction === "LR" ? el.width / 2 : direction === "RL" ? -el.width / 2 : 0;
  const dy = direction === "TD" ? el.height / 2 : direction === "BU" ? -el.height / 2 : 0;
  const angle = el.angle || 0;
  return { x: cx + dx * Math.cos(angle) - dy * Math.sin(angle), y: cy + dx * Math.sin(angle) + dy * Math.cos(angle) };
}
function childCount(el, map) {
  let count = 0;
  for (const bound of el.boundElements || []) {
    const link = map.get(bound.id), child = map.get(link?.endBinding?.elementId);
    if (link?.startBinding?.elementId === el.id && child?.customData?.mindmap?.root === el.customData.mindmap.root && child.customData.mindmap.parent === el.id) count++;
  }
  return count;
}
function hasChildren(el, map) { return childCount(el, map) > 0; }
function hitIcon(c, point, touch) {
  if (!point || !plugin.settings.mindmapHandle) return null;
  const elements = c.api.getSceneElements(), map = new Map(elements.map(el => [el.id, el])), zoom = c.api.getAppState().zoom.value;
  let best = null, distance = Infinity;
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!isNode(el) || el.customData?.hide || !el.customData?.mindmap || !hasChildren(el, map)) continue;
    const center = iconCenter(el, map), d = Math.hypot(point.x - center.x, point.y - center.y) * zoom;
    if (d <= (touch ? 22 : 14) && d < distance) { distance = d; best = el; }
  }
  return best;
}
function updateToolbar(c) {
  const state = c.api.getAppState(), node = singleNode(c.api);
  const mobile = ea.obsidian.Platform.isMobile || state.stylesPanelMode === "mobile" || c.view.containerEl.ownerDocument.defaultView.matchMedia("(pointer: coarse)").matches;
  const active = plugin.app.workspace.activeLeaf?.view === c.view;
  const visible = mobile && active && node && !state.viewModeEnabled && !state.editingTextElement && !state.newElement && state.activeTool?.type === "selection";
  const key = visible ? `${node.id}:${node.customData.mindmap.status}:${node.id === node.customData.mindmap.root}:${hasChildren(node, new Map(c.api.getSceneElements().map(el => [el.id, el])))}` : "hidden";
  if (key === c.uiKey) return;
  c.uiKey = key;
  if (!visible) { c.toolbar?.hide(); return; }
  if (!c.toolbar) {
    const parent = c.view.containerEl.querySelector(".excalidraw") || c.view.containerEl;
    const bar = parent.createDiv({ attr: { role: "toolbar", "aria-label": "Mindmap" } });
    bar.setCssStyles({ position: "absolute", left: "8px", right: "8px", bottom: "calc(112px + env(safe-area-inset-bottom, 0px))", display: "flex", gap: "4px", padding: "6px", borderRadius: "12px", background: "var(--background-primary)", border: "1px solid var(--background-modifier-border)", zIndex: "5", overflowX: "auto" });
    c.buttons = {};
    for (const [action, label] of [["child", "tb_child"], ["sibling", "tb_sibling"], ["fold", "tb_fold"], ["edit", "tb_edit"]]) {
      const button = bar.createEl("button", { text: t(label), attr: { "aria-label": t(label) } });
      button.setCssStyles({ minHeight: "44px", minWidth: "44px", flex: "1 0 auto", padding: "4px 8px" });
      button.onClickEvent(() => {
        const selected = singleNode(c.api);
        if (!selected || !validController(c)) return;
        const operation = action === "child" ? addNode(selected, "next", null, c.worker) : action === "sibling" ? addNode(selected, "same", null, c.worker) : action === "fold" ? toggleFold(selected, null, c.worker) : startEdit(selected, null, c.worker);
        fire(operation);
      });
      c.buttons[action] = button;
    }
    c.toolbar = bar;
  }
  c.buttons.sibling.disabled = node.id === node.customData.mindmap.root;
  c.buttons.fold.disabled = !hasChildren(node, new Map(c.api.getSceneElements().map(el => [el.id, el])));
  const label = t(node.customData.mindmap.status === "close" ? "tb_unfold" : "tb_fold");
  c.buttons.fold.setText(label); c.buttons.fold.setAttribute("aria-label", label);
  c.toolbar.show();
  c.toolbar.setCssStyles({ display: "flex" });
}
function pointerDown(context) {
  const view = getView(context); if (!view) return false;
  const c = getController(view), e = context.event;
  if (!e || e.button !== 0 || e.isPrimary === false || c.pointers.size > 1 || e.target?.closest?.("button, input, textarea, select")) { c.gesture = null; return false; }
  const target = hitIcon(c, context.scenePointer, e.pointerType === "touch");
  c.gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, time: Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now(), target: target?.id, touch: e.pointerType === "touch", cancelled: false };
  c.dragging = false; c.drop = null;
  // Let native touch tracking receive down: intercepting here disables pinch/pan cleanup.
  return false;
}
function pointerMove(context) {
  const view = getView(context); if (!view) return false;
  const c = getController(view), e = context.event, g = c.gesture;
  if (g && e && g.id === e.pointerId && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) g.cancelled = true;
  return false;
}
function dropTarget(c) {
  const state = c.api.getAppState(), selected = c.api.getSceneElements().filter(el => state.selectedElementIds?.[el.id] && !el.containerId);
  const source = selected.length === 1 && isNode(selected[0]) ? selected[0] : null;
  if (!source || source.id === source.customData?.mindmap?.root) return null;
  const all = c.api.getSceneElements(), map = new Map(all.map(el => [el.id, el]));
  const excluded = new Set([source.id]), stack = [source.id], children = new Map();
  for (const el of all) if (el.customData?.mindmap?.parent && el.id !== el.customData.mindmap.parent) append(children, el.customData.mindmap.parent, el.id);
  while (stack.length) for (const id of children.get(stack.pop()) || []) if (!excluded.has(id)) { excluded.add(id); stack.push(id); }
  for (let i = all.length - 1; i >= 0; i--) {
    const target = all[i];
    if (!isNode(target) || !target.customData?.mindmap || target.customData?.hide || excluded.has(target.id)) continue;
    if (source.x + source.width <= target.x || target.x + target.width <= source.x || source.y + source.height <= target.y || target.y + target.height <= source.y) continue;
    const settings = normalizeSettings(map.get(target.customData.mindmap.root)?.customData.mindmap.settings);
    const dx = source.x + source.width / 2 - target.x - target.width / 2, dy = source.y + source.height / 2 - target.y - target.height / 2;
    const horizontal = ["LR", "RL"].includes(settings.direction);
    const child = settings.direction === "LR" ? dx > Math.abs(dy) : settings.direction === "RL" ? -dx > Math.abs(dy) : settings.direction === "TD" ? dy > Math.abs(dx) : -dy > Math.abs(dx);
    const zone = child ? "child" : (horizontal ? dy : dx) < 0 ? "before" : "after";
    return { source: source.id, target: target.id, zone };
  }
  return null;
}
function reparent(c, drop) {
  return runAction(c.worker, async session => {
    const all = session.api.getSceneElements(), index = indexScene(all), sourceEl = index.map.get(drop.source), targetEl = index.map.get(drop.target);
    if (!isNode(sourceEl) || !targetEl?.customData?.mindmap || sourceEl.id === sourceEl.customData?.mindmap?.root) return;
    const roots = new Set([sourceEl.customData?.mindmap?.root, targetEl.customData.mindmap.root].filter(Boolean));
    const relevant = new Map();
    for (const root of roots) for (const el of treeElements(all, root)) relevant.set(el.id, el);
    const elements = [...relevant.values()], forest = buildForest(elements);
    const source = forest.nodes.get(drop.source) || { el: sourceEl, parent: null, children: [], arrow: null, level: 1 };
    const target = forest.nodes.get(drop.target);
    if (!target) return;
    const moved = descendants(source, true), ids = new Set(moved.map(n => n.el.id));
    if (ids.has(target.el.id)) throw new Error(t("invalid"));
    const parent = drop.zone === "child" ? target : target.parent || target;
    if (ids.has(parent.el.id)) throw new Error(t("invalid"));
    for (const el of related(index, [source.el])) relevant.set(el.id, el);
    session.ea.copyViewElementsToEAforEditing([...relevant.values()]);
    const oldArrow = source.arrow && session.ea.getElement(source.arrow.id);
    if (oldArrow) oldArrow.isDeleted = true;
    const hidden = new Map();
    for (const n of moved) {
      const el = session.ea.getElement(n.el.id);
      el.customData = { ...el.customData, mindmap: { status: "open", ...el.customData?.mindmap, root: target.el.customData.mindmap.root } };
      el.customData.mindmap.level = parent.level + n.level - source.level + 1;
      const hide = n !== source && (hidden.get(n.parent.el.id) || n.parent.el.customData?.mindmap?.status === "close");
      hidden.set(n.el.id, hide);
      for (const extra of related(index, [n.el])) { const item = session.ea.getElement(extra.id); if (item) item.customData = { ...item.customData, hide }; }
      if (n.arrow && n !== source) session.ea.getElement(n.arrow.id).customData = { ...n.arrow.customData, hide };
    }
    const copy = session.ea.getElement(source.el.id); copy.customData.mindmap.parent = parent.el.id;
    const settings = normalizeSettings(forest.map.get(target.el.customData.mindmap.root).customData.mindmap.settings);
    if (["LR", "RL"].includes(settings.direction)) copy.y = target.el.y + (drop.zone === "before" ? -copy.height : target.el.height + 1);
    else copy.x = target.el.x + (drop.zone === "before" ? -copy.width : target.el.width + 1);
    session.ea.getElement(parent.el.id).customData.mindmap.status = "open";
    for (const child of parent.children) {
      if (child === source) continue;
      for (const extra of related(index, [child.el])) {
        const item = session.ea.getElement(extra.id);
        if (item) item.customData = { ...item.customData, hide: false };
      }
      if (child.arrow) session.ea.getElement(child.arrow.id).customData = { ...child.arrow.customData, hide: false };
    }
    if (oldArrow) for (const el of [session.ea.getElement(source.parent.el.id), copy]) el.boundElements = (el.boundElements || []).filter(b => b.id !== oldArrow.id);
    session.ea.connectObjects(parent.el.id, "right", copy.id, "left", { startArrowHead: null });
    await session.layout(elements, true);
  });
}
function pointerUp(context) {
  const view = getView(context); if (!view) return false;
  const c = getController(view), g = c.gesture, e = context.event;
  c.gesture = null;
  if (!g || e?.pointerId !== g.id) { c.dragging = false; c.drop = null; return false; }
  if (c.dragging && g?.cancelled && c.drop) fire(reparent(c, c.drop));
  else if (!g.cancelled && (Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now()) - g.time <= 500 && Math.hypot(e.clientX - g.x, e.clientY - g.y) <= 8) {
    const target = hitIcon(c, context.scenePointer, g.touch);
    if (target && g.target && target.id === g.target) fire(toggleFold(target, context.App, c.worker, e.ctrlKey || e.metaKey));
  }
  c.dragging = false; c.drop = null;
  return false;
}
function dragged(context) {
  const view = getView(context); if (!view) return false;
  const c = getController(view);
  if (context.selectedElements?.length === 1 && ["arrow", "line"].includes(context.selectedElements[0].type)) {
    const arrow = context.selectedElements[0], map = indexScene(c.api.getSceneElements()).map;
    if (map.get(arrow.startBinding?.elementId)?.customData?.mindmap || map.get(arrow.endBinding?.elementId)?.customData?.mindmap) {
      context.elementsToUpdate?.delete(arrow);
      return true;
    }
  }
  c.dragging = true; c.drop = dropTarget(c);
  return false;
}
function keyDown(context) {
  const view = getView(context); if (!view) return false;
  const c = getController(view), state = c.api.getAppState(), event = context.event, selected = singleNode(c.api);
  if (!selected || state.viewModeEnabled || state.editingTextElement || event.isComposing || event.target?.closest?.("input, textarea, [contenteditable=true]")) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) { if (!["/", "?"].includes(event.key)) return false; }
  let operation;
  if (event.code === "Tab" || event.code === "Enter") operation = addNode(selected, event.code === "Tab" ? "next" : "same", context.App, c.worker);
  else if (event.code === "Space") operation = startEdit(selected, context.App, c.worker);
  else if (["/", "?"].includes(event.key)) operation = toggleFold(selected, context.App, c.worker, event.ctrlKey || event.metaKey);
  else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    try {
      const forest = buildForest(treeElements(c.api.getSceneElements(), selected.customData.mindmap.root)), node = forest.nodes.get(selected.id);
      const direction = normalizeSettings(forest.map.get(selected.customData.mindmap.root).customData.mindmap.settings).direction;
      const forward = { LR: "ArrowRight", RL: "ArrowLeft", TD: "ArrowDown", BU: "ArrowUp" }[direction];
      const backward = { LR: "ArrowLeft", RL: "ArrowRight", TD: "ArrowUp", BU: "ArrowDown" }[direction];
      let target;
      if (event.code === forward) target = node.children.find(n => !n.el.customData?.hide);
      else if (event.code === backward) target = node.parent;
      else {
        const horizontal = ["LR", "RL"].includes(direction), peers = forest.order.filter(n => n.level === node.level && !n.el.customData?.hide);
        peers.sort((a, b) => horizontal ? a.el.y - b.el.y : a.el.x - b.el.x);
        const delta = ["ArrowUp", "ArrowLeft"].includes(event.code) ? -1 : 1;
        target = peers[peers.indexOf(node) + delta];
      }
      if (target) c.api.updateScene({ appState: { selectedElementIds: { [target.el.id]: true }, selectedGroupIds: {}, editingGroupId: null } });
    } catch (error) { report(error); }
  } else return false;
  event.preventDefault(); event.stopPropagation();
  if (operation) fire(operation);
  return true;
}
/** Runs synchronously inside the native deletion transaction; undo/redo retains consistent metadata. */
function afterDelete(context) {
  const next = context.nextElements;
  if (!next) return false;
  const live = indexScene(next), previous = context.App?.scene?.getNonDeletedElementsMap?.();
  const removed = new Set(next.filter(el => el.isDeleted && (!previous || previous.has(el.id))).map(el => el.id));
  const removedNodes = new Set(next.filter(el => removed.has(el.id) && el.customData?.mindmap).map(el => el.id));
  const removedLinks = next.filter(el => {
    if (!el.isDeleted || !removed.has(el.id) || !["arrow", "line"].includes(el.type)) return false;
    const parentId = el.startBinding?.elementId, child = live.map.get(el.endBinding?.elementId);
    return Boolean(parentId && child?.customData?.mindmap && child.customData.mindmap.parent === parentId);
  });
  if (!removedNodes.size && !removedLinks.length) return false;
  const affectedRoots = new Set(next.filter(el => removedNodes.has(el.id)).map(el => el.customData.mindmap.root));
  const orphans = new Set();
  const children = new Map();
  for (const el of live.map.values()) if (el.customData?.mindmap) {
    const mm = el.customData.mindmap; append(children, mm.parent, el.id);
    if (!live.map.has(mm.root) || (mm.parent && mm.parent !== el.id && !live.map.has(mm.parent))) orphans.add(el.id);
  }
  for (const el of removedLinks) {
    orphans.add(el.endBinding.elementId);
    affectedRoots.add(live.map.get(el.endBinding.elementId).customData.mindmap.root);
  }
  const stack = [...orphans];
  while (stack.length) for (const id of children.get(stack.pop()) || []) if (!orphans.has(id)) { orphans.add(id); stack.push(id); }
  const reveal = new Set(related(live, [...orphans].map(id => live.map.get(id)).filter(Boolean)).map(el => el.id));
  for (let i = 0; i < next.length; i++) {
    const el = next[i];
    if (el.isDeleted) continue;
    const incomingRemoved = ["arrow", "line"].includes(el.type) && (!live.map.has(el.startBinding?.elementId) || !live.map.has(el.endBinding?.elementId));
    if (incomingRemoved && (removedNodes.has(el.startBinding?.elementId) || removedNodes.has(el.endBinding?.elementId))) { next[i] = { ...el, isDeleted: true }; continue; }
    if (reveal.has(el.id) || (["arrow", "line"].includes(el.type) && orphans.has(el.startBinding?.elementId))) {
      const customData = { ...el.customData }; delete customData.hide;
      if (orphans.has(el.id)) delete customData.mindmap;
      next[i] = { ...el, customData };
    }
  }
  const deletedArrows = new Set(next.filter(el => el.isDeleted && ["arrow", "line"].includes(el.type)).map(el => el.id));
  const replacements = new Map();
  for (const root of affectedRoots) {
    const copies = treeElements(next, root).map(clone);
    if (!copies.some(el => el.id === root && el.customData?.mindmap)) continue;
    try {
      layoutCopies(copies);
      for (const el of copies) replacements.set(el.id, el);
    } catch (error) { report(error); }
  }
  for (let i = 0; i < next.length; i++) {
    const el = replacements.get(next[i].id) || next[i];
    if (!el.isDeleted && el.boundElements?.some(b => deletedArrows.has(b.id))) next[i] = { ...el, boundElements: el.boundElements.filter(b => !deletedArrows.has(b.id)) };
    else next[i] = el;
  }
  return false;
}
function render(context) {
  const view = getView(context); if (!view) return false;
  const c = getController(view), ctx = context.context, state = context.appState, map = context.elementsMap;
  if (!ctx || !state) return false;
  if (plugin.settings.mindmapHandle) for (const el of context.visibleElements || []) {
    if (!isNode(el) || !el.customData?.mindmap || el.customData.hide || !hasChildren(el, map)) continue;
    const center = iconCenter(el, map), closed = el.customData.mindmap.status === "close", z = state.zoom.value;
    ctx.save();
    try {
      ctx.translate((center.x + state.scrollX) * z, (center.y + state.scrollY) * z);
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffd8a8"; ctx.strokeStyle = "#f08c00"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (closed) {
        const count = childCount(el, map);
        ctx.fillStyle = "#f08c00"; ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(count), 0, 0);
      } else {
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
      }
    } finally { ctx.restore(); }
  }
  if (c.drop) {
    const el = map.get(c.drop.target);
    if (el) { ctx.save(); try { const z = state.zoom.value; ctx.strokeStyle = "#2f9e44"; ctx.lineWidth = 3; ctx.strokeRect((el.x + state.scrollX) * z - 4, (el.y + state.scrollY) * z - 4, el.width * z + 8, el.height * z + 8); } finally { ctx.restore(); } }
  }
  return false;
}
/** Recovery deliberately tolerates corrupt edges; the visited set prevents loops. */
function detach(ids, activeEa) {
  return runAction(activeEa, async session => {
    const all = session.api.getSceneElements(), index = indexScene(all), children = new Map(), removed = new Set(), roots = new Set();
    for (const el of all) if (el.customData?.mindmap && el.id !== el.customData.mindmap.parent) append(children, el.customData.mindmap.parent, el.id);
    const stack = ids.filter(id => index.map.get(id)?.customData?.mindmap);
    while (stack.length) {
      const id = stack.pop();
      if (removed.has(id)) continue;
      removed.add(id); roots.add(index.map.get(id).customData.mindmap.root);
      for (const child of children.get(id) || []) stack.push(child);
    }
    const nodes = [...removed].map(id => index.map.get(id));
    const edits = new Map(related(index, nodes).map(el => [el.id, el]));
    const boundary = new Set();
    for (const el of all) if (["arrow", "line"].includes(el.type)) {
      const start = el.startBinding?.elementId, end = el.endBinding?.elementId;
      if (removed.has(start) || removed.has(end)) {
        edits.set(el.id, el);
        if (!removed.has(start) && removed.has(end)) {
          boundary.add(el.id);
          if (index.map.has(start)) edits.set(start, index.map.get(start));
        }
      }
    }
    session.ea.copyViewElementsToEAforEditing([...edits.values()]);
    for (const el of session.ea.getElements()) {
      if (removed.has(el.id)) delete el.customData.mindmap;
      if (removed.has(el.id) || (["arrow", "line"].includes(el.type) && removed.has(el.startBinding?.elementId)) || !el.customData?.mindmap) {
        el.customData = { ...el.customData }; delete el.customData.hide;
      }
      if (["arrow", "line"].includes(el.type)) { delete el.customData.curveArrow; if (boundary.has(el.id)) el.isDeleted = true; }
      if (el.boundElements) el.boundElements = el.boundElements.filter(b => !boundary.has(b.id));
    }
    const remaining = [];
    for (const root of roots) remaining.push(...treeElements(all, root));
    await session.layout(remaining, true);
    return removed.size;
  });
}
function rescue(ids, activeEa) {
  return runAction(activeEa, async session => {
    const all = session.api.getSceneElements(), index = indexScene(all), nodes = all.filter(el => el.customData?.mindmap), selected = new Set(ids);
    const children = new Map(), stack = [...selected];
    for (const node of nodes) if (node.id !== node.customData.mindmap.parent) append(children, node.customData.mindmap.parent, node.id);
    while (stack.length) for (const id of children.get(stack.pop()) || []) if (!selected.has(id)) { selected.add(id); stack.push(id); }
    const edits = new Map(related(index, nodes).map(el => [el.id, el]));
    const nodeIds = new Set(nodes.map(el => el.id));
    for (const el of all) if (["arrow", "line"].includes(el.type) && nodeIds.has(el.startBinding?.elementId) && nodeIds.has(el.endBinding?.elementId)) edits.set(el.id, el);
    session.ea.copyViewElementsToEAforEditing([...edits.values()]);
    for (const el of session.ea.getElements()) {
      el.customData = { ...el.customData }; delete el.customData.hide;
      if (el.customData.mindmap) {
        if (selected.has(el.id)) delete el.customData.mindmap;
        else el.customData.mindmap.status = "open";
      }
    }
    await session.commit();
  });
}
const api = {
  getConfiguration, normalizeSettings, buildForest, treeElements, related, indexScene, descendants, runAction, promptText,
  detach, rescue,
  runLayout: (elements, history = false, activeEa) => runAction(activeEa, session => {
    const ids = new Set(elements.filter(Boolean).map(el => el.id));
    return session.layout(session.api.getSceneElements().filter(el => ids.has(el.id)), history);
  }),
  addNode, addChildNode: (el, App, activeEa) => addNode(el, "next", App, activeEa),
  addSiblingNode: (el, App, activeEa) => addNode(el, "same", App, activeEa), toggleFold, startEdit
};
hostWindow.MindmapAPI = api;
for (const [hook, handler] of [["handleCanvasPointerDown", pointerDown], ["handleCanvasPointerMove", pointerMove], ["handleCanvasPointerUp", pointerUp], ["dragSelectedElements", dragged], ["onKeyDown", keyDown], ["afterDeleteSelectedElements", afterDelete], ["renderInteractiveScene", render]]) core.registerHook(SCRIPT_ID, hook, handler, 50);
const prune = () => { for (const c of controllers.values()) { if (!validController(c)) disposeController(c); else updateToolbar(c); } };
const layoutRef = plugin.app.workspace.on("layout-change", prune);
const disable = () => {
  if (stopped) return;
  stopped = true; core.unregisterHook(SCRIPT_ID); plugin.app.workspace.offref(layoutRef);
  for (const c of [...controllers.values()]) disposeController(c);
  if (hostWindow.MindmapAPI === api) delete hostWindow.MindmapAPI;
  if (plugin[`disable_${SCRIPT_ID}`] === disable) delete plugin[`disable_${SCRIPT_ID}`];
};
plugin[`disable_${SCRIPT_ID}`] = disable;
if (!plugin._mindmapUnloadRegistered) {
  plugin._mindmapUnloadRegistered = true;
  plugin.register(() => { plugin[`disable_${SCRIPT_ID}`]?.(); delete plugin._mindmapUnloadRegistered; });
}
console.log(`[${SCRIPT_ID}] ${t("mounted")}`);
