---
name: 代码高亮样式设置
description: 悬浮面板：调整当前代码块主题、字体、字号，支持存为全局默认。
author: ymjr
version: 1.0.0
license: MIT
usage: 在画布上选中通过代码高亮插件生成的代码块图片后，运行此脚本打开样式配置面板。
features:
  - 悬浮面板 UI，支持拖拽和即时预览
  - 设置高亮语言（language）、主题（theme）、嵌入字体以及字号
  - 提供常用语言快速匹配列表，支持保存为全局默认配置
dependencies:
  - 依赖 CodeHighlight-Engine 底层引擎完成重新渲染
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_saved: "✅ 已保存为全局默认代码样式",
    panel_title: "🎨 代码高亮设置",
    row_lang: "代码语言",
    row_pool: "高频识别池",
    theme_dark: "🌙 暗色主题",
    theme_light: "☀️ 亮色主题",
    row_theme: "高亮主题",
    row_font: "字体/字号",
    row_embed: "SVG嵌入字体",
    btn_save_default: "设为全局默认",
    btn_done: "完成"
  },
  en: {
    notice_saved: "✅ Saved as global default code style",
    panel_title: "🎨 Code Highlight Settings",
    row_lang: "Language",
    row_pool: "Detection Pool",
    theme_dark: "🌙 Dark Theme",
    theme_light: "☀️ Light Theme",
    row_theme: "Theme",
    row_font: "Font/Size",
    row_embed: "Embed SVG Font",
    btn_save_default: "Save as Default",
    btn_done: "Done"
  }
};
const { Notice } = ea.obsidian;

ExcalidrawAutomate.plugin.settings.scriptEngineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings || {};
let defaultSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["codeHighlight"] ?? {
    theme: "atom-one-dark", 
    embedFont: true, 
    fontFamily: 3, 
    fontSize: 16,
    commonLangs: ["javascript", "typescript", "python", "java", "cpp", "sql", "xml", "json", "bash", "verilog", "gdscript"]
};

// 抓取当前选中目标状态
const selectedEls = ea.getViewSelectedElements().filter(el => el.customData?.codeHighlight);
let currentSettings = { ...defaultSettings };
if (selectedEls.length > 0) {
    const target = selectedEls[0];
    currentSettings.theme = target.customData.codeHighlight.style || defaultSettings.theme;
    currentSettings.embedFont = target.customData.codeHighlight.embedFont ?? defaultSettings.embedFont;
    currentSettings.fontFamily = target.fontFamily;
    currentSettings.fontSize = target.fontSize;
    // 新增：读取当前代码块的语言
    currentSettings.language = target.customData.codeHighlight.language || "plaintext";
}

async function applyToSelected() {
    if (selectedEls.length === 0) return;
    const api = ea.getExcalidrawAPI();
    selectedEls.forEach((el) => {
        el.fontFamily = currentSettings.fontFamily;
        el.fontSize = currentSettings.fontSize;
        api.ShapeCache?.cache?.delete(el);
        el.customData.codeHighlight.style = currentSettings.theme;
        el.customData.codeHighlight.embedFont = currentSettings.embedFont;
        // 新增：将修改后的语言写入元素数据
        el.customData.codeHighlight.language = currentSettings.language;
    });
    ea.copyViewElementsToEAforEditing(selectedEls);
    await ea.addElementsToView();
    await ea.viewUpdateScene({ appState: { zoom: { value: api.getAppState().zoom.value + 0.00001 } } });
}

function saveAsDefault() {
    // 保存全局默认时不包含 language，因为每个代码块语言不同
    const { language, ...settingsToSave } = currentSettings;
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["codeHighlight"] = settingsToSave;
    ExcalidrawAutomate.plugin.saveSettings();
    new Notice(t("notice_saved"));
}

