---
name: 切换GIF动画标记
description: 将选中的图片或元素标记为可控制的 GIF 动画帧（再次运行可取消）。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的图片或元素，运行此脚本。选中的元素将被注入 customData.gif 标识，从而被 GIF 引擎接管。再次运行即可取消标记。
features:
  - 自动向元素注入或移除 customData.gif 标识
  - 自动清除元素的图片缓存以便引擎接管
dependencies:
  - 必须依赖 [Feature-GIF-Engine] 核心引擎常驻后台提供键盘步进与悬浮 UI 控制
autorun: false
---
/*
```javascript
*/
var locales = {
    zh: {
        notice_select: "请先选中需要标记的元素！",
        notice_cancelled: "⭕ 已取消 GIF 动画标记",
        notice_added: "✨ 已添加 GIF 动画标记"
    },
    en: {
        notice_select: "Please select elements to mark first!",
        notice_cancelled: "⭕ GIF marker removed",
        notice_added: "✨ GIF marker added"
    }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

// 检查是否已经处于标记状态
const isAlreadyMarked = selectedEls[0]?.customData?.gif;

selectedEls.forEach((el) => {
    if (isAlreadyMarked) {
        delete el.customData.gif;
    } else {
        el.customData = {
            ...el.customData,
            gif: {
                index: 0,
                frameCount: el.customData?.gif?.frameCount || 0 // 保留可能已有的 frameCount，默认 0
            }
        };
        // 强制清除图片缓存
        if (api.App?.imageCache && el.fileId) {
            api.App.imageCache.delete(el.fileId);
        }
    }
});

ea.copyViewElementsToEAforEditing(selectedEls);
await ea.addElementsToView(false, false, false);

new Notice(isAlreadyMarked ? t("notice_cancelled") : t("notice_added"));