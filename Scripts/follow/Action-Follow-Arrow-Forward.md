---
name: 顺向跟随箭头
description: 动作脚本：沿箭头轨迹平滑移动视角至目标元素，并记录历史位置以供返回。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中一个箭头或箭头起始端的元素，运行此脚本，视角将沿着箭头轨迹动画顺向滑动到终点元素。
features:
  - 动态计算缩放比例和平移步长，实现平滑的电影级运镜效果
  - 自动将当前视图状态推入 `ExcalidrawAutomate.plugin._ymjr_linkOrigin` 栈，支持后续快速回退
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    log_start: "[{id}] 🚀 启动顺向跟随..."
  },
  en: {
    log_start: "[{id}] 🚀 Starting forward follow..."
  }
};
const SCRIPT_ID = "ymjr.action.follow-arrow-forward";
console.log(t("log_start", { id: SCRIPT_ID }));

const api = ea.getExcalidrawAPI();
if (!api) return;

const selectedEl = ea.getViewSelectedElement();
if (!selectedEl) return;

const state = api.getAppState();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. 同步历史记录栈并彻底避免 window 污染
// ==========================================
const plugin = ExcalidrawAutomate.plugin || {};
ExcalidrawAutomate.plugin = plugin;

plugin._ymjr_linkOrigin = plugin._ymjr_linkOrigin || [];
plugin._ymjr_linkOrigin.push({ element: selectedEl, zoom: state.zoom.value });

// ==========================================
// 2. 动画核心：使用 ExcalidrawAutomate.plugin._ymjr_isAnimating 作为防抖锁
// ==========================================
const STEPCOUNT = 50;
const FRAME_SLEEP = 5;

const scrollToNextRect = async ({ left, top, nextZoom }, steps = STEPCOUNT) => {
    if (plugin._ymjr_isAnimating) return;
    plugin._ymjr_isAnimating = true;

    try {
        api.updateScene({ appState: { shouldCacheIgnoreZoom: true } });
        const { scrollX, scrollY, zoom } = api.getAppState();
        
        const zoomStep = (zoom.value - nextZoom) / steps;
        const xStep = (left + scrollX) / steps;
        const yStep = (top + scrollY) / steps;

        for (let i = 1; i <= steps; i++) {
            api.updateScene({
                appState: {
                    scrollX: scrollX - (xStep * i),
                    scrollY: scrollY - (yStep * i),
                    zoom: { value: zoom.value - zoomStep * i },
                }
            });
            await sleep(FRAME_SLEEP);
        }
    } finally {
        api.updateScene({ appState: { shouldCacheIgnoreZoom: false } });
        plugin._ymjr_isAnimating = false;
    }
};

// ==========================================
// 3. 元素定位
// ==========================================
const elements = api.getSceneElements();
const arrowElement = selectedEl.type === "arrow" 
    ? selectedEl 
    : elements.find((el) => el.type === "arrow" && el.startBinding?.elementId === selectedEl.id);

if (!arrowElement) return;

const targetElement = elements.find((el) => el.id === arrowElement.endBinding?.elementId);
const box = targetElement ? ea.getBoundingBox([targetElement]) : null;

// ==========================================
// 4. 沿箭头轨迹滑动
// ==========================================
const zoomedScreenWidth = state.width / state.zoom.value;
const zoomedScreenHeight = state.height / state.zoom.value;

for (let i = 1; i < arrowElement.points.length; i++) {
    const point = arrowElement.points[i];
    const left = arrowElement.x + point[0] - zoomedScreenWidth / 2;
    const top = arrowElement.y + point[1] - zoomedScreenHeight / 2;
    await scrollToNextRect({ left, top, nextZoom: state.zoom.value }, 50);
}

// ==========================================
// 5. 聚焦到目标元素
// ==========================================
if (!box) return;

const centerX = box.topX + box.width / 2;
const centerY = box.topY + box.height / 2;

const STEP = 10;
const originZoom = state.zoom.value;
const targetZoom = state.width * 0.5 / box.width;
const deltaZoom = (targetZoom - originZoom) / STEP;

const originLeft = centerX - state.width / originZoom / 2;
const originTop = centerY - state.height / originZoom / 2;

await scrollToNextRect({ left: originLeft, top: originTop, nextZoom: originZoom }, 20);

for (let i = 1; i <= STEP; i++) {
    const newZoom = originZoom + deltaZoom * i;
    const left = centerX - state.width / newZoom / 2;
    const top = centerY - state.height / newZoom / 2;
    await scrollToNextRect({ left, top, nextZoom: newZoom }, 10);
}