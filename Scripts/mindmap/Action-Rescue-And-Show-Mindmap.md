---
name: 解绑选中并强显全图脑图(深度联动版)
description: 动作脚本：一键清除选中节点的附加数据，并全图深度扫描恢复所有隐形脑图节点、同组元素、绑定元素的可见性。
author: ymjr
version: 1.1.0
license: MIT
usage: 当脑图因异常操作导致部分子节点、文字、同组图标、外框或连线无故“消失”隐形，或者需要重构时运行。
features:
  - 深度联动扫描：自动将脑图节点、其内部文本、同组(Group)的所有图元、绑定的所有线缆和图形全部解除隐藏
  - 清除当前选中元素的所有 `customData` 状态，解除引擎绑定
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_done: "✨ 脑图深度唤醒成功！已显示全图所有隐藏的节点、同组元素和绑定图元，并清空了选中数据。"
  },
  en: {
    notice_done: "Deep rescue completed! All hidden nodes, grouped elements, and bound items are now visible."
  }
};

(async () => {
    const selectedEls = ea.getViewSelectedElements();
    const allEls = ea.getViewElements();
    const elementsMap = new Map(allEls.map(e => [e.id, e]));
    const elementsToEdit = new Set();

    allEls.forEach((el) => {
        if (el.customData && el.customData.mindmap) {
            
            if (el.customData.hide === true) {
                el.customData = { ...el.customData, hide: false };
                elementsToEdit.add(el);
            }
            
            allEls.forEach((subEl) => {
                if (subEl.containerId === el.id) {
                    if (subEl.customData?.hide === true) {
                        subEl.customData = { ...subEl.customData, hide: false };
                        elementsToEdit.add(subEl);
                    }
                }
            });

            if (el.groupIds && el.groupIds.length > 0) {
                allEls.forEach((subEl) => {
                    if (subEl.groupIds && subEl.groupIds.some(gid => el.groupIds.includes(gid))) {
                        if (subEl.customData?.hide === true) {
                            subEl.customData = { ...subEl.customData, hide: false };
                            elementsToEdit.add(subEl);
                        }
                    }
                });
            }

            if (el.boundElements && el.boundElements.length > 0) {
                el.boundElements.forEach((bound) => {
                    const boundEl = elementsMap.get(bound.id);
                    if (boundEl && boundEl.customData?.hide === true) {
                        boundEl.customData = { ...boundEl.customData, hide: false };
                        elementsToEdit.add(boundEl);
                    }
                });
            }
        }
    });

    selectedEls.forEach((el) => {
        delete el.customData;
        elementsToEdit.add(el);
        
        allEls.forEach((textEl) => {
            if (textEl.containerId === el.id) {
                delete textEl.customData;
                elementsToEdit.add(textEl);
            }
        });
    });

    if (elementsToEdit.size > 0) {
        const finalArray = Array.from(elementsToEdit);
        await ea.copyViewElementsToEAforEditing(finalArray);
        await ea.addElementsToView(false, false, true);
    }

    new Notice(t("notice_done"));
})();