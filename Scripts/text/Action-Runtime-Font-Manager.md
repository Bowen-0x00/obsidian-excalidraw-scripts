---
name: 运行时字体管理器 (Runtime Font Manager Pro)
description: 现代精致的 Excalidraw 运行时字体管理面板。支持极速检索 600+ 本机系统字体、实时字体排版样张预览、一键加载入画布、网络字体下载与 Vault 持久化同步。
author: ymjr
version: 2.0.0
license: MIT
usage: 运行此脚本呼出专业字体管理悬浮面板。可在“系统字体”、“画布字体”、“网络下载”与“目录同步”间快速切换，支持即时搜索与所见即所得样张预览。
features:
  - 自动极速扫描 600+ 本机系统字体（Windows/macOS/Linux），支持即时中文/英文/等宽筛选
  - 所见即所得排版样张预览，点击即刻完成字体注册与应用
  - 管理画布当前已注册字体，一键应用到当前选中文本
  - 精选开源名牌字体一键下载（得意黑、霞鹜文楷、Fira Code 等），支持自定义 URL 下载并自动持久化至 Vault
  - 手动触发 initializeFonts() 重新扫描加载多字体文件夹
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    ui_title: "运行时字体管理",
    tab_system: "本机系统字体",
    tab_canvas: "画布已载入",
    tab_download: "网络下载",
    tab_sync: "目录同步",
    search_placeholder: "搜索字体家族或文件名 (如 楷体, YaHei, Consolas)...",
    filter_all: "全部",
    filter_cjk: "中文",
    filter_mono: "代码等宽",
    filter_popular: "常用推荐",
    font_count_fmt: "共 {0} 个字体",
    sample_cjk: "永和九年，岁在癸丑；天地玄黄，宇宙洪荒 0123456789",
    sample_en: "The quick brown fox jumps over the lazy dog. 0123456789",
    btn_load_font: "载入画布",
    btn_loaded: "已在画布",
    btn_apply: "应用到选中",
    btn_reload_scan: "重新扫描多字体目录",
    hint_reload: "重新扫描并编译 Vault 字体目录中的所有字体文件",
    notice_select: "请先在画布中选中包含文本的元素！",
    notice_applied: "已将字体 \"{0}\" 应用于 {1} 个文本元素",
    preset_title: "精选开源字体快速安装",
    chk_save_vault: "保存至 Vault 字体目录持久化",
    btn_download: "下载并载入画布",
    custom_url_label: "自定义网络字体 URL",
    custom_name_label: "自定义字体名称 (留空自动从文件解析)",
    status_downloading: "正在下载并注册字体...",
    status_success: "成功注册字体: ",
    status_failed: "操作失败: ",
    no_results: "没有找到匹配的字体",
    folder_path_label: "当前多字体目录: "
  },
  en: {
    ui_title: "Runtime Font Manager",
    tab_system: "System Fonts",
    tab_canvas: "Canvas Fonts",
    tab_download: "Web Download",
    tab_sync: "Folder Sync",
    search_placeholder: "Search family or file (e.g. Consolas, Arial, Inter)...",
    filter_all: "All",
    filter_cjk: "CJK / Chinese",
    filter_mono: "Monospace",
    filter_popular: "Popular",
    font_count_fmt: "{0} fonts available",
    sample_cjk: "永和九年，岁在癸丑；天地玄黄，宇宙洪荒 0123456789",
    sample_en: "The quick brown fox jumps over the lazy dog. 0123456789",
    btn_load_font: "Load Font",
    btn_loaded: "Loaded",
    btn_apply: "Apply to Selected",
    btn_reload_scan: "Rescan Multi-Fonts Folder",
    hint_reload: "Rescans and compiles all font files in your configured Vault font folder",
    notice_select: "Please select text elements on canvas first!",
    notice_applied: "Applied \"{0}\" to {1} text elements",
    preset_title: "One-Click Open Source Presets",
    chk_save_vault: "Save into Vault font folder for persistence",
    btn_download: "Download & Register",
    custom_url_label: "Custom Web Font URL",
    custom_name_label: "Custom Font Name (leave blank to auto-detect)",
    status_downloading: "Downloading and registering font...",
    status_success: "Successfully registered font: ",
    status_failed: "Operation failed: ",
    no_results: "No matching fonts found",
    folder_path_label: "Multi-Fonts folder path: "
  }
};

const lang = (ea.plugin?.settings?.displayLanguage || (typeof window !== "undefined" && window.localStorage?.getItem("language")) || "zh").startsWith("zh") ? "zh" : "en";

