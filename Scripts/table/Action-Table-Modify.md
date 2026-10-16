---
name: 修改表格行列
description: 在当前逻辑单元格处插入行列，或打开表格属性面板。
author: ymjr
version: 1.1.0
license: MIT
dependencies:
 - Excalidraw-ymjr 2.29.0-4 or later with native table support
usage: 选中表格单元格后运行；先升级宿主并移除旧表格后台引擎。
---
/*
```javascript
*/
var locales = {
  zh: { choose: "选择表格操作", select: "请先选中一个表格单元格", above: "在上方插入行", below: "在下方插入行", left: "在左侧插入列", right: "在右侧插入列", properties: "表格属性" },
  en: { choose: "Choose table action", select: "Select a table cell first", above: "Insert row above", below: "Insert row below", left: "Insert column left", right: "Insert column right", properties: "Table properties" }
};
//ymjr -- All mutation paths use the native table's stable identities and transaction.
const manager = ea.targetView?.tableManager;
if (!manager) throw new Error("Excalidraw-ymjr 2.29.0-4 or later required");
const cell = manager.getCell();
if (!cell) { new Notice(t("select")); return; }
const actions = ["above", "below", "left", "right", "properties"];
const action = await utils.suggester(actions.map(key => t(key)), actions, t("choose"));
if (!action) return;
if (action === "properties") manager.openTools();
else await manager.insert(cell.id, action === "above" || action === "below" ? "row" : "col", action === "below" || action === "right");
