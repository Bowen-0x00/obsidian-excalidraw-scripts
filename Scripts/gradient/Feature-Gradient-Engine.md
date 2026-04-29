---
name: 渐变色渲染核心引擎
description: 后台引擎：提供对图形与文本元素的渐变色渲染支持（包含 Canvas 实时渲染与 SVG 导出支持）。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为前置依赖运行，支持在图形与文本元素的 customData 中解析 gradient 数据，并将其渲染为渐变色。
features:
  - 拦截 Canvas 渲染，使用 Proxy 无污染解析用户的渐变配置
  - 支持图形和文本的 Canvas 实时渐变渲染
  - 拦截 SVG 导出，在 SVG root 中自动生成 defs 并替换 fill url，实现 SVG 离线完美导出
dependencies:
  - 供 Action-Gradient-UI 等生成渐变配置数据的脚本作为底层的渲染引擎配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_parse_failed: "[{id}] 解析失败:",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_parse_failed: "[{id}] Parse failed:",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.gradient-engine";

// 核心工具函数：利用 Proxy 拦截并解析用户的渐变脚本（无全局污染）
const extractGradient = (el, scriptStr) => {
    const dummyCanvas = document.createElement("canvas");
    const ctx = dummyCanvas.getContext("2d");
    let gradType = '';
    let gradArgs = [];
    let stops = [];

    const mockGradient = {
        addColorStop: (offset, color) => {
            dummyCanvas.getContext("2d").fillStyle = color; // 利用 dummy 格式化颜色
            stops.push({ offset, color: dummyCanvas.getContext("2d").fillStyle });
            return mockGradient;
        }
    };

    // 拦截 Canvas 上下文的创建方法
    const handler = {
        get: function(target, prop) {
            if (prop === 'createLinearGradient') {
                return (...args) => { gradType = 'linearGradient'; gradArgs = args; return mockGradient; };
            }
            if (prop === 'createRadialGradient') {
                return (...args) => { gradType = 'radialGradient'; gradArgs = args; return mockGradient; };
            }
            if (prop === 'createConicGradient') {
                return (...args) => { gradType = 'conicGradient'; gradArgs = args; return mockGradient; };
            }
            return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
        }
    };

    const proxyCtx = new Proxy(ctx, handler);

    try {
        // 沙盒执行用户脚本
        const runFn = new Function('ctx', 'el', `${scriptStr};\n return gradient;`);
        runFn(proxyCtx, el);
        
        // 生成真实用于 Canvas 渲染的渐变对象
        let realGrad;
        if (gradType === 'linearGradient') realGrad = ctx.createLinearGradient(...gradArgs);
        else if (gradType === 'radialGradient') realGrad = ctx.createRadialGradient(...gradArgs);
        else return null;

        stops.forEach(s => realGrad.addColorStop(s.offset, s.color));

        return { realGrad, gradType, gradArgs, stops };
    } catch (err) {
        console.error(t("log_parse_failed", { id: SCRIPT_ID }), err);
        return null;
    }
};

// 1. 拦截图形 Canvas 渲染参数 (应用到 Rough.js)
const handleRoughOptions = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { element, options } = contextPayload;
    if (!element.customData?.gradient) return false;

    const parsed = extractGradient(element, element.customData.gradient);
    if (parsed && parsed.realGrad) {
        options.fill = parsed.realGrad;
        options.fillStyle = "solid"; // 强制转换为 solid 确保 Rough.js 使用渐变色填充整块区域
    }
    return false;
};

// 2. 拦截 SVG 导出 (事后注入法，极简且无侵入)
const handleSvgRender = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { root, svgRoot, element } = contextPayload;
    if (!element.customData?.gradient) return false;

    const parsed = extractGradient(element, element.customData.gradient);
    if (!parsed) return false;

    const SVG_NS = "[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)";
    let defs = svgRoot.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svgRoot.prepend(defs);
    }

    // 创建 SVG 渐变定义
    const gradId = `ea-grad-${element.id}`;
    if (!svgRoot.querySelector(`#${gradId}`)) {
        const svgGradient = document.createElementNS(SVG_NS, parsed.gradType);
        svgGradient.id = gradId;
        svgGradient.setAttribute("gradientUnits", "userSpaceOnUse");

        if (parsed.gradArgs.length === 4) { // Linear
            svgGradient.setAttribute('x1', parsed.gradArgs[0]);
            svgGradient.setAttribute('y1', parsed.gradArgs[1]);
            svgGradient.setAttribute('x2', parsed.gradArgs[2]);
            svgGradient.setAttribute('y2', parsed.gradArgs[3]);
        } else if (parsed.gradArgs.length === 6) { // Radial
            svgGradient.setAttribute('cx', parsed.gradArgs[3]);
            svgGradient.setAttribute('cy', parsed.gradArgs[4]);
            svgGradient.setAttribute('fr', parsed.gradArgs[2]);
            svgGradient.setAttribute('fx', parsed.gradArgs[0]);
            svgGradient.setAttribute('fy', parsed.gradArgs[1]);
        }

        parsed.stops.forEach(s => {
            const stop = document.createElementNS(SVG_NS, 'stop');
            stop.setAttribute('offset', s.offset);
            stop.setAttribute('stop-color', s.color);
            svgGradient.appendChild(stop);
        });
        defs.appendChild(svgGradient);
    }

    // 寻找刚刚在 root 中生成的 <path> 或 <text> 节点，替换其填充色
    const targetNode = root.lastChild;
    if (targetNode) {
        const elementsToModify = targetNode.nodeName === 'path' || targetNode.nodeName === 'text' 
            ? [targetNode] 
            : Array.from(targetNode.querySelectorAll('path, text'));

        elementsToModify.forEach(node => {
            const currentFill = node.getAttribute('fill');
            // 只替换原本有颜色填充的部位（排除透明或只是线框的轮廓部位）
            if (currentFill && currentFill !== 'none') {
                node.setAttribute('fill', `url(#${gradId})`);
            }
        });
    }

    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(`[${SCRIPT_ID}] EA_Core 未运行`);
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'generateRoughOptions', handleRoughOptions, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'renderElementToSvg', handleSvgRender, 60);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();