const { Notice } = ea.obsidian;

// Professional Inline SVGs (No emoji icons)
const ICONS = {
  search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  canvas: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  folder: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  apply: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
};

// Curated Open Source Web Fonts for 1-Click Install
const PRESET_WEB_FONTS = [
  {
    name: "Smiley Sans (得意黑)",
    desc: "开源人文西文结合的中文字体，圆润舒展，极富设计美感",
    url: "https://raw.githubusercontent.com/rewear-team/smiley-sans/main/packages/smiley-sans/dist/SmileySans-Oblique.ttf"
  },
  {
    name: "LXGW WenKai (霞鹜文楷)",
    desc: "优雅开源楷体，字形端庄清秀，技术讲解与图文注释首选",
    url: "https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/fonts/TTF/LXGWWenKai-Regular.ttf"
  },
  {
    name: "Fira Code",
    desc: "带编程连字的优秀等宽开源代码字体",
    url: "https://raw.githubusercontent.com/tonsky/FiraCode/master/distr/ttf/FiraCode-Regular.ttf"
  },
  {
    name: "JetBrains Mono",
    desc: "专为程序员阅读优化的现代等宽代码字体",
    url: "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf"
  }
];

function getSelectedTextElements() {
  const api = ea.getExcalidrawAPI();
  const elementsMap = api?.App?.scene?.getNonDeletedElementsMap?.() || new Map();
  const selectedEls = ea.getViewSelectedElements();
  const textEls = [];

  for (const el of selectedEls) {
    if (el.type === "text") {
      textEls.push(el);
    } else if (el.boundElements) {
      for (const bound of el.boundElements) {
        if (bound.type === "text") {
          const textEl = elementsMap.get(bound.id);
          if (textEl) textEls.push(textEl);
        }
      }
    }
  }
  return textEls;
}

function applyFontToSelected(family) {
  const textEls = getSelectedTextElements();
  if (textEls.length === 0) {
    new Notice(t("notice_select"));
    return;
  }
  for (const el of textEls) {
    el.fontFamily = family;
  }
  ea.copyViewElementsToEAforEditing(textEls);
  ea.addElementsToView();
  new Notice(t("notice_applied", family, textEls.length));
}

