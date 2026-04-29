---
name: 返回上一个链接源
description: 配合链接增强引擎，像浏览器后退一样跳转回点击链接前的位置。
author: ymjr
version: 1.0.0
license: MIT
usage: 当使用链接进行同文件内或跨文件的跳转后，运行此脚本即可像浏览器的“返回/后退”一样，让画板视野重新聚焦到跳转发生前点击的那个元素。
features:
  - 消费由 [Feature-Link-Handler] 记录在全局的跳转历史堆栈 (`ExcalidrawAutomate.plugin._ymjr_linkOrigin`)
  - 触发返回后自动带动画缩放 (zoomToFit) 并选中该原点元素以供视觉提示
dependencies:
  - 必须依赖 [Feature-Link-Handler] 核心引擎进行前置跳转监听
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_api: "请在 Excalidraw 画布中使用此功能",
    notice_no_history: "历史记录已空，没有更早的链接原点啦！"
  },
  en: {
    notice_no_api: "Please use this feature within an Excalidraw view",
    notice_no_history: "History empty, no more link origins to return to!"
  }
};

const api = ea.getExcalidrawAPI();
if (!api) {
    new Notice(t("notice_no_api"));
    return;
}

if (ExcalidrawAutomate.plugin._ymjr_linkOrigin && ExcalidrawAutomate.plugin._ymjr_linkOrigin.length > 0) {
    const linkOrigin = ExcalidrawAutomate.plugin._ymjr_linkOrigin.pop();
    
    if (linkOrigin && linkOrigin.element) {
        api.zoomToFit([linkOrigin.element], linkOrigin.zoom, 0);
    }
} else {
    new Notice(t("notice_no_history"));
}