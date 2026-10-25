---
name: 检测画布未注册字体 (Audit Canvas Fonts)
description: 深度扫描当前活动画布的所有文本元素，精准检测是否存在未注册或缺失的字体，并提供元素高亮定位、一键系统检索载入与批量字体替换功能。
author: ymjr
version: 1.0.0
license: MIT
usage: 打开任意 Excalidraw 画布并运行此脚本。脚本将自动扫描画布所有文本元素，若发现未注册字体，面板将列出具体字体、受影响元素数量与样例文本，支持一键尝试从系统/Vault载入补全，或一键批量替换为已注册字体。
features:
  - 智能扫描当前画布所有文本元素的 fontFamily
  - 对比 Excalidraw 运行时注册表与内置字体标准列表
  - 清晰列出所有缺失字体家族、受影响元素总数与文字样张
  - 一键在画布中选中并高亮对应文本元素
  - 一键从操作系统/Vault检索并补全载入（支持自动存入 Vault 持久化）
  - 支持将缺失字体一键批量替换为画布现存可用字体
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    ui_title: "画布字体完备性检测",
    status_healthy_title: "画布字体状态完备",
    status_healthy_desc: "当前画布中全部文本元素所使用的字体均已在 Excalidraw 注册表中正常加载，无需修复。",
    status_warning_title: "发现未注册字体",
    status_warning_desc: "检测到 {0} 个未在当前画布注册的字体家族，共影响 {1} 个文本元素。未注册字体在渲染时可能回退显示。",
    breakdown_title: "当前画布字体分布统计：",
    elements_count_badge: "{0} 个元素",
    btn_resolve_load: "从系统/Vault检索载入",
    btn_select_canvas: "在画布中选中",
    btn_replace: "替换",
    btn_rescan: "重新检测",
    btn_autofix_all: "一键尝试修复全部未载入字体",
    sample_prefix: "文本摘录: ",
    notice_select: "已在画布中选中 {0} 个使用该字体的文本元素",
    notice_replaced: "已将 {0} 个元素的字体替换为 \"{1}\"",
    notice_resolved: "成功检索并载入字体: {0}",
    notice_resolve_fail: "未能在本机系统或 Vault 目录中找到字体: {0}，建议使用右侧替换功能",
    chk_save_vault: "保存至 Vault 字体目录持久化",
    btn_close: "关闭"
  },
  en: {
    ui_title: "Audit Canvas Fonts",
    status_healthy_title: "All Fonts Fully Registered",
    status_healthy_desc: "All text elements in the current drawing use fonts that are properly registered in the Excalidraw runtime.",
    status_warning_title: "Unregistered Fonts Detected",
    status_warning_desc: "Found {0} unregistered font families affecting {1} text elements. These may fall back to default fonts.",
    breakdown_title: "Canvas Font Usage Breakdown:",
    elements_count_badge: "{0} elements",
    btn_resolve_load: "Auto-resolve & Load",
    btn_select_canvas: "Select on Canvas",
    btn_replace: "Replace",
    btn_rescan: "Re-scan Canvas",
    btn_autofix_all: "Auto-Fix All Recoverable Fonts",
    sample_prefix: "Snippet: ",
    notice_select: "Selected {0} text elements using this font on canvas",
    notice_replaced: "Replaced font on {0} elements with \"{1}\"",
    notice_resolved: "Successfully resolved and registered font: {0}",
    notice_resolve_fail: "Could not find font \"{0}\" in system or vault. Consider replacing it.",
    chk_save_vault: "Save to Vault font folder for persistence",
    btn_close: "Close"
  }
};

const lang = (ea.plugin?.settings?.displayLanguage || (typeof window !== "undefined" && window.localStorage?.getItem("language")) || "zh").startsWith("zh") ? "zh" : "en";
const t = (k, ...args) => {
  let str = (locales[lang] && locales[lang][k]) || (locales.en && locales.en[k]) || k;
  args.forEach((val, idx) => { str = str.replace(`{${idx}}`, val); });
  return str;
};

const { Notice } = ea.obsidian;

