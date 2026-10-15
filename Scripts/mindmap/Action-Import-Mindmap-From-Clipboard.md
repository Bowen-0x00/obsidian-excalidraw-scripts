---
name: 从剪贴板导入脑图
description: 从 Markdown 大纲创建脑图；剪贴板不可读时可手动粘贴多行文本。
author: ymjr
version: 1.1.0
license: MIT
usage: 复制 Markdown 标题或缩进列表后运行，在原生弹窗中粘贴、选择方向和主题，然后生成。
dependencies:
  - Feature-Mindmap-Engine 1.1.0
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: { title: "导入脑图", text: "粘贴 Markdown 大纲", theme: "主题", direction: "展开方向", arrow: "连线样式", fixed: "固定连线中点", create: "生成", empty: "请粘贴非空的大纲。", engine: "请先更新并运行脑图核心引擎。", stale: "画布已关闭或切换文件，请重新运行。", error: "导入失败：{message}", done: "脑图已生成。", lr: "向右", rl: "向左", td: "向下", bu: "向上", normal: "平滑曲线", elbow: "折线", curve: "S 型曲线" },
  en: { title: "Import mindmap", text: "Paste Markdown outline", theme: "Theme", direction: "Direction", arrow: "Connector", fixed: "Fixed center ports", create: "Create", empty: "Paste a non-empty outline.", engine: "Update and start the mindmap engine first.", stale: "The drawing closed or changed. Run the script again.", error: "Import failed: {message}", done: "Mindmap created.", lr: "Right", rl: "Left", td: "Down", bu: "Up", normal: "Smooth", elbow: "Elbow", curve: "S-curve" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { ...locales.zh, title: "匯入腦圖", text: "貼上 Markdown 大綱", direction: "展開方向", fixed: "固定連線中點", empty: "請貼上非空的大綱。", engine: "請先更新並執行腦圖核心引擎。", stale: "畫布已關閉或切換檔案，請重新執行。", error: "匯入失敗：{message}", done: "腦圖已生成。", normal: "平滑曲線", elbow: "折線", curve: "S 型曲線" };
const { Modal, Setting, Notice } = ea.obsidian;
const view = ea.targetView, api = view?.excalidrawAPI, filePath = view?.file?.path;
const engine = ea.plugin.app.workspace.containerEl.ownerDocument.defaultView.MindmapAPI;
if (!engine?.runAction) { new Notice(t("engine")); return; }
const check = () => { if (!view._loaded || view.semaphores?.viewunload || view.file?.path !== filePath || view.excalidrawAPI !== api) throw new Error(t("stale")); };
/** Iterative indentation parser: a heading's level participates in the same stack. */
function parseOutline(text) {
  const roots = [], stack = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const heading = raw.match(/^\s*(#{1,6})\s+(.+)$/), list = raw.match(/^(\s*)(?:[-*+]\s+|\d+[.)]\s+)?(.*)$/);
    const depth = heading ? heading[1].length - 1 : 6 + list[1].replace(/\t/g, "  ").length / 2;
    const node = { text: heading ? heading[2].trim() : list[2].trim(), depth, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node); else roots.push(node);
    stack.push(node);
  }
  return roots;
}
try {
  check();
  let clipboard = "";
  try { clipboard = await view.containerEl.ownerDocument.defaultView.navigator.clipboard.readText(); } catch { /* The modal always provides a manual paste surface. */ }
  check();
  const config = engine.getConfiguration(), settings = { ...config.defaultSettings };
  const result = await new Promise(resolve => {
    class ImportModal extends Modal {
      onOpen() {
        this.setTitle(t("title"));
        const input = this.contentEl.createEl("textarea", { attr: { rows: "8", "aria-label": t("text"), placeholder: t("text") } });
        input.value = clipboard; input.setCssStyles({ width: "100%", minHeight: "160px" });
        new Setting(this.contentEl).setName(t("theme")).addDropdown(d => {
          for (const [key, theme] of Object.entries(config.themes)) d.addOption(key, theme?.name || key);
          d.setValue(settings.theme).onChange(value => settings.theme = value);
        });
        new Setting(this.contentEl).setName(t("direction")).addDropdown(d => d.addOptions({ LR: t("lr"), RL: t("rl"), TD: t("td"), BU: t("bu") }).setValue(settings.direction).onChange(value => settings.direction = value));
        new Setting(this.contentEl).setName(t("arrow")).addDropdown(d => d.addOptions({ normal: t("normal"), elbow: t("elbow"), curve: t("curve") }).setValue(settings.arrowType).onChange(value => settings.arrowType = value));
        new Setting(this.contentEl).setName(t("fixed")).addToggle(d => d.setValue(settings.enableFixedPoint).onChange(value => settings.enableFixedPoint = value));
        new Setting(this.contentEl).addButton(b => b.setButtonText(t("create")).setCta().onClick(() => {
          if (!input.value.trim()) { new Notice(t("empty")); return; }
          this.result = { text: input.value, settings: engine.normalizeSettings(settings) }; this.close();
        }));
        input.focus();
      }
      onClose() { resolve(this.result || null); this.contentEl.empty(); }
    }
    new ImportModal(ea.plugin.app).open();
  });
  if (!result) return;
  check();
  const trees = parseOutline(result.text);
  await engine.runAction(ea, async session => {
    const origin = view.currentPosition || { x: 0, y: 0 }, stack = [];
    for (let i = trees.length - 1; i >= 0; i--) stack.push({ node: trees[i], root: null, parent: null, level: 1 });
    let count = 0, y = origin.y;
    while (stack.length) {
      const item = stack.pop();
      Object.assign(session.ea.style, { roundness: { type: 3 }, fillStyle: "solid", roughness: 0, fontSize: 20, fontFamily: session.api.getAppState().currentItemFontFamily });
      const id = session.ea.addText(origin.x + (item.level - 1) * 200, y, item.node.text || " ", { box: true, textAlign: "center", textVerticalAlign: "middle" });
      y += 80;
      const root = item.root || id, el = session.ea.getElement(id);
      el.customData = { ...el.customData, mindmap: { status: "open", root, parent: item.parent, level: item.level, ...(item.parent ? {} : { settings: result.settings }) } };
      if (item.parent) session.ea.connectObjects(item.parent, "right", id, "left", { startArrowHead: null });
      for (let i = item.node.children.length - 1; i >= 0; i--) stack.push({ node: item.node.children[i], root, parent: id, level: item.level + 1 });
      if (++count % 128 === 0) { await new Promise(resolve => view.containerEl.ownerDocument.defaultView.setTimeout(resolve, 0)); session.assertCurrent(); }
    }
    await session.layout(session.ea.getElements(), true);
  });
  new Notice(t("done"));
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
