---
name: 触发智能列表配置
description: 唤起悬浮UI工具栏，对选中的元素实时应用列表样式标记。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中元素后运行脚本唤起工具栏。
features:
  - 判断选中元素并唤起 UI 悬浮岛
dependencies:
  - 必须依赖 [Feature-SmartList-Engine] 核心引擎常驻后台提供渲染逻辑
autorun: false
---
/*
```javascript
*/
const locales = {
    zh: {
        notice_select: "⚠️ 请先选中需要添加列表的元素！",
        notice_no_engine: "❌ 引擎未运行！请先启用 [Feature-SmartList-Engine]"
    },
    en: {
        notice_select: "⚠️ Please select elements first!",
        notice_no_engine: "❌ Engine not running! Start [Feature-SmartList-Engine] first."
    }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

if (!ExcalidrawAutomate.plugin._ymjr_smartList || typeof ExcalidrawAutomate.plugin._ymjr_smartList.showUI !== "function") {
    new Notice(t("notice_no_engine"));
    return;
}

ExcalidrawAutomate.plugin._ymjr_smartList.showUI({
    ea: ea,
    api: api,
    plugin: ExcalidrawAutomate.plugin
});