async function confirmSaveToVaultDialog(fontName) {
  return new Promise((resolve) => {
    const modalBg = document.createElement("div");
    modalBg.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.45); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      width: 420px; background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px; padding: 20px; box-shadow: 0 20px 48px rgba(0,0,0,0.3);
      display: flex; flex-direction: column; gap: 14px;
      font-family: var(--font-interface); font-size: 13px;
    `;

    dialog.innerHTML = `
      <div style="font-weight:600; font-size:15px; color:var(--text-normal); display:flex; align-items:center; gap:8px;">
        <span style="color:var(--text-warning); font-size:16px;">⚠️</span>
        <span>未勾选保存至 Vault 字体目录</span>
      </div>
      <div style="color:var(--text-muted); font-size:12px; line-height:1.6;">
        你未勾选“保存字体至 Vault 字体目录”。字体 <b>${fontName}</b> 将仅在当前会话的内存中加载。<br><br>
        <b>⚠️ 风险提示：</b>若未保存到 Vault 文件夹，<b>重启 Obsidian</b> 或在<b>其他未安装该字体的设备</b>（如平板、手机、其他电脑）上打开画布时，该字体将无法自动加载并回退显示。<br><br>
        建议保存到多字体文件夹以实现持久化与多端同步。
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
        <button id="dlg-cancel" style="padding:6px 12px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); cursor:pointer;">取消</button>
        <button id="dlg-session" style="padding:6px 12px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-muted); cursor:pointer;">仅当前会话载入</button>
        <button id="dlg-save" style="padding:6px 14px; border-radius:6px; border:none; background:var(--interactive-accent); color:var(--text-on-accent); font-weight:600; cursor:pointer;">保存至文件夹并载入 (推荐)</button>
      </div>
    `;

    modalBg.appendChild(dialog);
    document.body.appendChild(modalBg);

    dialog.querySelector("#dlg-cancel").onclick = () => {
      modalBg.remove();
      resolve(null);
    };
    dialog.querySelector("#dlg-session").onclick = () => {
      modalBg.remove();
      resolve(false);
    };
    dialog.querySelector("#dlg-save").onclick = () => {
      modalBg.remove();
      resolve(true);
    };
  });
}

function readFontFamilyFastScript(filePath, fsModule) {
  let fd = null;
  try {
    fd = fsModule.openSync(filePath, "r");
    const headerBuf = new Uint8Array(4096);
    fsModule.readSync(fd, headerBuf, 0, 4096, 0);
    const view = new DataView(headerBuf.buffer, headerBuf.byteOffset, headerBuf.byteLength);
    let baseOffset = 0;
    const sig = view.getUint32(0);
    if (sig === 0x74746366) baseOffset = view.getUint32(12);
    if (view.byteLength < baseOffset + 12) return null;
    const tableCount = view.getUint16(baseOffset + 4);
    let nameOffset = -1;
    let nameLength = 0;
    for (let i = 0; i < tableCount; i++) {
      const rec = baseOffset + 12 + i * 16;
      if (view.byteLength < rec + 16) break;
      if (view.getUint32(rec) === 0x6e616d65) {
        nameOffset = view.getUint32(rec + 8);
        nameLength = view.getUint32(rec + 12);
        break;
      }
    }
    if (nameOffset === -1 || nameLength <= 6) return null;
    const nameBuf = new Uint8Array(nameLength);
    fsModule.readSync(fd, nameBuf, 0, nameLength, nameOffset);
    const nView = new DataView(nameBuf.buffer, nameBuf.byteOffset, nameBuf.byteLength);
    const count = nView.getUint16(2);
    const stringOffset = nView.getUint16(4);
    let preferredName = null;
    let fallbackName = null;
    for (let i = 0; i < count; i++) {
      const rec = 6 + i * 12;
      if (nView.byteLength < rec + 12) break;
      const platformID = nView.getUint16(rec);
      const languageID = nView.getUint16(rec + 4);
      const nameID = nView.getUint16(rec + 6);
      const length = nView.getUint16(rec + 8);
      const strOff = stringOffset + nView.getUint16(rec + 10);
      if (nView.byteLength < strOff + length) continue;
      if (nameID === 1 || nameID === 4 || nameID === 16) {
        let str = "";
        if (platformID === 3 || platformID === 0) {
          for (let b = 0; b < length; b += 2) str += String.fromCharCode(nView.getUint16(strOff + b));
        } else if (platformID === 1) {
          for (let b = 0; b < length; b++) str += String.fromCharCode(nView.getUint8(strOff + b));
        }
        str = str.trim();
        if (!str) continue;
        if (nameID === 1 && (languageID === 0x0409 || platformID === 0)) return str;
        if (nameID === 1 && !preferredName) preferredName = str;
        if (!fallbackName) fallbackName = str;
      }
    }
    return preferredName || fallbackName;
  } catch (e) {
    return null;
  } finally {
    if (fd !== null) {
      try { fsModule.closeSync(fd); } catch (e) {}
    }
  }
}

function scanSystemFontsDirectly() {
  const electronWin = window;
  const fs = typeof electronWin.require === "function" ? electronWin.require("fs") : (typeof require === "function" ? require("fs") : null);
  const pathModule = typeof electronWin.require === "function" ? electronWin.require("path") : (typeof require === "function" ? require("path") : null);
  if (!fs || !pathModule) return [];

  const candidateDirs = [];
  const nodeProcess = typeof process !== "undefined" ? process : (electronWin.process || {});
  const env = nodeProcess.env || {};
  const isWin = (typeof navigator !== "undefined" && /win/i.test(navigator.platform || navigator.userAgent)) || nodeProcess.platform === "win32";
  const isMac = (typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent)) || nodeProcess.platform === "darwin";

  if (isWin) {
    const winDir = env.WINDIR || env.windir || env.SystemRoot || env.SYSTEMROOT || "C:\\Windows";
    candidateDirs.push(pathModule.join(winDir, "Fonts"));
    const localApp = env.LOCALAPPDATA || env.LocalAppData || env.localappdata;
    if (localApp) {
      candidateDirs.push(pathModule.join(localApp, "Microsoft", "Windows", "Fonts"));
    }
  } else if (isMac) {
    candidateDirs.push("/System/Library/Fonts", "/Library/Fonts", pathModule.join(env.HOME || "~", "Library/Fonts"));
  } else {
    candidateDirs.push("/usr/share/fonts", "/usr/local/share/fonts", pathModule.join(env.HOME || "~", ".local/share/fonts"));
  }

  const results = [];
  const seenFamilies = new Set();
  const currentLoaded = new Set((ea.getFontFamilies ? ea.getFontFamilies() : []).map(f => f.toLowerCase()));

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (!/\.(ttf|ttc|otf|woff2)$/i.test(entry)) continue;
        const fullPath = pathModule.join(dir, entry);
        const family = readFontFamilyFastScript(fullPath, fs) || entry.replace(/\.[^/.]+$/, "");
        const key = family.toLowerCase();
        if (!seenFamilies.has(key)) {
          seenFamilies.add(key);
          results.push({
            family,
            fileName: entry,
            path: fullPath,
            isLoaded: currentLoaded.has(key)
          });
        }
      }
    } catch (e) {}
  }
  results.sort((a, b) => a.family.localeCompare(b.family));
  return results;
}

async function renderMainPanel() {
  const PANEL_ID = "ea-runtime-font-manager-pro";
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    top: 90px;
    right: 48px;
    width: 540px;
    height: 640px;
    max-height: 85vh;
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
      <span style="display:flex; color:var(--interactive-accent);">${ICONS.canvas}</span>
      <span style="font-weight:600; font-size:14px; color:var(--text-normal);">${t("ui_title")}</span>
      <span style="font-size:11px; padding:1px 6px; border-radius:9999px; background:var(--background-modifier-border); color:var(--text-muted); font-weight:500;">v2.0 Pro</span>
    </div>
    <button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.15s ease;">
      ${ICONS.close}
    </button>
  `;
  panel.appendChild(header);

  // 2. Segmented Navigation Tabs
  const navContainer = document.createElement("div");
  navContainer.style.cssText = `
    padding: 10px 18px 4px 18px;
    background: var(--background-primary);
  `;
  const navTabs = document.createElement("div");
  navTabs.style.cssText = `
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    padding: 3px;
    border-radius: 8px;
    display: flex;
    gap: 2px;
  `;

  const tabsConfig = [
    { id: "system", label: t("tab_system"), icon: ICONS.monitor },
    { id: "canvas", label: t("tab_canvas"), icon: ICONS.canvas },
    { id: "download", label: t("tab_download"), icon: ICONS.download },
    { id: "sync", label: t("tab_sync"), icon: ICONS.folder }
  ];

  let currentTab = "system";
  const tabButtons = {};

  // Content Area
  const body = document.createElement("div");
  body.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 14px 18px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  `;

  tabsConfig.forEach(tab => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      background: transparent;
      transition: all 0.15s ease;
    `;
    btn.innerHTML = `<span>${tab.icon}</span><span>${tab.label}</span>`;
    btn.onclick = () => switchTab(tab.id);
    tabButtons[tab.id] = btn;
    navTabs.appendChild(btn);
  });
  navContainer.appendChild(navTabs);
  panel.appendChild(navContainer);
  panel.appendChild(body);

  // Cache state
  let systemFontsList = [];
  let isScanningSystem = false;

  async function switchTab(tabId) {
    currentTab = tabId;
    tabsConfig.forEach(tConf => {
      const b = tabButtons[tConf.id];
      if (tConf.id === tabId) {
        b.style.background = "var(--background-primary)";
        b.style.color = "var(--text-normal)";
        b.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
        b.style.fontWeight = "600";
      } else {
        b.style.background = "transparent";
        b.style.color = "var(--text-muted)";
        b.style.boxShadow = "none";
        b.style.fontWeight = "500";
      }
    });

    body.innerHTML = "";
    if (tabId === "system") {
      await renderSystemFontsTab(body);
    } else if (tabId === "canvas") {
      renderCanvasFontsTab(body);
    } else if (tabId === "download") {
      renderDownloadTab(body);
    } else if (tabId === "sync") {
      renderSyncTab(body);
    }
  }

  // --- TAB 1: SYSTEM FONTS (600+ FULL MACHINE FONTS) ---
  async function renderSystemFontsTab(container) {
    // Top Controls: Search Bar & Filters
    const topCard = document.createElement("div");
    topCard.style.cssText = "display:flex; flex-direction:column; gap:10px;";

    const searchRow = document.createElement("div");
    searchRow.style.cssText = "position:relative; display:flex; align-items:center;";
    searchRow.innerHTML = `
      <div style="position:absolute; left:10px; color:var(--text-muted); display:flex;">${ICONS.search}</div>
      <input id="sys-search" type="text" placeholder="${t("search_placeholder")}" style="
        width: 100%;
        box-sizing: border-box;
        padding: 8px 32px 8px 32px;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        font-size: 12px;
        color: var(--text-normal);
        outline: none;
      "/>
      <button id="clear-search" style="position:absolute; right:8px; background:none; border:none; color:var(--text-muted); cursor:pointer; display:none; padding:2px;">✕</button>
    `;
    topCard.appendChild(searchRow);

    // Options Row: Save to Vault Checkbox
    const optionsRow = document.createElement("div");
    optionsRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:2px 0;";
    optionsRow.innerHTML = `
      <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); cursor:pointer;">
        <input id="sys-save-vault" type="checkbox" checked style="accent-color:var(--interactive-accent); cursor:pointer;"/>
        <span>保存字体至 Vault 多字体目录 (推荐，实现跨会话与多端同步)</span>
      </label>
    `;
    topCard.appendChild(optionsRow);


    // Filter Chips Row
    const filterRow = document.createElement("div");
    filterRow.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    const chipsContainer = document.createElement("div");
    chipsContainer.style.cssText = "display:flex; gap:6px;";

    const filters = [
      { id: "all", label: t("filter_all") },
      { id: "popular", label: t("filter_popular") },
      { id: "cjk", label: t("filter_cjk") },
      { id: "mono", label: t("filter_mono") }
    ];
    let activeFilter = "all";

    const countBadge = document.createElement("span");
    countBadge.style.cssText = "font-size:11px; color:var(--text-muted);";

    filterRow.appendChild(chipsContainer);
    filterRow.appendChild(countBadge);
    topCard.appendChild(filterRow);
    container.appendChild(topCard);

    // List Container
    const listWrapper = document.createElement("div");
    listWrapper.style.cssText = "flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;";
    container.appendChild(listWrapper);

    // Load data
    if (systemFontsList.length === 0 && !isScanningSystem) {
      isScanningSystem = true;
      listWrapper.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:180px; gap:10px; color:var(--text-muted);">
          <div style="animation:spin 1s linear infinite; display:flex;">${ICONS.refresh}</div>
          <div style="font-size:12px;">正在高速扫描本机已安装字体 (约 0.1~0.3s)...</div>
        </div>
      `;
      try {
        if (typeof ea.getSystemFonts === "function") {
          systemFontsList = await ea.getSystemFonts();
        } else if (ea.plugin && typeof ea.plugin.getSystemFonts === "function") {
          systemFontsList = await ea.plugin.getSystemFonts();
        }
      } catch (e) {
        console.warn("ea.getSystemFonts failed, falling back to direct scan:", e);
      }
      if (!systemFontsList || systemFontsList.length === 0) {
        systemFontsList = scanSystemFontsDirectly();
      }
      isScanningSystem = false;
    }

    const searchInput = searchRow.querySelector("#sys-search");
    const clearBtn = searchRow.querySelector("#clear-search");

    searchInput.oninput = () => {
      clearBtn.style.display = searchInput.value ? "block" : "none";
      renderList();
    };
    clearBtn.onclick = () => {
      searchInput.value = "";
      clearBtn.style.display = "none";
      renderList();
    };

    filters.forEach(f => {
      const chip = document.createElement("button");
      chip.style.cssText = `
        padding: 3px 9px;
        border-radius: 9999px;
        font-size: 11px;
        cursor: pointer;
        border: 1px solid var(--background-modifier-border);
        background: ${f.id === activeFilter ? "var(--interactive-accent)" : "var(--background-secondary)"};
        color: ${f.id === activeFilter ? "var(--text-on-accent)" : "var(--text-muted)"};
        font-weight: ${f.id === activeFilter ? "600" : "400"};
        transition: all 0.12s ease;
      `;
      chip.innerText = f.label;
      chip.onclick = () => {
        activeFilter = f.id;
        chipsContainer.querySelectorAll("button").forEach((b, i) => {
          const match = filters[i].id === activeFilter;
          b.style.background = match ? "var(--interactive-accent)" : "var(--background-secondary)";
          b.style.color = match ? "var(--text-on-accent)" : "var(--text-muted)";
          b.style.fontWeight = match ? "600" : "400";
        });
        renderList();
      };
      chipsContainer.appendChild(chip);
    });

    const POPULAR_KEYS = ["kaiti", "simhei", "yahei", "simsun", "fangsong", "deng", "consolas", "cascadia", "arial", "inter", "fira", "segoe"];
    const MONO_KEYS = ["code", "mono", "consolas", "courier", "fixed"];
    const CJK_KEYS = ["yahei", "kaiti", "simhei", "simsun", "fangsong", "deng", "pingfang", "songti", "heiti", "stkaiti", "lxgw", "楷", "黑", "宋", "仿宋"];

    function renderList() {
      listWrapper.innerHTML = "";
      const term = searchInput.value.trim().toLowerCase();
      const currentCanvasFonts = new Set((ea.getFontFamilies ? ea.getFontFamilies() : []).map(f => f.toLowerCase()));

      let filtered = systemFontsList.filter(item => {
        const famLower = item.family.toLowerCase();
        const fileLower = item.fileName.toLowerCase();
        // search term
        if (term && !famLower.includes(term) && !fileLower.includes(term)) {
          return false;
        }
        // categories
        if (activeFilter === "popular") {
          return POPULAR_KEYS.some(k => famLower.includes(k) || fileLower.includes(k));
        }
        if (activeFilter === "cjk") {
          return CJK_KEYS.some(k => famLower.includes(k) || fileLower.includes(k));
        }
        if (activeFilter === "mono") {
          return MONO_KEYS.some(k => famLower.includes(k) || fileLower.includes(k));
        }
        return true;
      });

      countBadge.innerText = t("font_count_fmt", filtered.length);

      if (filtered.length === 0) {
        listWrapper.innerHTML = `
          <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:12px;">
            ${t("no_results")}
          </div>
        `;
        return;
      }

      // Max render 60 items at a time for buttery smooth rendering
      const displayBatch = filtered.slice(0, 60);

      displayBatch.forEach(font => {
        const isLoaded = currentCanvasFonts.has(font.family.toLowerCase());
        const card = document.createElement("div");
        card.style.cssText = `
          background: var(--background-secondary);
          border: 1px solid var(--background-modifier-border);
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s ease;
        `;

        // Card Top: Family Name, Filename, Action Button
        const headerRow = document.createElement("div");
        headerRow.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
        headerRow.innerHTML = `
          <div style="display:flex; align-items:baseline; gap:8px;">
            <span style="font-weight:600; font-size:13px; color:var(--text-normal);">${font.family}</span>
            <span style="font-size:10px; color:var(--text-muted); font-family:var(--font-monospace);">${font.fileName}</span>
          </div>
        `;

        const actionBtn = document.createElement("button");
        if (isLoaded) {
          actionBtn.style.cssText = "padding:3px 8px; font-size:11px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-muted); cursor:default; display:flex; align-items:center; gap:4px;";
          actionBtn.innerHTML = `<span>${ICONS.check}</span><span>${t("btn_loaded")}</span>`;
        } else {
          actionBtn.style.cssText = "padding:4px 10px; font-size:11px; font-weight:500; border-radius:4px; border:none; background:var(--interactive-accent); color:var(--text-on-accent); cursor:pointer; display:flex; align-items:center; gap:4px; transition:transform 0.1s ease;";
          actionBtn.innerHTML = `<span>${ICONS.plus}</span><span>${t("btn_load_font")}</span>`;
          actionBtn.onclick = async () => {
            const chkSaveVault = topCard.querySelector("#sys-save-vault");
            let saveToVault = chkSaveVault ? chkSaveVault.checked : true;
            if (!saveToVault) {
              const choice = await confirmSaveToVaultDialog(font.family);
              if (choice === null) {
                return;
              }
              saveToVault = choice;
              if (choice === true && chkSaveVault) {
                chkSaveVault.checked = true;
              }
            }

            actionBtn.disabled = true;
            actionBtn.innerText = "⏳...";
            try {
              let regName = "";
              if (typeof ea.registerFont === "function") {
                regName = await ea.registerFont({ path: font.path, name: font.family, saveToVault });
              } else if (ea.plugin && typeof ea.plugin.registerFont === "function") {
                regName = await ea.plugin.registerFont({ path: font.path, name: font.family, saveToVault });
              }
              new Notice(t("status_success") + regName);
              const selected = getSelectedTextElements();
              if (selected.length > 0) {
                applyFontToSelected(regName);
              }
              renderList();
            } catch (err) {
              new Notice(t("status_failed") + err.message);
              actionBtn.disabled = false;
              actionBtn.innerHTML = `<span>${ICONS.plus}</span><span>${t("btn_load_font")}</span>`;
            }
          };
        }
        headerRow.appendChild(actionBtn);
        card.appendChild(headerRow);

        // Card Bottom: Typography Sample in its true font
        const sampleRow = document.createElement("div");
        const isCjk = CJK_KEYS.some(k => font.family.toLowerCase().includes(k) || font.fileName.toLowerCase().includes(k));
        sampleRow.style.cssText = `
          font-family: "${font.family}", sans-serif;
          font-size: 13px;
          color: var(--text-normal);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 4px 0 2px 0;
          opacity: 0.9;
        `;
        sampleRow.innerText = isCjk ? t("sample_cjk") : t("sample_en");
        card.appendChild(sampleRow);

        listWrapper.appendChild(card);
      });
    }

    renderList();
  }

  // --- TAB 2: CANVAS ACTIVE FONTS ---
  function renderCanvasFontsTab(container) {
    const families = ea.getFontFamilies ? ea.getFontFamilies() : ["Virgil", "Helvetica", "Cascadia"];
    
    const topBar = document.createElement("div");
    topBar.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;";
    topBar.innerHTML = `
      <span style="font-weight:600; font-size:12px; color:var(--text-muted);">${t("font_count_fmt", families.length)}</span>
      <button id="apply-all-selected" style="padding:6px 12px; border-radius:6px; font-size:12px; font-weight:500; border:none; background:var(--interactive-accent); color:var(--text-on-accent); cursor:pointer; display:flex; align-items:center; gap:6px;">
        ${ICONS.apply} <span>${t("btn_apply")}</span>
      </button>
    `;
    container.appendChild(topBar);

    let selectedFamily = families[0] || "Virgil";

    const listWrapper = document.createElement("div");
    listWrapper.style.cssText = "flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px;";

    families.forEach(fam => {
      const card = document.createElement("div");
      const isSelected = fam === selectedFamily;
      card.style.cssText = `
        background: var(--background-secondary);
        border: 1px solid ${isSelected ? "var(--interactive-accent)" : "var(--background-modifier-border)"};
        border-radius: 8px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      `;

      card.onclick = () => {
        selectedFamily = fam;
        renderCanvasFontsTab(container);
      };

      const rowTop = document.createElement("div");
      rowTop.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
      rowTop.innerHTML = `
        <span style="font-weight:600; font-size:13px; color:var(--text-normal);">${fam}</span>
        <button style="padding:3px 8px; font-size:11px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-normal); cursor:pointer; display:flex; align-items:center; gap:4px;">
          ${ICONS.apply} <span>${t("btn_apply")}</span>
        </button>
      `;
      rowTop.querySelector("button").onclick = (e) => {
        e.stopPropagation();
        applyFontToSelected(fam);
      };

      const sample = document.createElement("div");
      sample.style.cssText = `
        font-family: "${fam}", sans-serif;
        font-size: 14px;
        color: var(--text-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      sample.innerText = t("sample_cjk");

      card.appendChild(rowTop);
      card.appendChild(sample);
      listWrapper.appendChild(card);
    });

    container.appendChild(listWrapper);

    topBar.querySelector("#apply-all-selected").onclick = () => {
      applyFontToSelected(selectedFamily);
    };
  }

  // --- TAB 3: WEB FONT DOWNLOAD & PRESETS ---
  function renderDownloadTab(container) {
    const card = document.createElement("div");
    card.style.cssText = "display:flex; flex-direction:column; gap:12px;";

    // Custom Download Form
    const customSection = document.createElement("div");
    customSection.style.cssText = "background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px;";
    customSection.innerHTML = `
      <div style="font-weight:600; font-size:12px; color:var(--text-normal);">${t("custom_url_label")}</div>
      <input id="web-url" type="text" placeholder="https://.../font.ttf 或 .woff2" style="
        width: 100%; box-sizing: border-box; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 7px 10px; font-size: 12px; color: var(--text-normal); outline: none;
      "/>
      <div style="font-weight:600; font-size:12px; color:var(--text-normal);">${t("custom_name_label")}</div>
      <input id="web-name" type="text" placeholder="e.g. My Custom Font" style="
        width: 100%; box-sizing: border-box; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 7px 10px; font-size: 12px; color: var(--text-normal); outline: none;
      "/>
      <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-muted); cursor:pointer;">
        <input id="web-save-vault" type="checkbox" checked style="accent-color:var(--interactive-accent); cursor:pointer;"/>
        <span>${t("chk_save_vault")}</span>
      </label>
      <button id="btn-custom-download" style="
        padding: 8px 14px; border-radius: 6px; border: none; background: var(--interactive-accent); color: var(--text-on-accent); font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.15s ease;
      ">
        ${ICONS.download} <span>${t("btn_download")}</span>
      </button>
    `;
    card.appendChild(customSection);

    // Presets Section
    const presetSection = document.createElement("div");
    presetSection.style.cssText = "display:flex; flex-direction:column; gap:8px;";
    presetSection.innerHTML = `<div style="font-weight:600; font-size:12px; color:var(--text-muted);">${t("preset_title")}</div>`;

    PRESET_WEB_FONTS.forEach(pf => {
      const pCard = document.createElement("div");
      pCard.style.cssText = "background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;";
      pCard.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="font-weight:600; font-size:13px; color:var(--text-normal);">${pf.name}</span>
          <span style="font-size:11px; color:var(--text-muted);">${pf.desc}</span>
        </div>
        <button class="preset-dl-btn" style="padding:6px 10px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-normal); font-size:11px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:4px; flex-shrink:0;">
          ${ICONS.download} <span>安装</span>
        </button>
      `;

      const dlBtn = pCard.querySelector(".preset-dl-btn");
      dlBtn.onclick = async () => {
        dlBtn.disabled = true;
        dlBtn.innerText = "⏳...";
        try {
          const regName = await ea.registerFont({
            url: pf.url,
            name: pf.name.split(" ")[0],
            saveToVault: true
          });
          new Notice(t("status_success") + regName);
          dlBtn.innerHTML = `<span>${ICONS.check}</span><span>已载入</span>`;
        } catch (e) {
          new Notice(t("status_failed") + e.message);
          dlBtn.disabled = false;
          dlBtn.innerHTML = `${ICONS.download} <span>安装</span>`;
        }
      };

      presetSection.appendChild(pCard);
    });

    card.appendChild(presetSection);
    container.appendChild(card);

    // Custom download event
    const btnDl = customSection.querySelector("#btn-custom-download");
    btnDl.onclick = async () => {
      const url = customSection.querySelector("#web-url").value.trim();
      const name = customSection.querySelector("#web-name").value.trim();
      let saveToVault = customSection.querySelector("#web-save-vault").checked;
      if (!url) {
        new Notice("Please enter a valid font URL.");
        return;
      }
      if (!saveToVault) {
        const choice = await confirmSaveToVaultDialog(name || url.split("/").pop());
        if (choice === null) return;
        saveToVault = choice;
        if (choice === true) {
          customSection.querySelector("#web-save-vault").checked = true;
        }
      }
      btnDl.disabled = true;
      btnDl.innerText = t("status_downloading");
      try {
        const regName = await ea.registerFont({ url, name: name || undefined, saveToVault });
        new Notice(t("status_success") + regName);
        customSection.querySelector("#web-url").value = "";
        customSection.querySelector("#web-name").value = "";
      } catch (e) {
        new Notice(t("status_failed") + e.message);
      } finally {
        btnDl.disabled = false;
        btnDl.innerHTML = `${ICONS.download} <span>${t("btn_download")}</span>`;
      }
    };
  }

  // --- TAB 4: FOLDER SYNC ---
  function renderSyncTab(container) {
    const card = document.createElement("div");
    card.style.cssText = "background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:8px; padding:18px; display:flex; flex-direction:column; gap:14px;";

    const folderPath = ea.plugin?.settings?.multiFontsFolder || "未配置 (Not Configured)";
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="color:var(--interactive-accent); display:flex;">${ICONS.folder}</span>
        <span style="font-weight:600; font-size:13px; color:var(--text-normal);">${t("folder_path_label")}</span>
        <code style="background:var(--background-modifier-border); padding:2px 6px; border-radius:4px; font-size:11px;">${folderPath}</code>
      </div>
      <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
        ${t("hint_reload")}。当你往该 Vault 文件夹内放入新的 .ttf、.woff2、.otf 或 .ttc 文件后，点击下方按钮无需重启 Obsidian 即可热重载所有字体。
      </div>
      <button id="btn-sync-now" style="
        padding: 9px 16px; border-radius: 6px; border: none; background: var(--interactive-accent); color: var(--text-on-accent); font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s ease;
      ">
        ${ICONS.refresh} <span>${t("btn_reload_scan")}</span>
      </button>
    `;

    const btnSync = card.querySelector("#btn-sync-now");
    btnSync.onclick = async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = `<span style="animation:spin 1s linear infinite; display:flex;">${ICONS.refresh}</span> <span>扫描重载中...</span>`;
      try {
        await ea.initializeFonts(true);
        // Refresh system cache too
        if (typeof ea.getSystemFonts === "function") {
          systemFontsList = await ea.getSystemFonts(true);
        }
      } catch (err) {
        new Notice("Sync Error: " + err.message);
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = `${ICONS.refresh} <span>${t("btn_reload_scan")}</span>`;
      }
    };

    container.appendChild(card);
  }

  // Initial tab render
  switchTab("system");

  // Draggable Header & Close Event
  header.querySelector("#close-btn").onclick = () => panel.remove();

  // Escape key closes panel
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

  // Keyframes for spin animation
  if (!document.getElementById("ea-font-mgr-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "ea-font-mgr-style";
    styleEl.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(panel);
}

renderMainPanel();
