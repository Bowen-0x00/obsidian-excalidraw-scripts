---
name: 缩放隐藏核心引擎
description: 后台引擎：监听画布缩放事件，当缩放比例超出元素配置的可见区间时，自动隐藏元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，专门针对携带 `customData.zoomHide` 的元素提供动态显示/隐藏的管理逻辑。
features:
  - 拦截 `updateScene` 和 `handleWheelZoom` 等缩放事件
  - 动态计算元素是否在给定的可见视口缩放百分比中，若是则自动抹去/恢复显示 (`el.customData.hide`)
dependencies:
  - 配合 Action-Toggle-ZoomHide 使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_fail: "[EA_Core] 未运行，{id} 挂载失败",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_fail: "[EA_Core] not running, {id} mount failed",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.zoomhide-engine";


changeElementsVisiable = function (elements, visiable) {
    elements.forEach((el) => {
        el.customData = el.customData || {};
        if (visiable) {
            el.customData.hide = false;
        } else {
            el.customData.hide = true;
        }
    });
};

const handleZoomChange = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    let zoom;
    if (context.zoom !== undefined) {
        zoom = context.zoom;
    } else if (context.sceneData?.appState?.zoom?.value !== undefined) {
        zoom = context.sceneData.appState.zoom.value;
    } else {
        return false;
    }

    if (!api) return false;

    const elements = api.getSceneElements();
    // 筛选出配置了范围数组的元素
    const zoomHideElements = elements.filter(el => el?.customData?.zoomHide && Array.isArray(el.customData.zoomHide));

    if (zoomHideElements.length > 0) {
        const changedEls = [];

        zoomHideElements.forEach((el) => {
            const [minZoom, maxZoom] = el.customData.zoomHide;
            
            // 判断当前缩放比例是否在可见区间内
            const shouldBeVisible = (zoom >= minZoom && zoom <= maxZoom);
            const isCurrentlyHidden = el.customData?.hide === true;

            // 只有当状态需要翻转时才操作，避免死循环
            if (shouldBeVisible && isCurrentlyHidden) {
                changeElementsVisiable([el], true);
                changedEls.push(el);
            } else if (!shouldBeVisible && !isCurrentlyHidden) {
                changeElementsVisiable([el], false);
                changedEls.push(el);
            }
        });

        if (changedEls.length > 0) {
            ea.copyViewElementsToEAforEditing(changedEls);
            ea.addElementsToView(false, false, false);
        }
    }

    return false; 
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_fail", { id: SCRIPT_ID }));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    window.EA_Core.registerHook(SCRIPT_ID, 'updateScene', handleZoomChange, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'handleWheelZoom', handleZoomChange, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}



mountFeature();