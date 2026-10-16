---
name: 创建表格
description: 打开原生表格创建面板；支持自动行高、固定行高省略和图片内容。
author: ymjr
version: 1.1.0
license: MIT
autorun: false
dependencies:
 - Excalidraw-ymjr 2.29.0-4 or later with native table support
usage: 先升级宿主并移除旧 Feature-Table-Engine / Feature-Table-Paste-MD，再运行此动作创建表格。
---
/*
```javascript
*/
//ymjr -- Layout, history and UI are owned by the target view, not a global script.
if (!ea.targetView?.tableManager) throw new Error("请升级至 Excalidraw-ymjr 2.29.0-4 或更高版本 / Excalidraw-ymjr 2.29.0-4 or later required");
ea.targetView.tableManager.openTools(true);
