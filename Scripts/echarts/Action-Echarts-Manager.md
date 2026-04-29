---
name: Echarts 图表生成面板
description: 动作脚本：唤起 Echarts 图表编辑器，基于选中的文字生成图表或编辑现有图表。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中包含逗号/制表符分隔数据的文本元素，或选中已有的 Echarts 图表容器，运行此脚本即可唤起高级配置面板进行图表生成与修改。
features:
  - 提供数据表格双向绑定的交互式面板
  - 支持快捷切换柱状图、折线图、饼图、散点图
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
    notice_no_engine: "❌ 请先确保 [Echarts 引擎] 脚本处于 Autorun 并在运行中！",
    log_parse_failed: "解析现有 JSON 配置失败，尝试降级..."
  },
  en: {
    notice_no_engine: "❌ Please ensure the [Echarts Engine] script is Autorun and running!",
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

// ==========================================
// 辅助函数：将编辑器数据应用到画板
// ==========================================
const applyDataToCanvas = async (result, existingEls = []) => {
    const finalOptions = EchartsCore.generateEchartsOptions(result);
    
    // 【Bug 修复】必须先清空 EA 的单例缓存，否则会导致多个图表互相覆盖！
    ea.clear(); 

    if (existingEls.length > 0) {
        existingEls.forEach(el => {
            el.customData = el.customData || {};
            el.customData.echarts = { type: result.type, value: finalOptions };
        });
        ea.copyViewElementsToEAforEditing(existingEls);
    } else {
        ea.style.backgroundColor = "transparent";
        ea.style.strokeColor = "transparent"; 
        
        const viewState = api.getAppState();
        const cx = viewState.scrollX + (viewState.width / 2 / viewState.zoom.value);
        const cy = viewState.scrollY + (viewState.height / 2 / viewState.zoom.value);
        
        const id = ea.addRect(cx - 250, cy - 175, 500, 350);
        const el = ea.getElement(id);
        el.customData = { ...el.customData, echarts: { type: result.type, value: finalOptions } };
        ea.copyViewElementsToEAforEditing([el]);
    }
    
    await ea.addElementsToView(true, false, false);
};

// ==========================================
// 场景判断与数据提取
// ==========================================
// 增加更多高阶选项
let initialData = { 
    type: 'bar', 
    chartTitle: '',
    labels: ['类目A', '类目B', '类目C'], 
    values: [100, 200, 150],
    colors: [undefined, undefined, undefined], // 独立色
    themeColor: '#5470c6',
    showLabel: false,
    showLegend: true,
    smoothLine: true,
    symbolType: 'emptyCircle'
};
let targetEls = [];

const echartsEls = selectedEls.filter(el => el.customData && el.customData.echarts);
const textEls = selectedEls.filter(el => el.type === "text");

if (echartsEls.length > 0) {
    targetEls = echartsEls;
    const currentEcharts = echartsEls[0].customData.echarts;
    initialData.type = currentEcharts.type;
    
    try {
        if (initialData.type === 'custom') {
            initialData.customOptions = currentEcharts.value;
        } else {
            const config = JSON.parse(currentEcharts.value);
            
            // 解析扩展配置
            initialData.chartTitle = config.title?.text || '';
            initialData.themeColor = config.color ? config.color[0] : '#5470c6';
            initialData.showLegend = config.legend?.show !== false;
            initialData.showLabel = config.series[0]?.label?.show || false;
            initialData.symbolType = config.series[0]?.symbol || 'emptyCircle';
            initialData.smoothLine = config.series[0]?.smooth !== false;

            // 解析带独立颜色的数据
            const seriesData = initialData.type === 'pie' ? config.series[0].data : config.series[0].data;
            if (Array.isArray(seriesData)) {
                // 判断数据格式是对象(包含了独立配置)还是纯数字
                initialData.values = seriesData.map(d => typeof d === 'object' ? d.value : d);
                initialData.labels = initialData.type === 'pie' 
                    ? seriesData.map(d => d.name) 
                    : config.xAxis.data;
                initialData.colors = seriesData.map(d => typeof d === 'object' && d.itemStyle?.color ? d.itemStyle.color : undefined);
            }
        }
    } catch (e) { 
        console.warn(t("log_parse_failed"), e); 
        const legacyData = EchartsCore.parseTextToData(currentEcharts.value);
        if (legacyData) {
            initialData.labels = legacyData.labels;
            initialData.values = legacyData.values;
        }
    }
} else if (textEls.length > 0) {
    targetEls = []; 
    const combinedText = textEls.map(e => e.text).join('\n');
    const parsed = EchartsCore.parseTextToData(combinedText);
    if (parsed) {
        initialData.labels = parsed.labels;
        initialData.values = parsed.values;
    }
    ea.deleteViewElements(textEls); 
}

new EchartsCore.EchartsEditorModal(app, initialData, (result) => {
    applyDataToCanvas(result, targetEls);
}).open();