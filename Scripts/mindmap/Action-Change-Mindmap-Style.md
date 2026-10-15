---
name: 修改脑图样式
description: 使用原生设置弹窗修改当前脑图或全局主题与布局。
author: ymjr
version: 1.1.0
license: MIT
usage: 选中脑图节点修改整棵树；不选节点则编辑全局默认值。支持创建、重命名、删除主题以及各层级文字、边框和字号。
dependencies:
  - Feature-Mindmap-Engine 1.1.0
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: { title: "脑图样式", global: "脑图全局默认设置", theme: "主题", direction: "展开方向", arrow: "连线样式", fixed: "固定连线中点", gap: "节点间距", length: "连线长度", curveLength: "曲线长度", save: "保存全局配置", apply: "应用并重排", create: "新建主题", rename: "重命名", remove: "删除主题", cancel: "取消", confirm: "确认删除", remove_question: "确认删除主题：{name}？", keep: "至少保留一个主题。", name: "主题名称", root: "根节点背景", colors: "分支配色", add: "添加颜色", pop: "移除最后一种颜色", level: "层级 {level}", text: "文字颜色", stroke: "边框颜色", width: "边框粗细", font: "字号", done: "脑图样式已更新。", engine: "请先更新并运行脑图核心引擎。", stale: "画布或目标节点已改变，请重新运行。", error: "保存失败：{message}", lr: "向右", rl: "向左", td: "向下", bu: "向上", normal: "平滑曲线", elbow: "折线", curve: "S 型曲线" },
  en: { title: "Mindmap style", global: "Mindmap defaults", theme: "Theme", direction: "Direction", arrow: "Connector", fixed: "Fixed center ports", gap: "Node gap", length: "Connector length", curveLength: "Curve length", save: "Save defaults", apply: "Apply and re-layout", create: "New theme", rename: "Rename", remove: "Delete theme", cancel: "Cancel", confirm: "Confirm deletion", remove_question: "Delete theme: {name}?", keep: "Keep at least one theme.", name: "Theme name", root: "Root background", colors: "Branch colors", add: "Add color", pop: "Remove last color", level: "Level {level}", text: "Text color", stroke: "Border color", width: "Border width", font: "Font size", done: "Mindmap style updated.", engine: "Update and start the mindmap engine first.", stale: "The drawing or target node changed. Run the script again.", error: "Save failed: {message}", lr: "Right", rl: "Left", td: "Down", bu: "Up", normal: "Smooth", elbow: "Elbow", curve: "S-curve" }
};
locales["zh-cn"] = locales.zh;
locales["zh-tw"] = { ...locales.zh, title: "腦圖樣式", global: "腦圖全域預設值", direction: "展開方向", arrow: "連線樣式", fixed: "固定連線中點", gap: "節點間距", length: "連線長度", curveLength: "曲線長度", save: "儲存全域設定", apply: "套用並重新排版", create: "新增主題", rename: "重新命名", remove: "刪除主題", confirm: "確認刪除", remove_question: "確認刪除主題：{name}？", keep: "至少保留一個主題。", name: "主題名稱", root: "根節點背景", colors: "分支配色", pop: "移除最後一種顏色", level: "層級 {level}", text: "文字顏色", stroke: "邊框顏色", width: "邊框粗細", done: "腦圖樣式已更新。", engine: "請先更新並執行腦圖核心引擎。", stale: "畫布或目標節點已改變，請重新執行。", error: "儲存失敗：{message}", normal: "平滑曲線", elbow: "折線", curve: "S 型曲線" };
const { Modal, Setting, Notice } = ea.obsidian;
const plugin = ea.plugin, view = ea.targetView, api = view?.excalidrawAPI, filePath = view?.file?.path;
const engine = plugin.app.workspace.containerEl.ownerDocument.defaultView.MindmapAPI;
if (!engine?.runAction) { new Notice(t("engine")); return; }
const selected = ea.getViewSelectedElements().find(el => el.customData?.mindmap), rootId = selected?.customData.mindmap.root;
const root = api?.getSceneElements().find(el => el.id === rootId);
const globalMode = !root;
const config = JSON.parse(JSON.stringify(engine.getConfiguration()));
let settings = engine.normalizeSettings(globalMode ? config.defaultSettings : root.customData.mindmap.settings);
let themeKey = config.themes[settings.theme] ? settings.theme : Object.keys(config.themes)[0];
settings.theme = themeKey;
let closed = false, busy = false;
const check = () => {
  if (closed || !ea.plugin || plugin.app.workspace.containerEl.ownerDocument.defaultView.MindmapAPI !== engine) throw new Error(t("stale"));
  if (!globalMode && (!view._loaded || view.semaphores?.viewunload || view.file?.path !== filePath || view.excalidrawAPI !== api)) throw new Error(t("stale"));
};
function textPrompt(initial) {
  return new Promise(resolve => {
    class NameModal extends Modal {
      onOpen() {
        this.setTitle(t("name"));
        let input;
        new Setting(this.contentEl).setName(t("name")).addText(c => { input = c.inputEl; c.setValue(initial); });
        new Setting(this.contentEl).addButton(b => b.setButtonText(t("rename")).setCta().onClick(() => { if (input.value.trim()) { this.result = input.value.trim(); this.close(); } }));
        input.focus();
      }
      onClose() { resolve(this.result ?? null); this.contentEl.empty(); }
    }
    new NameModal(plugin.app).open();
  });
}
function confirmDelete(name) {
  return new Promise(resolve => {
    class DeleteModal extends Modal {
      onOpen() {
        this.setTitle(t("remove_question", { name }));
        new Setting(this.contentEl).addButton(b => b.setButtonText(t("cancel")).onClick(() => this.close())).addButton(b => b.setButtonText(t("confirm")).setWarning().onClick(() => { this.result = true; this.close(); }));
      }
      onClose() { resolve(this.result === true); this.contentEl.empty(); }
    }
    new DeleteModal(plugin.app).open();
  });
}
try {
  await new Promise(resolve => {
    class StyleModal extends Modal {
      onOpen() { this.setTitle(t(globalMode ? "global" : "title")); this.render(); }
      render() {
        this.contentEl.empty();
        const number = (label, target, key, min, max) => new Setting(this.contentEl).setName(label).addText(c => {
          c.inputEl.type = "number"; c.inputEl.min = String(min); c.inputEl.max = String(max);
          c.setValue(String(target[key])).onChange(value => { const n = Number(value); if (value.trim() && Number.isFinite(n)) target[key] = Math.max(min, Math.min(max, n)); });
        });
        new Setting(this.contentEl).setName(t("direction")).addDropdown(d => d.addOptions({ LR: t("lr"), RL: t("rl"), TD: t("td"), BU: t("bu") }).setValue(settings.direction).onChange(value => settings.direction = value));
        new Setting(this.contentEl).setName(t("arrow")).addDropdown(d => d.addOptions({ normal: t("normal"), elbow: t("elbow"), curve: t("curve") }).setValue(settings.arrowType).onChange(value => settings.arrowType = value));
        new Setting(this.contentEl).setName(t("fixed")).addToggle(c => c.setValue(settings.enableFixedPoint).onChange(value => settings.enableFixedPoint = value));
        number(t("gap"), settings, "defaultGap", 0, 10000); number(t("length"), settings, "lengthBetweenElAndLine", 0, 10000); number(t("curveLength"), settings, "curveLength", 0, 10000);
        new Setting(this.contentEl).setName(t("theme")).addDropdown(d => {
          for (const [key, theme] of Object.entries(config.themes)) d.addOption(key, theme?.name || key);
          d.setValue(themeKey).onChange(value => { themeKey = value; settings.theme = value; this.render(); });
        });
        if (globalMode) {
          new Setting(this.contentEl).addButton(b => b.setButtonText(t("create")).onClick(() => {
            const key = "theme_" + Date.now(); config.themes[key] = JSON.parse(JSON.stringify(config.themes[themeKey] || config.themes.rainbow));
            config.themes[key].name = t("create"); themeKey = key; settings.theme = key; this.render();
          })).addButton(b => b.setButtonText(t("rename")).onClick(async () => {
            const key = themeKey;
            try { const name = await textPrompt(config.themes[key].name); check(); if (name && config.themes[key]) { config.themes[key].name = name; this.render(); } } catch (error) { new Notice(t("error", { message: error.message })); }
          })).addButton(b => b.setButtonText(t("remove")).onClick(async () => {
            const key = themeKey;
            try {
              if (Object.keys(config.themes).length < 2) { new Notice(t("keep")); return; }
              const confirmed = await confirmDelete(config.themes[key].name); check();
              if (confirmed && config.themes[key]) { delete config.themes[key]; themeKey = Object.keys(config.themes)[0]; settings.theme = themeKey; this.render(); }
            } catch (error) { new Notice(t("error", { message: error.message })); }
          }));
          const base = config.themes[Object.keys(config.themes)[0]];
          const theme = config.themes[themeKey] = { ...base, ...config.themes[themeKey] };
          if (!Array.isArray(theme.colors) || !theme.colors.length) theme.colors = [...base.colors];
          if (!Array.isArray(theme.levels) || !theme.levels.length) theme.levels = JSON.parse(JSON.stringify(base.levels));
          const color = (label, value, setter) => new Setting(this.contentEl).setName(label).addColorPicker(c => c.setValue(/^#[\da-f]{6}$/i.test(value) ? value : value === "black" ? "#000000" : "#ffffff").onChange(setter));
          color(t("root"), theme.rootBg, value => theme.rootBg = value);
          theme.colors.forEach((value, index) => color(`${t("colors")} ${index + 1}`, value, next => theme.colors[index] = next));
          new Setting(this.contentEl).addButton(b => b.setButtonText(t("add")).onClick(() => { theme.colors.push("#cccccc"); this.render(); })).addButton(b => b.setButtonText(t("pop")).onClick(() => { if (theme.colors.length > 1) { theme.colors.pop(); this.render(); } }));
          theme.levels.forEach((value, index) => {
            const level = theme.levels[index] = { ...base.levels[Math.min(index, base.levels.length - 1)], ...value };
            this.contentEl.createEl("h4", { text: t("level", { level: index + 1 }) });
            color(t("text"), level.textColor, next => level.textColor = next); color(t("stroke"), level.strokeColor, next => level.strokeColor = next);
            number(t("width"), level, "strokeWidth", .1, 20); number(t("font"), level, "fontSize", 8, 200);
          });
        }
        new Setting(this.contentEl).addButton(b => b.setButtonText(t(globalMode ? "save" : "apply")).setCta().onClick(async () => {
          if (busy) return;
          busy = true; b.setDisabled(true);
          try {
            check(); settings = engine.normalizeSettings(settings);
            if (settings.theme === "custom") settings.customTheme = JSON.parse(JSON.stringify(config.themes.custom));
            if (globalMode) {
              config.defaultSettings = settings;
              const store = plugin.settings.scriptEngineSettings.Mindmap_Engine || {};
              store["Mindmap Configuration"] = { value: JSON.stringify(config), description: t("global") };
              plugin.settings.scriptEngineSettings.Mindmap_Engine = store;
              await plugin.saveSettings();
            } else {
              await engine.runAction(ea, async session => {
                const live = session.api.getSceneElements().find(el => el.id === rootId && el.customData?.mindmap?.root === rootId);
                if (!live) throw new Error(t("stale"));
                const elements = engine.treeElements(session.api.getSceneElements(), rootId);
                session.ea.copyViewElementsToEAforEditing(elements);
                session.ea.getElement(rootId).customData.mindmap.settings = settings;
                await session.layout(elements, true);
              });
            }
            new Notice(t("done")); this.close();
          } catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
          finally { busy = false; b.setDisabled(false); }
        }));
      }
      onClose() { closed = true; this.contentEl.empty(); resolve(); }
    }
    new StyleModal(plugin.app).open();
  });
} catch (error) { console.error(error); new Notice(t("error", { message: error.message })); }
