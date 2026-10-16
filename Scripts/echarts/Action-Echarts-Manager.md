---
name: Echarts 图表生成面板
description: 动作脚本：唤起 Echarts 图表可视化编辑器，基于选中的文字生成图表、原地编辑现有图表或插入新图表。
author: ymjr
version: 1.1.0
license: MIT
usage: 选中包含逗号/制表符分隔数据的文本元素，或选中已有的 Echarts 图表容器，运行此脚本即可唤起带实时预览的高级配置面板进行图表生成与修改。
features:
  - 提供数据表格双向绑定的交互式面板与实时交互预览
  - 支持快捷切换柱状图、条形图、折线图、面积图、饼图、环形图、散点图
  - 支持快捷主题色与推荐配色一键应用
  - 选中已有图表时支持原地无损读取与更新
  - 支持自定义 Echarts JSON 配置项
dependencies:
  - 必须配合 Feature-Echarts-Engine 引擎使用
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_engine: "❌ 请先确保 [Echarts 核心引擎] 脚本处于 Autorun 并在运行中！",
    notice_success: "✨ Echarts 图表已生成！",
    log_parse_failed: "解析现有 JSON 配置失败，尝试降级..."
  },
  en: {
    notice_no_engine: "❌ Please ensure the [Echarts Engine] script is Autorun and running!",
    notice_success: "✨ Echarts chart generated!",
    log_parse_failed: "Failed to parse existing JSON config, attempting fallback..."
  }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();
const EchartsCore = ExcalidrawAutomate.plugin._ymjr_echarts;

if (!EchartsCore || !EchartsCore.EchartsEditorModal) {
    new Notice(t("notice_no_engine"));
    return;
}

const applyDataToCanvas = async (result, existingEls = [], textBoundingBox = null) => {
    const finalOptions = EchartsCore.generateEchartsOptions(result);
    
    // 清空 EA 的单例缓存，防止残留
    ea.clear(); 

    if (existingEls.length > 0) {
        existingEls.forEach(el => {
            el.customData = el.customData || {};
            el.customData.echarts = { 
                type: result.type, 
                value: finalOptions,
                rawData: result 
            };
        });
        ea.copyViewElementsToEAforEditing(existingEls);
        await ea.addElementsToView(false, false, false);
    } else {
        ea.style.backgroundColor = "transparent";
        ea.style.strokeColor = "transparent"; 
        
        let cx, cy;
        if (textBoundingBox) {
            cx = textBoundingBox.topX + textBoundingBox.width / 2;
            cy = textBoundingBox.topY + textBoundingBox.height / 2;
        } else {
            const viewState = api.getAppState();
            cx = -viewState.scrollX + (viewState.width / 2 / viewState.zoom.value);
            cy = -viewState.scrollY + (viewState.height / 2 / viewState.zoom.value);
        }
        
        const w = 520;
        const h = 360;
        const id = ea.addRect(cx - w / 2, cy - h / 2, w, h);
        const el = ea.getElement(id);
        el.customData = { 
            ...el.customData, 
            echarts: { 
                type: result.type, 
                value: finalOptions,
                rawData: result 
            } 
        };
        ea.copyViewElementsToEAforEditing([el]);
        await ea.addElementsToView(true, false, false);
    }
    
    new Notice(t("notice_success"));
};

// ==========================================
// 场景判断与数据提取
// ==========================================
const echartsEls = selectedEls.filter(el => el.customData && el.customData.echarts);
const textEls = selectedEls.filter(el => el.type === "text");

if (echartsEls.length > 0) {
    // 选中了已有图表：直接使用通用原地编辑逻辑
    EchartsCore.openEditorForElement(echartsEls[0], ea.targetView);
    return;
}

let initialData = { 
    type: 'bar', 
    chartTitle: '',
    labels: ['类目A', '类目B', '类目C', '类目D'], 
    values: [120, 200, 150, 80],
    colors: [undefined, undefined, undefined, undefined],
    themeColor: '#5470c6',
    showLabel: false,
    showLegend: true,
    smoothLine: true,
    symbolType: 'emptyCircle'
};

let textBoundingBox = null;

if (textEls.length > 0) {
    // 计算选中文本元素的包围盒，用于图表放置位置
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    textEls.forEach(el => {
        if (el.x < minX) minX = el.x;
        if (el.x + el.width > maxX) maxX = el.x + el.width;
        if (el.y < minY) minY = el.y;
        if (el.y + el.height > maxY) maxY = el.y + el.height;
    });
    if (minX !== Infinity) {
        textBoundingBox = { topX: minX, topY: minY, width: maxX - minX, height: maxY - minY };
    }

    const combinedText = textEls.map(e => e.text).join('\n');
    const parsed = EchartsCore.parseTextToData(combinedText);
    if (parsed) {
        initialData.labels = parsed.labels;
        initialData.values = parsed.values;
        initialData.colors = parsed.labels.map(() => undefined);
    }
    ea.deleteViewElements(textEls); 
}

new EchartsCore.EchartsEditorModal(app, initialData, (result) => {
    applyDataToCanvas(result, [], textBoundingBox);
}).open();
