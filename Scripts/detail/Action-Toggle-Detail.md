---
name: 绑定/解除 Detail 关系
description: 选中要隐藏的元素运行，然后点击作为触发器的Target；不选元素运行则进入解除模式。
author: ymjr
version: 1.0.0
license: MIT
usage: 绑定：先选中需要被折叠/展开的子元素，运行此脚本后，再点击画板上的主元素(Target)进行关联；解除：不选任何元素运行脚本，然后点击主元素(Target)解除关联。
features:
  - 通过临时拦截 shouldSelectElement 提供交互式的“靶向绑定”体验
  - 自动向元素中注入 customData.detail 配置
  - 支持配置子元素是否在拖拽 Target 时跟随移动
dependencies:
  - 依赖 Feature-Detail-Engine 提供实际的展开/折叠显示功能与拖拽跟随算法
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    no_engine: "EA_Core 引擎未加载，无法使用靶向绑定",
    mode_unbind: "🔓 <b>解除模式:</b> 请在下方画布点击需要解除的 <b>Target 元素</b>",
    mode_bind: "🔗 <b>绑定模式:</b> 已选中 {count} 个子元素，请点击作为 <b>Target 的主元素</b>",
    cancel_btn: "取消操作",
    cancel_notice: "已取消绑定操作",
    notice_restored: "✅ 已取消 Detail 绑定并恢复可见性",
    notice_not_target: "该元素不是 Target 元素，操作取消",
    notice_inside_child: "Target 不能在选中的子元素内，操作取消",
    suggester_yes: "是 (拖拽 Target 时，子元素跟随移动)",
    suggester_no: "否 (固定在原位置)",
    suggester_prompt: "Detail 元素是否跟随 Target 相对移动？",
    bind_cancelled: "绑定已取消",
    bind_success: "✅ 绑定成功！已关联 {count} 个子元素"
  },
  en: {
    no_engine: "EA_Core engine not loaded, targeting bind unavailable",
    mode_unbind: "🔓 <b>Unbind Mode:</b> Click the <b>Target Element</b> on canvas to unbind",
    mode_bind: "🔗 <b>Bind Mode:</b> {count} children selected. Click the <b>Target Element</b>.",
    cancel_btn: "Cancel",
    cancel_notice: "Bind operation cancelled",
    notice_restored: "✅ Detail bind cancelled and visibility restored",
    notice_not_target: "This element is not a Target. Operation cancelled",
    notice_inside_child: "Target cannot be inside selected children. Operation cancelled",
    suggester_yes: "Yes (Children follow Target movement)",
    suggester_no: "No (Fixed position)",
    suggester_prompt: "Should Detail elements move relative to Target?",
    bind_cancelled: "Binding cancelled",
    bind_success: "✅ Bind successful! {count} children linked"
  }
};

const HOOK_NAME = "ymjr.action.detail-binder";
const BANNER_ID = "ymjr-detail-binder-banner";
const selectedEls = ea.getViewSelectedElements();
const core = window.EA_Core;

if (!core) {
    // 2. 直接使用 t() 函数，什么都不用引入
    new Notice(t("no_engine"));
    return;
}

core.unregisterHook(HOOK_NAME);
const existingBanner = document.getElementById(BANNER_ID);
if (existingBanner) existingBanner.remove();

const mode = selectedEls.length === 0 ? 'unbind' : 'bind';

// 3. 动态参数可以通过第二个参数传入，自动替换 {count}
const bannerText = mode === 'unbind'
    ? t("mode_unbind")
    : t("mode_bind", { count: selectedEls.length });

const banner = document.createElement("div");
banner.id = BANNER_ID;
banner.style.cssText = `
    position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
    background-color: var(--background-primary, #ffffff);
    color: var(--text-normal, #333);
    border: 2px solid var(--interactive-accent, #3b82f6);
    padding: 10px 20px; border-radius: 8px; z-index: 99999;
    font-family: sans-serif; font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex; align-items: center; gap: 16px; pointer-events: auto;
`;
banner.innerHTML = `
    <span>${bannerText}</span>
    <button id="ymjr-detail-cancel-btn" style="background: var(--background-modifier-error, #ef4444); color: white;border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
        ${t("cancel_btn")}
    </button>
`;
document.body.appendChild(banner);

const cleanup = () => {
    const b = document.getElementById(BANNER_ID);
    if (b) b.remove();
    core.unregisterHook(HOOK_NAME);
};

document.getElementById("ymjr-detail-cancel-btn").onclick = () => {
    cleanup();
    new Notice(t("cancel_notice"));
};

core.registerHook(HOOK_NAME, 'shouldSelectElement', (ctx) => {
    const { element } = ctx;
    if (!element) return; 

    cleanup();
    ctx.shouldSelect = false; 

    if (mode === 'unbind') {
        if (element.customData?.detail) {
            ea.copyViewElementsToEAforEditing([element]);
            const eaTarget = ea.getElement(element.id);
            
            const detailIds = eaTarget.customData.detail.ids || [];
            const detailsToReset = detailIds.map(id => ea.getViewElements().find(e => e.id === id)).filter(Boolean);
            ea.copyViewElementsToEAforEditing(detailsToReset);
            detailsToReset.forEach(child => {
                 const eaChild = ea.getElement(child.id);
                 if (eaChild?.customData?.hide) delete eaChild.customData.hide;
                 if (eaChild?.customData?.isDetailOf) delete eaChild.customData.isDetailOf;
            });

            delete eaTarget.customData.detail;
            ea.addElementsToView();
            new Notice(t("notice_restored"));
        } else {
            new Notice(t("notice_not_target"));
        }
    } else {
        if (selectedEls.some(el => el.id === element.id)) {
            new Notice(t("notice_inside_child"));
            return; 
        }

        (async () => {
            const isRelative = await utils.suggester(
                [t("suggester_yes"), t("suggester_no")], 
                [true, false], 
                t("suggester_prompt")
            );
            if (isRelative === undefined) {
                new Notice(t("bind_cancelled"));
                return;
            }

            const detailIds = selectedEls.map(el => el.id);
            ea.copyViewElementsToEAforEditing([...selectedEls, element]);

            const eaTarget = ea.getElement(element.id);
            eaTarget.customData = {
                ...eaTarget.customData,
                detail: { status: "show", ids: detailIds, relative: isRelative }
            };

            selectedEls.forEach(el => {
                const eaChild = ea.getElement(el.id);
                eaChild.customData = { ...(eaChild.customData || {}), isDetailOf: element.id };
            });

            await ea.addElementsToView();
            new Notice(t("bind_success", { count: detailIds.length }));
        })();
    }
}, 999);
