---
name: 清空元素的 customData
description: 动作脚本：一键清除选中元素的所有附加数据。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中表现异常的元素，运行此脚本将强制删除其底层携带的所有 `customData`（如各种插件注入的业务状态和标签）。常用于开发调试或解除引擎绑定的图元状态。
features:
  - 遍历删除选定元素的 `customData` 对象
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_done: "已清理选中元素的 customData"
  },
  en: {
    notice_done: "clear customData mindmap done"
  }
};
const selectedEls = ea.getViewSelectedElements();


selectedEls.forEach((el) => {
  delete el.customData
})


ea.copyViewElementsToEAforEditing(selectedEls);
ea.addElementsToView();
new Notice(t("notice_done"));
