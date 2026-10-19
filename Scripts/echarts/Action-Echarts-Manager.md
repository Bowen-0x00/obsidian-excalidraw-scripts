---
name: Echarts 图表生成面板
description: 动作脚本：唤起 Echarts 图表可视化编辑器，基于选中的文字生成图表、原地编辑现有图表或插入新图表。
author: ymjr
version: 1.3.1
license: MIT
usage: 选中 CSV / Excel 制表符数据文本可生成多系列图表；选中已有图表可原地编辑，未选择时新建。可在编辑器中切换对比、堆叠、混合双轴及更多图表。
features:
  - 提供数据表格双向绑定的交互式面板与实时交互预览
  - 支持多系列、堆叠、混合双轴、XY 散点、雷达、漏斗、仪表盘、玫瑰及常见图表
  - 支持快捷主题色与推荐配色一键应用
  - 选中已有图表时支持原地无损读取与更新
  - 支持自定义 Echarts JSON 配置项
  - 取消编辑保留原文本，保存成功后才替换文本
dependencies:
  - 必须配合 Feature-Echarts-Engine 1.3.1 或更高版本使用
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_engine: "ECharts 引擎未加载或版本混用。请关闭旧弹窗，重新运行 echarts/Feature-Echarts-Engine 1.3.1；检查脚本目录中的旧版同名引擎（含 Agent-Drawing、Downloaded(Custom)、temp），只保留一份启用的引擎。",
    notice_invalid_data: "选中文字不是有效数据表：请提供类目和数值，可包含表头与多个系列。",
    notice_no_view: "请先打开 Excalidraw 画布，再运行 ECharts 图表生成面板。"
  },
  en: {
    notice_no_engine: "ECharts is missing or mixed with an older engine. Close the editor and run echarts/Feature-Echarts-Engine 1.3.1. Disable duplicate engines under Agent-Drawing, Downloaded(Custom), or temp; keep one enabled copy.",
    notice_invalid_data: "The selected text is not a valid table. Supply categories and numeric values, optionally with a header and multiple series.",
    notice_no_view: "Open an Excalidraw drawing before running the ECharts manager."
  }
};

//ymjr: Route creation and editing through the same versioned data model and save transaction.
const EchartsCore = ExcalidrawAutomate.plugin._ymjr_echarts;
if (EchartsCore?.dataSchemaVersion !== 2 ||
    EchartsCore?.EchartsEditorModal?.dataSchemaVersion !== 2 ||
    !EchartsCore?.applyChartData || !EchartsCore?.normalizeChartData) {
    new Notice(t('notice_no_engine'));
    return;
}
const view=ea.targetView;
if (!view?.excalidrawAPI) {new Notice(t('notice_no_view'));return;}
const selected=ea.getViewSelectedElements().filter(element=>!element.isDeleted);
const chart=selected.find(element=>element.customData?.echarts);
if (chart) {
    EchartsCore.openEditorForElement(chart,view);
    return;
}
const text=selected.filter(element=>element.type==='text');
let initial=EchartsCore.normalizeChartData();
let center=ea.getViewCenterPosition();
if (text.length) {
    const parsed=EchartsCore.parseTextToData(text.map(element=>element.rawText??element.text).join('\n'));
    if (!parsed) {new Notice(t('notice_invalid_data'));return;}
    initial=EchartsCore.normalizeChartData(parsed);
    const box=ea.getBoundingBox(text);
    center={x:box.topX+box.width/2,y:box.topY+box.height/2};
}
new EchartsCore.EchartsEditorModal(app,initial,result=>
    EchartsCore.applyChartData(view,result,{center,sourceTextIds:text.map(element=>element.id)})).open();
