---
name: 切换泳道状态
description: 将选中的矩形元素切换为泳道容器(再次运行可取消)。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的一个或多个矩形元素，运行脚本。在弹出的选择器中设置泳道主题色。选中的矩形将被转化为具有吸附和排版特性的泳道容器。再次运行脚本并选择“移除标记”可将其恢复为普通矩形。
features:
  - 可视化颜色选择与自定义 Hex 颜色输入
  - 向元素注入 `customData.swimlane` 及容器标记以供后台引擎识别
dependencies:
  - 必须依赖 [Feature-Swimlane-Engine] 核心引擎常驻后台提供渲染和交互逻辑
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选择至少一个元素",
    notice_removed: "已移除 Swimlane 标记",
    notice_added: "已标记为 Swimlane (Color: {color})",
    suggester_prompt: "设置 Swimlane 颜色",
    opt_auto: "Auto (自动颜色)",
    opt_manual: "Manual (手动输入 Hex)",
    opt_remove: "Remove (移除标记)",
    prompt_hex: "请输入16进制颜色字符串 (例如 #ff0000)"
  },
  en: {
    notice_select: "Please select at least one element",
    notice_removed: "Swimlane marker removed",
    notice_added: "Marked as Swimlane (Color: {color})",
    suggester_prompt: "Set Swimlane Color",
    opt_auto: "Auto (Automatic)",
    opt_manual: "Manual (Input Hex)",
    opt_remove: "Remove Marker",
    prompt_hex: "Please enter hex color string (e.g., #ff0000)"
  }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

const isAlreadySwimlane = !!selectedEls[0]?.customData?.swimlane;

const options = [t("opt_auto"), t("opt_manual")];
const values = ["auto", "manual"];
if (isAlreadySwimlane) {
    options.push(t("opt_remove"));
    values.push("remove");
}

const selection = await utils.suggester(
    options, 
    values, 
    t("suggester_prompt")
);

if (!selection) return;

let userColor = "auto";
if (selection === "manual") {
    userColor = await utils.inputPrompt(t("prompt_hex"), "", "#ff0000");
    if (!userColor) return;
}

// ✅ 核心修复：先 Copy 到 EA 缓存，然后获取深拷贝对象进行修改
ea.copyViewElementsToEAforEditing(selectedEls);
const eaElements = ea.getElements(); 

eaElements.forEach((el) => {
    if (selection === "remove") {
        if (el.customData) {
            delete el.customData.swimlane;
            delete el.customData.swimlaneHeaderHeight;
            delete el.customData.isContainer;
        }
    } else {
        el.customData = {
            ...el.customData,
            isContainer: true,
            swimlane: { color: userColor }, 
            swimlaneHeaderHeight: 40
        };
    }
});

// EA 的 addElementsToView 会自动处理版本号碰撞并触发完美重绘
await ea.addElementsToView();

if (selection === "remove") {
    new Notice(t("notice_removed"));
} else {
    new Notice(t("notice_added", { color: userColor }));
}
