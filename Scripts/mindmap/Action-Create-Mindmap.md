---
name: 初始化脑图配置
description: 将选中的连线节点转换为脑图，检测无效结构后再提交。
author: ymjr
version: 1.1.0
license: MIT
usage: 选中节点及连线运行；已是脑图时移除选中分支的脑图属性。使用原生设置弹窗，关闭即取消。
dependencies:
  - Feature-Mindmap-Engine 1.1.0
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: { title: "初始化脑图", theme: "主题", direction: "展开方向", arrow: "连线样式", fixed: "固定连线中点", gap: "节点间距", confirm: "生成", select: "请先选中节点及连线。", engine: "请先更新并运行脑图核心引擎。", invalid: "选区已改变或包含断开的连线，请重新选择。", error: "初始化失败：{message}", done: "脑图已生成。", detached: "选中分支已解除脑图属性。", lr: "向右", rl: "向左", td: "向下", bu: "向上", normal: "平滑曲线", elbow: "折线", curve: "S 型曲线" },
  en: { title: "Initialize mindmap", theme: "Theme", direction: "Direction", arrow: "Connector", fixed: "Fixed center ports", gap: "Node gap", confirm: "Create", select: "Select nodes and connectors first.", engine: "Update and start the mindmap engine first.", invalid: "The selection changed or contains dangling connectors. Select it again.", error: "Initialization failed: {message}", done: "Mindmap created.", detached: "Selected branches detached.", lr: "Right", rl: "Left", td: "Down", bu: "Up", normal: "Smooth", elbow: "Elbow", curve: "S-curve" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { ...locales.zh, title: "初始化腦圖", direction: "展開方向", fixed: "固定連線中點", gap: "節點間距", select: "請先選取節點及連線。", engine: "請先更新並執行腦圖核心引擎。", error: "初始化失敗：{message}", done: "腦圖已生成。", detached: "選取分支已解除腦圖屬性。", normal: "平滑曲線", elbow: "折線", curve: "S 型曲線" };
const { Modal, Setting, Notice } = ea.obsidian;
const view = ea.targetView, api = view?.excalidrawAPI, path = view?.file?.path;
const engine = ExcalidrawAutomate.plugin.app.workspace.containerEl.ownerDocument.defaultView.MindmapAPI;
if (!engine?.runAction) { new Notice(t("engine")); return; }
const ids = ea.getViewSelectedElements().filter(el => !el.containerId).map(el => el.id);
if (!ids.length) { new Notice(t("select")); return; }
const check = () => { if (!view._loaded || view.semaphores?.viewunload || view.file?.path !== path || view.excalidrawAPI !== api) throw new Error(t("invalid")); };
try {
  check();
  if (api.getSceneElements().some(el => ids.includes(el.id) && el.customData?.mindmap)) {
    await engine.detach(ids, ea);
    new Notice(t("detached")); return;
  }
  const config = engine.getConfiguration(), settings = { ...config.defaultSettings };
  const result = await new Promise(resolve => {
    class ConfigModal extends Modal {
      onOpen() {
        this.setTitle(t("title"));
        new Setting(this.contentEl).setName(t("theme")).addDropdown(d => {
          for (const [id, theme] of Object.entries(config.themes)) d.addOption(id, theme?.name || id);
          d.setValue(settings.theme).onChange(value => settings.theme = value);
        });
        new Setting(this.contentEl).setName(t("direction")).addDropdown(d => d.addOptions({ LR: t("lr"), RL: t("rl"), TD: t("td"), BU: t("bu") }).setValue(settings.direction).onChange(value => settings.direction = value));
        new Setting(this.contentEl).setName(t("arrow")).addDropdown(d => d.addOptions({ normal: t("normal"), elbow: t("elbow"), curve: t("curve") }).setValue(settings.arrowType).onChange(value => settings.arrowType = value));
        new Setting(this.contentEl).setName(t("fixed")).addToggle(d => d.setValue(settings.enableFixedPoint).onChange(value => settings.enableFixedPoint = value));
        new Setting(this.contentEl).setName(t("gap")).addText(d => { d.inputEl.type = "number"; d.inputEl.min = "0"; d.setValue(String(settings.defaultGap)).onChange(value => settings.defaultGap = value); });
        new Setting(this.contentEl).addButton(b => b.setButtonText(t("confirm")).setCta().onClick(() => { this.result = engine.normalizeSettings(settings); this.close(); }));
      }
      onClose() { resolve(this.result || null); this.contentEl.empty(); }
    }
    new ConfigModal(ea.plugin.app).open();
  });
  if (!result) return;
  check();
  await engine.runAction(ea, async session => {
    const all = session.api.getSceneElements(), map = new Map(all.map(el => [el.id, el]));
    const selected = ids.map(id => map.get(id));
    if (selected.some(el => !el || el.isDeleted || el.customData?.mindmap)) throw new Error(t("invalid"));
    const forest = engine.buildForest(selected, true);
    if (!forest.nodes.size) throw new Error(t("select"));
    for (const el of selected) if (["arrow", "line"].includes(el.type) && (!forest.nodes.has(el.startBinding?.elementId) || !forest.nodes.has(el.endBinding?.elementId))) throw new Error(t("invalid"));
    const related = engine.related(engine.indexScene(all), [...forest.nodes.values()].map(n => n.el));
    session.ea.copyViewElementsToEAforEditing([...selected, ...related]);
    for (const root of forest.roots) {
      const stack = [{ node: root, parent: null, level: 1 }];
      while (stack.length) {
        const { node, parent, level } = stack.pop(), copy = session.ea.getElement(node.el.id);
        copy.customData = { ...copy.customData, mindmap: { root: root.el.id, parent, level, status: "open", ...(parent ? {} : { settings: result }) } };
        for (const child of node.children) stack.push({ node: child, parent: node.el.id, level: level + 1 });
      }
    }
    await session.layout(session.ea.getElements(), true);
  });
  new Notice(t("done"));
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