function createFloatingPanel() {
    if (document.getElementById("ea-code-style-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-code-style-panel";
    panel.style.cssText = `position:fixed; top:120px; right:80px; width:290px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    // 头部拖拽区
    const header = document.createElement('div');
    header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${t("panel_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer;">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;

    const createRow = (label, element) => {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
        const lbl = document.createElement('label');
        lbl.innerText = label;
        lbl.style.cssText = "font-size:13px; color:var(--text-normal);";
        div.appendChild(lbl); div.appendChild(element);
        return div;
    };

    // === 新增：语言选择 ===
    const langSelect = document.createElement('select');
    langSelect.style.cssText = "width:130px; background:var(--background-modifier-form-field); border-radius:4px; padding:4px;";
    const langs = getLanguages();
    // 提取所有支持的语言并按首字母排序
    Object.keys(langs).sort().forEach(key => {
        const val = langs[key];
        if (!val) return; // 过滤掉不支持的空字符串
        
        const opt = document.createElement('option');
        opt.value = val; 
        opt.innerText = key;
        if (currentSettings.language === val) opt.selected = true;
        langSelect.appendChild(opt);
    });
    langSelect.onchange = (e) => { 
        currentSettings.language = e.target.value; 
        window._ea_last_code_lang = e.target.value; // 修改面板也能记忆到内存中
        applyToSelected(); 
    };
    content.appendChild(createRow(t("row_lang"), langSelect));
    // =====================

    const commonLangsInput = document.createElement('input');
    commonLangsInput.type = "text";
    commonLangsInput.style.cssText = "width:130px; background:var(--background-modifier-form-field); border-radius:4px; padding:4px; font-size:11px;";
    commonLangsInput.value = currentSettings.commonLangs.join(",");
    commonLangsInput.title = "用逗号分隔的常用语言白名单";
    commonLangsInput.onchange = (e) => { 
        // 自动切分逗号并去除空格与空项
        currentSettings.commonLangs = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
    };
    content.appendChild(createRow(t("row_pool"), commonLangsInput));

    // 主题
    const themeSelect = document.createElement('select');
    themeSelect.style.cssText = "width:130px; background:var(--background-modifier-form-field); border-radius:4px; padding:4px;";
    ['atom-one-dark', 'atom-one-light'].forEach(themeKey => {
        const opt = document.createElement('option');
        opt.value = themeKey; opt.innerText = themeKey.includes('dark') ? t("theme_dark") : t("theme_light");
        if (currentSettings.theme === themeKey) opt.selected = true;
        themeSelect.appendChild(opt);
    });
    themeSelect.onchange = (e) => { currentSettings.theme = e.target.value; applyToSelected(); };
    content.appendChild(createRow(t("row_theme"), themeSelect));

    // 字体字号
    const fontWrapper = document.createElement('div');
    fontWrapper.style.cssText = "display:flex; gap:6px;";
    const fontSelect = document.createElement('select');
    fontSelect.style.cssText = "width:80px; background:var(--background-modifier-form-field); border-radius:4px;";
    [{v:3, l:"Cascadia"}, {v:1, l:"Virgil"}, {v:2, l:"Helvetica"}].forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.v; opt.innerText = f.l;
        if (currentSettings.fontFamily === f.v) opt.selected = true;
        fontSelect.appendChild(opt);
    });
    fontSelect.onchange = (e) => { currentSettings.fontFamily = Number(e.target.value); applyToSelected(); };
    
    const sizeInput = document.createElement('input');
    sizeInput.type = "number"; sizeInput.style.cssText = "width:45px; text-align:center;";
    sizeInput.value = currentSettings.fontSize;
    sizeInput.onchange = (e) => { currentSettings.fontSize = Number(e.target.value); applyToSelected(); };
    
    fontWrapper.appendChild(fontSelect); fontWrapper.appendChild(sizeInput);
    content.appendChild(createRow(t("row_font"), fontWrapper));

    // 嵌入字体开关
    const embedCheck = document.createElement('input');
    embedCheck.type = "checkbox";
    embedCheck.checked = currentSettings.embedFont;
    embedCheck.onchange = (e) => { currentSettings.embedFont = e.target.checked; applyToSelected(); };
    content.appendChild(createRow(t("row_embed"), embedCheck));

    panel.appendChild(content);

    // 底部按钮
    const footer = document.createElement('div');
    footer.style.cssText = `padding:10px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:space-between;`;
    const btnSave = document.createElement('button');
    btnSave.innerText = t("btn_save_default"); btnSave.onclick = saveAsDefault;
    const btnClose = document.createElement('button');
    btnClose.innerText = t("btn_done"); btnClose.className = "mod-cta"; btnClose.onclick = () => panel.remove();
    footer.appendChild(btnSave); footer.appendChild(btnClose);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽逻辑
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}
createFloatingPanel();

// --- 依赖数据 ---
// 用于生成语言下拉列表的字典，已过滤不支持的空语言
function getLanguages() {
    return {
        "1C": "1c",
        "ABNF": "abnf",
        "Access logs": "accesslog",
        "Ada": "ada",
        "Arduino": "arduino",
        "ARM assembler": "armasm",
        "AVR assembler": "avrasm",
        "ActionScript": "actionscript",
        "AngelScript": "angelscript",
        "Apache": "apache",
        "AppleScript": "applescript",
        "Arcade": "arcade",
        "AsciiDoc": "asciidoc",
        "AspectJ": "aspectj",
        "AutoHotkey": "autohotkey",
        "AutoIt": "autoit",
        "Awk": "awk",
        "Bash": "bash",
        "Basic": "basic",
        "BNF": "bnf",
        "Brainfuck": "brainfuck",
        "C#": "cs",
        "C": "c",
        "C++": "cpp",
        "C/AL": "cal",
        "Cache Object Script": "cos",
        "CMake": "cmake",
        "COBOL": "cobol",
        "Coq": "coq",
        "CSP": "csp",
        "CSS": "css",
        "Cap’n Proto": "capnproto",
        "Clojure": "clojure",
        "CoffeeScript": "coffeescript",
        "Crmsh": "crmsh",
        "Crystal": "crystal",
        "D": "d",
        "Dart": "dart",
        "Delphi": "delphi",
        "Diff": "diff",
        "Django": "django",
        "DNS Zone file": "dns",
        "Dockerfile": "dockerfile",
        "DOS": "dos",
        "dsconfig": "dsconfig",
        "DTS (Device Tree)": "dts",
        "Dust": "dust",
        "EBNF": "ebnf",
        "Elixir": "elixir",
        "Elm": "elm",
        "Erlang": "erlang",
        "Excel": "excel",
        "F#": "fsharp",
        "FIX": "fix",
        "Flix": "flix",
        "Fortran": "fortran",
        "G-Code": "gcode",
        "Gams": "gams",
        "GAUSS": "gauss",
        "GDScript": "gdscript",
        "Gherkin": "gherkin",
        "Go": "go",
        "Golo": "golo",
        "Gradle": "gradle",
        "Groovy": "groovy",
        "HTML, XML": "xml",
        "HTTP": "http",
        "Haml": "haml",
        "Handlebars": "handlebars",
        "Haskell": "haskell",
        "Haxe": "haxe",
        "Hy": "hy",
        "Ini, TOML": "ini",
        "Inform7": "inform7",
        "IRPF90": "irpf90",
        "JSON": "json",
        "Java": "java",
        "JavaScript": "javascript",
        "Julia": "julia",
        "Julia REPL": "julia-repl",
        "Kotlin": "kotlin",
        "LaTeX": "tex",
        "Leaf": "leaf",
        "Lasso": "lasso",
        "Less": "less",
        "LDIF": "ldif",
        "Lisp": "lisp",
        "LiveCode Server": "livecodeserver",
        "LiveScript": "livescript",
        "Lua": "lua",
        "Makefile": "makefile",
        "Markdown": "markdown",
        "Mathematica": "mathematica",
        "Matlab": "matlab",
        "Maxima": "maxima",
        "Maya Embedded Language": "mel",
        "Mercury": "mercury",
        "MIPS Assembler": "mipsasm",
        "Mizar": "mizar",
        "Mojolicious": "mojolicious",
        "Monkey": "monkey",
        "Moonscript": "moonscript",
        "N1QL": "n1ql",
        "NSIS": "nsis",
        "Nginx": "nginx",
        "Nim": "nimrod",
        "Nix": "nix",
        "OCaml": "ocaml",
        "Objective C": "objectivec",
        "OpenGL Shading Language": "glsl",
        "OpenSCAD": "openscad",
        "Oracle Rules": "ruleslanguage",
        "Oxygene": "oxygene",
        "PF": "pf",
        "PHP": "php",
        "Parser3": "parser3",
        "Perl": "perl",
        "Plaintext": "plaintext",
        "Pony": "pony",
        "PostgreSQL": "pgsql",
        "PowerShell": "powershell",
        "Processing": "processing",
        "Prolog": "prolog",
        "Properties": "properties",
        "Protocol Buffers": "protobuf",
        "Puppet": "puppet",
        "Python": "python",
        "Python profiler": "profile",
        "Q": "q",
        "QML": "qml",
        "R": "r",
        "ReasonML": "reasonml",
        "RenderMan RIB": "rib",
        "RenderMan RSL": "rsl",
        "RISC-V Assembly": "riscv",
        "Roboconf": "roboconf",
        "Ruby": "ruby",
        "Rust": "rust",
        "SAS": "sas",
        "SCSS": "scss",
        "SQL": "sql",
        "STEP Part 21": "step21",
        "Scala": "scala",
        "Scheme": "scheme",
        "Scilab": "scilab",
        "Shell": "shell",
        "Smali": "smali",
        "Smalltalk": "smalltalk",
        "SML": "sml",
        "Stan": "stan",
        "Stata": "stata",
        "Stylus": "stylus",
        "SubUnit": "subunit",
        "Swift": "swift",
        "Tcl": "tcl",
        "Test Anything": "tap",
        "Thrift": "thrift",
        "TP": "tp",
        "Twig": "twig",
        "TypeScript": "typescript",
        "VB.Net": "vbnet",
        "VBScript": "vbscript",
        "VHDL": "vhdl",
        "Vala": "vala",
        "Verilog": "verilog",
        "Vim Script": "vim",
        "x86 Assembly": "x86asm",
        "XL": "xl",
        "XQuery": "xquery",
        "YAML": "yaml",
        "Zephir": "zephir"
    };
}