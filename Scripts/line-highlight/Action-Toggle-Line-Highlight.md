---
name: 切换连线高亮状态
description: 将选中的连线或箭头标记为高亮状态（再次运行可取消）。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的连线、箭头，或者任何绑定了箭头的图形节点，运行此脚本。选中的连线将被赋予高亮发光效果。再次运行即可取消高亮状态。
features:
  - 智能识别并遍历选中元素上绑定的所有连线
  - 自动向元素注入或移除 customData.highlightLine 标识
dependencies:
  - 必须依赖 [Feature-Highlight-Line] 核心引擎常驻后台进行发光特效渲染
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选中需要高亮的连线或元素！",
    notice_cancelled: "⭕ 已取消高亮标记",
    notice_added: "✨ 已添加高亮标记"
  },
  en: {
    notice_select: "Please select lines or elements to highlight first!",
    notice_cancelled: "⭕ Highlight removed",
    notice_added: "✨ Highlight added"
  }
};
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

// 检查是否已经处于高亮状态
const isAlreadyHighlighted = selectedEls[0]?.customData?.highlightLine;

selectedEls.forEach((el) => {
    if (isAlreadyHighlighted) {
        delete el.customData.highlightLine;
    } else {
        el.customData = {
            ...el.customData,
            highlightLine: true
        };
    }
});

ea.copyViewElementsToEAforEditing(selectedEls);
await ea.addElementsToView();

// ea.tools.measure(selectedEls); // TODO
new Notice(isAlreadyHighlighted ? t("notice_cancelled") : t("notice_added"));