const ICONS = {
  checkCircle: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-success, #12b886)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  warningTriangle: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-warning, #f59f00)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  target: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  replace: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

const BUILTIN_FONTS = new Map([
  [1, "Virgil (手绘默认)"],
  [2, "Helvetica (无衬线)"],
  [3, "Cascadia (等宽代码)"],
  [4, "Local Font"],
  [5, "Excalifont"],
  [6, "Nunito"],
  [7, "Lilita One"],
  [8, "Comic Shanns"],
  [9, "Liberation Sans"]
]);

function auditCanvasFonts() {
  const allElements = ea.getViewElements();
  const textElements = allElements.filter(el => el.type === "text" && !el.isDeleted);
  const registeredFamilies = new Set((ea.getFontFamilies ? ea.getFontFamilies() : []).map(f => f.toLowerCase()));

  const registeredCounts = new Map();
  const missingMap = new Map();

  for (const el of textElements) {
    const rawFam = el.fontFamily;
    let famName = null;
    let isReg = false;

    if (typeof rawFam === "number") {
      if (BUILTIN_FONTS.has(rawFam)) {
        famName = BUILTIN_FONTS.get(rawFam);
        isReg = true;
      } else {
        famName = `内置 ID #${rawFam}`;
        isReg = false;
      }
    } else if (typeof rawFam === "string" && rawFam.trim()) {
      famName = rawFam.trim();
      isReg = registeredFamilies.has(famName.toLowerCase());
    } else {
      famName = "默认字体 (Virgil)";
      isReg = true;
    }

    if (isReg) {
      registeredCounts.set(famName, (registeredCounts.get(famName) || 0) + 1);
    } else {
      let entry = missingMap.get(famName);
      if (!entry) {
        entry = { family: famName, count: 0, elements: [], sampleText: el.text || "" };
        missingMap.set(famName, entry);
      }
      entry.count++;
      entry.elements.push(el);
      if (!entry.sampleText && el.text) {
        entry.sampleText = el.text;
      }
    }
  }

  return {
    totalTextCount: textElements.length,
    registeredCounts,
    missingFonts: Array.from(missingMap.values())
  };
}

function renderAuditPanel() {
  const PANEL_ID = "ea-audit-canvas-fonts-panel";
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    top: 90px;
    right: 48px;
    width: 520px;
    max-height: 82vh;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22), 0 4px 14px rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    font-family: var(--font-interface);
    font-size: 13px;
    overflow: hidden;
    backdrop-filter: blur(12px);
  `;

  // 1. Header (Draggable)
  const header = document.createElement("div");
  header.style.cssText = `
    padding: 12px 18px;
    background: var(--background-secondary);
    cursor: move;
    border-bottom: 1px solid var(--background-modifier-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    border-radius: 12px 12px 0 0;
  `;
  header.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="display:flex; color:var(--interactive-accent);">${ICONS.search}</span>
      <span style="font-weight:600; font-size:14px; color:var(--text-normal);">${t("ui_title")}</span>
    </div>
    <button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.15s ease;">
      ${ICONS.close}
    </button>
  `;
  panel.appendChild(header);

  // Content Area
  const body = document.createElement("div");
  body.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  `;
  panel.appendChild(body);

  function refreshView() {
    body.innerHTML = "";
    const audit = auditCanvasFonts();
    const availableRegistered = ea.getFontFamilies ? ea.getFontFamilies() : ["Virgil", "Helvetica", "Cascadia"];

    if (audit.missingFonts.length === 0) {
      // --- ALL HEALTHY STATE ---
      const healthyCard = document.createElement("div");
      healthyCard.style.cssText = `
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 10px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
      `;
      healthyCard.innerHTML = `
        <div style="display:flex; padding:10px; border-radius:9999px; background:rgba(18, 184, 134, 0.12);">
          ${ICONS.checkCircle}
        </div>
        <div style="font-weight:600; font-size:16px; color:var(--text-normal);">${t("status_healthy_title")}</div>
        <div style="color:var(--text-muted); font-size:12px; line-height:1.6; max-width:380px;">${t("status_healthy_desc")}</div>
      `;

      // Breakdown chips
      const breakdownSection = document.createElement("div");
      breakdownSection.style.cssText = "display:flex; flex-direction:column; gap:8px; width:100%; margin-top:8px;";
      breakdownSection.innerHTML = `<div style="font-weight:600; font-size:11px; color:var(--text-muted); text-align:left;">${t("breakdown_title")}</div>`;
      
      const chipsWrap = document.createElement("div");
      chipsWrap.style.cssText = "display:flex; flex-wrap:wrap; gap:6px;";
      for (const [fName, count] of audit.registeredCounts.entries()) {
        const chip = document.createElement("span");
        chip.style.cssText = "padding:4px 10px; border-radius:6px; background:var(--background-primary); border:1px solid var(--background-modifier-border); font-size:12px; color:var(--text-normal);";
        chip.innerText = `${fName}: ${count}`;
        chipsWrap.appendChild(chip);
      }
      breakdownSection.appendChild(chipsWrap);
      healthyCard.appendChild(breakdownSection);

      body.appendChild(healthyCard);

      const footer = document.createElement("div");
      footer.style.cssText = "display:flex; justify-content:flex-end; gap:8px;";
      footer.innerHTML = `
        <button id="btn-recheck" style="padding:7px 12px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:6px;">
          ${ICONS.refresh} <span>${t("btn_rescan")}</span>
        </button>
        <button id="btn-done" style="padding:7px 16px; border-radius:6px; border:none; background:var(--interactive-accent); color:var(--text-on-accent); font-size:12px; font-weight:500; cursor:pointer;">
          ${t("btn_close")}
        </button>
      `;
      footer.querySelector("#btn-recheck").onclick = refreshView;
      footer.querySelector("#btn-done").onclick = () => panel.remove();
      body.appendChild(footer);
      return;
    }

    // --- UNREGISTERED FONTS FOUND ---
    const totalMissingElements = audit.missingFonts.reduce((acc, m) => acc + m.count, 0);

    const warningBanner = document.createElement("div");
    warningBanner.style.cssText = `
      background: rgba(245, 159, 0, 0.08);
      border: 1px solid var(--text-warning);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    `;
    warningBanner.innerHTML = `
      <div style="display:flex; margin-top:2px;">${ICONS.warningTriangle}</div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <span style="font-weight:600; font-size:13px; color:var(--text-normal);">${t("status_warning_title")}</span>
        <span style="font-size:12px; color:var(--text-muted); line-height:1.5;">${t("status_warning_desc", audit.missingFonts.length, totalMissingElements)}</span>
      </div>
    `;
    body.appendChild(warningBanner);

    // List of missing fonts cards
    const listWrapper = document.createElement("div");
    listWrapper.style.cssText = "display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-right:4px;";

    audit.missingFonts.forEach(item => {
      const card = document.createElement("div");
      card.style.cssText = `
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      // Top row: Family name, Badge, Select Button
      const rowTop = document.createElement("div");
      rowTop.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
      rowTop.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; font-size:13px; color:var(--text-normal);">${item.family}</span>
          <span style="font-size:11px; padding:2px 8px; border-radius:9999px; background:rgba(245, 159, 0, 0.15); color:var(--text-warning); font-weight:600;">
            ${t("elements_count_badge", item.count)}
          </span>
        </div>
      `;

      const btnSelect = document.createElement("button");
      btnSelect.style.cssText = "padding:3px 8px; font-size:11px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-normal); cursor:pointer; display:flex; align-items:center; gap:4px;";
      btnSelect.innerHTML = `${ICONS.target} <span>${t("btn_select_canvas")}</span>`;
      btnSelect.onclick = () => {
        ea.setViewSelectedElements(item.elements);
        ea.addElementsToView();
        new Notice(t("notice_select", item.count));
      };
      rowTop.appendChild(btnSelect);
      card.appendChild(rowTop);

      // Snippet preview
      if (item.sampleText) {
        const snippetRow = document.createElement("div");
        snippetRow.style.cssText = "font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:var(--background-primary); padding:4px 8px; border-radius:4px;";
        snippetRow.innerText = t("sample_prefix") + item.sampleText.replace(/\n/g, " ").slice(0, 50);
        card.appendChild(snippetRow);
      }

      // Action row: 1) Auto-resolve & load, 2) Batch Replace
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px;";

      // 1. Resolve & Load button
      const btnResolve = document.createElement("button");
      btnResolve.style.cssText = "padding:5px 10px; font-size:11px; font-weight:500; border-radius:4px; border:none; background:var(--interactive-accent); color:var(--text-on-accent); cursor:pointer; display:flex; align-items:center; gap:5px;";
      btnResolve.innerHTML = `${ICONS.search} <span>${t("btn_resolve_load")}</span>`;
      btnResolve.onclick = async () => {
        btnResolve.disabled = true;
        btnResolve.innerText = "⏳ 检索载入中...";
        try {
          const res = await ea.registerFont({ name: item.family, saveToVault: true });
          new Notice(t("notice_resolved", res));
          refreshView();
        } catch (e) {
          new Notice(t("notice_resolve_fail", item.family));
          btnResolve.disabled = false;
          btnResolve.innerHTML = `${ICONS.search} <span>${t("btn_resolve_load")}</span>`;
        }
      };
      actionsRow.appendChild(btnResolve);

      // 2. Replace controls
      const replaceBox = document.createElement("div");
      replaceBox.style.cssText = "display:flex; gap:4px; align-items:center;";

      const selReplace = document.createElement("select");
      selReplace.style.cssText = "padding:3px 6px; font-size:11px; background:var(--background-modifier-form-field); border:1px solid var(--background-modifier-border); border-radius:4px; color:var(--text-normal); max-width:130px;";
      availableRegistered.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.innerText = f;
        selReplace.appendChild(opt);
      });

      const btnReplace = document.createElement("button");
      btnReplace.style.cssText = "padding:4px 8px; font-size:11px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-normal); cursor:pointer; display:flex; align-items:center; gap:4px;";
      btnReplace.innerHTML = `${ICONS.replace} <span>${t("btn_replace")}</span>`;
      btnReplace.onclick = () => {
        const targetFamily = selReplace.value;
        for (const el of item.elements) {
          el.fontFamily = targetFamily;
        }
        ea.copyViewElementsToEAforEditing(item.elements);
        ea.addElementsToView();
        new Notice(t("notice_replaced", item.elements.length, targetFamily));
        refreshView();
      };

      replaceBox.appendChild(selReplace);
      replaceBox.appendChild(btnReplace);
      actionsRow.appendChild(replaceBox);

      card.appendChild(actionsRow);
      listWrapper.appendChild(card);
    });

    body.appendChild(listWrapper);

    // Global bottom toolbar
    const bottomBar = document.createElement("div");
    bottomBar.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--background-modifier-border); padding-top:12px; margin-top:4px;";

    const btnAutoFixAll = document.createElement("button");
    btnAutoFixAll.style.cssText = "padding:7px 12px; font-size:12px; font-weight:600; border-radius:6px; border:none; background:var(--interactive-accent); color:var(--text-on-accent); cursor:pointer; display:flex; align-items:center; gap:6px;";
    btnAutoFixAll.innerHTML = `${ICONS.bolt} <span>${t("btn_autofix_all")}</span>`;
    btnAutoFixAll.onclick = async () => {
      btnAutoFixAll.disabled = true;
      btnAutoFixAll.innerText = "⏳ 批量修复中...";
      let successCount = 0;
      for (const item of audit.missingFonts) {
        try {
          await ea.registerFont({ name: item.family, saveToVault: true });
          successCount++;
        } catch (e) {
          // ignore individual fails
        }
      }
      new Notice(`批量修复完毕：成功载入 ${successCount} 个字体。`);
      refreshView();
    };

    const rightBtns = document.createElement("div");
    rightBtns.style.cssText = "display:flex; gap:6px;";
    const btnRescan = document.createElement("button");
    btnRescan.style.cssText = "padding:7px 12px; font-size:12px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); cursor:pointer; display:flex; align-items:center; gap:6px;";
    btnRescan.innerHTML = `${ICONS.refresh} <span>${t("btn_rescan")}</span>`;
    btnRescan.onclick = refreshView;

    rightBtns.appendChild(btnRescan);
    bottomBar.appendChild(btnAutoFixAll);
    bottomBar.appendChild(rightBtns);
    body.appendChild(bottomBar);
  }

  refreshView();

  // Dragging & Escape close
  header.querySelector("#close-btn").onclick = () => panel.remove();
  const escHandler = (e) => {
    if (e.key === "Escape") {
      panel.remove();
      window.removeEventListener("keydown", escHandler);
    }
  };
  window.addEventListener("keydown", escHandler);

  let isDragging = false, startX = 0, startY = 0, initLeft = 0, initTop = 0;
  header.onmousedown = (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initLeft = rect.left;
    initTop = rect.top;
    panel.style.right = "auto";
    panel.style.left = `${initLeft}px`;
    panel.style.top = `${initTop}px`;
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    panel.style.left = `${initLeft + (e.clientX - startX)}px`;
    panel.style.top = `${initTop + (e.clientY - startY)}px`;
  };
  const onMouseUp = () => { isDragging = false; };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  document.body.appendChild(panel);
}

renderAuditPanel();
