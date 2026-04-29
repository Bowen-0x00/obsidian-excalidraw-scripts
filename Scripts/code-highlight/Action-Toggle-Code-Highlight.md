---
name: 切换代码高亮
description: 选中文本，自动识别语言并应用高亮；若已高亮则取消。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的一个或多个文本元素，点击运行脚本。如果是普通文本，将自动识别语言并转换为代码高亮图片；如果是已高亮的图片，将恢复为普通文本。
features:
  - 自动识别多种主流编程语言，或通过弹窗手动选择语言
  - 切换时自动添加或移除 customData.codeHighlight 数据
  - 支持调用内置引擎将文本渲染为带语法高亮、主题配色的 SVG 矢量图片
dependencies:
  - 依赖 Feature-CodeHighlight-Engine 底层引擎完成重绘和渲染
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select_text: "请先选中需要高亮的文本元素！",
    notice_cancelled: "⭕ 已取消代码高亮",
    log_auto_detect_error: "[Auto-Detect] HLJS 识别抛出异常",
    notice_detected: "🤖 自动识别为: {lang}",
    notice_last_lang: "🧠 使用上次识别/选择的语言: {lang}",
    suggester_manual: "无法自动识别，请手动选择语言",
    notice_not_supported: "该语言暂不支持！"
  },
  en: {
    notice_select_text: "Please select a text element first!",
    notice_cancelled: "⭕ Code highlight cancelled",
    log_auto_detect_error: "[Auto-Detect] HLJS identification failed",
    notice_detected: "🤖 Detected as: {lang}",
    notice_last_lang: "🧠 Using last detected/selected language: {lang}",
    suggester_manual: "Detection failed, please select language manually",
    notice_not_supported: "Language not supported yet!"
  }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select_text"));
    return;
}

// 1. 若已高亮，则取消
if (selectedEls[0]?.customData?.codeHighlight) {
    selectedEls.forEach((el) => {
        api.ShapeCache?.cache?.delete(el);
        delete el.customData.codeHighlight;
    });
    ea.copyViewElementsToEAforEditing(selectedEls);
    await ea.addElementsToView();
    new Notice(t("notice_cancelled"));
    return;
}

ExcalidrawAutomate.plugin.settings.scriptEngineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings || {};
let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["codeHighlight"] ?? {};
settings = {
    theme: settings.theme || "atom-one-dark",
    embedFont: settings.embedFont ?? true,
    fontFamily: settings.fontFamily || 3,
    fontSize: settings.fontSize || 16,
    commonLangs: settings.commonLangs || ["javascript", "typescript", "python", "java", "cpp", "sql", "xml", "json", "bash", "verilog", "gdscript"]
};

function guessLanguage(text) {
    if (!text) return null;

    if (window.hljs && typeof window.hljs.highlightAuto === 'function') {
        try {
            const detected = window.hljs.highlightAuto(text, settings.commonLangs).language;
            if (detected) return detected;
        } catch (e) {
            console.warn(t("log_auto_detect_error"), e);
        }
    }

    const scores = { xml: 0, javascript: 0, python: 0, cpp: 0, java: 0, sql: 0, verilog: 0, gdscript: 0 };
    if (/<(html|div|span|svg|xml)/i.test(text)) scores.xml += 10;
    if (/(const |let |=>|console\.log|document\.)/.test(text)) scores.javascript += 10;
    if (/(def |from .* import |print\(|elif |yield |pass\n)/.test(text)) scores.python += 10;
    if (/(#include |int main|std::|cout|cin|printf)/.test(text)) scores.cpp += 10;
    if (/(public class |public static void main|System\.out\.println)/.test(text)) scores.java += 10;
    if (/(SELECT |UPDATE |INSERT |DELETE |FROM |WHERE |JOIN )/i.test(text)) scores.sql += 10;
    if (/(always_ff|always_comb|module |endmodule|input wire|output reg|logic )/.test(text)) scores.verilog += 10;
    if (/(func |extends Node|onready |@export)/.test(text)) scores.gdscript += 10;

    let maxLang = null, maxScore = 0;
    for (const [lang, score] of Object.entries(scores)) {
        if (score > maxScore) { maxScore = score; maxLang = lang; }
    }
    return maxScore >= 5 ? maxLang : null;
}

let finalLangVal = guessLanguage(selectedEls[0].text);

if (finalLangVal) {
    new Notice(t("notice_detected", { lang: finalLangVal }));
} else if (window._ea_last_code_lang) {
    // 【方法二】：自动识别失败时，直接使用存储在内存中的上一次语言
    finalLangVal = window._ea_last_code_lang;
    new Notice(t("notice_last_lang", { lang: finalLangVal }));
} else {
    // 如果既没识别出来，内存里也没有记录（说明是本次打开软件的第一次使用），则弹出选择器
    let languageKeys = Object.keys(getLanguages());
    const choiceLabel = await utils.suggester(languageKeys, languageKeys, t("suggester_manual"));
    if (!choiceLabel) return;
    finalLangVal = getLanguages()[choiceLabel];
}

if (finalLangVal.startsWith("//")) return new Notice(t("notice_not_supported"));

window._ea_last_code_lang = finalLangVal;

selectedEls.forEach((el) => {
    el.fontFamily = settings.fontFamily;
    el.fontSize = settings.fontSize;
    api.ShapeCache?.cache?.delete(el);
    el.customData = {
        ...el.customData,
        codeHighlight: { language: finalLangVal, style: settings.theme, embedFont: settings.embedFont }
    };
});

ea.copyViewElementsToEAforEditing(selectedEls);
ea.addElementsToView();
setTimeout(() => {
    ea.viewUpdateScene({ appState: { zoom: { value: api.getAppState().zoom.value + 0.00001 } } });
}, 0);







function getLanguages() {
    return {
        "1C": "1c",
        "4D": "",
        "ABAP": "",
        "ABNF": "abnf",
        "Access logs": "accesslog",
        "Ada": "ada",
        "Apex": "",
        "Arduino (C++ w/Arduino libs)": "arduino",
        "ARM assembler": "armasm",
        "AVR assembler": "avrasm",
        "ActionScript": "actionscript",
        "Alan IF": "",
        "Alan": "",
        "AngelScript": "angelscript",
        "Apache": "apache",
        "AppleScript": "applescript",
        "Arcade": "arcade",
        "AsciiDoc": "asciidoc",
        "AspectJ": "aspectj",
        "AutoHotkey": "autohotkey",
        "AutoIt": "autoit",
        "Awk": "awk",
        "Ballerina": "",
        "Bash": "bash",
        "Basic": "basic",
        "BBCode": "",
        "Blade (Laravel)": "",
        "BNF": "bnf",
        "BQN": "",
        "Brainfuck": "brainfuck",
        "C#": "cs",
        "C": "c",
        "C++": "cpp",
        "C/AL": "cal",
        "C3": "",
        "Cache Object Script": "cos",
        "Candid": "",
        "CMake": "cmake",
        "COBOL": "cobol",
        "Coq": "coq",
        "CSP": "csp",
        "CSS": "css",
        "Cap’n Proto": "capnproto",
        "Chaos": "",
        "Chapel": "",
        "Cisco CLI": "",
        "Clojure": "clojure",
        "CoffeeScript": "coffeescript",
        "CpcdosC+": "",
        "Crmsh": "crmsh",
        "Crystal": "crystal",
        "cURL": "",
        "Cypher (Neo4j)": "",
        "D": "d",
        "Dafny": "",
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
        "Dylan": "",
        "EBNF": "ebnf",
        "Elixir": "elixir",
        "Elm": "elm",
        "Erlang": "erlang",
        "Excel": "excel",
        "Extempore": "",
        "F#": "fsharp",
        "FIX": "fix",
        "Flix": "flix",
        "Fortran": "fortran",
        "FunC": "",
        "G-Code": "gcode",
        "Gams": "gams",
        "GAUSS": "gauss",
        "GDScript": "gdscript",
        "Gherkin": "gherkin",
        "Glimmer and EmberJS": "",
        "GN for Ninja": "",
        "Go": "go",
        "Grammatical Framework": "",
        "Golo": "golo",
        "Gradle": "gradle",
        "GraphQL": "",
        "Groovy": "groovy",
        "GSQL": "",
        "HTML, XML": "xml",
        "HTTP": "http",
        "Haml": "haml",
        "Handlebars": "handlebars",
        "Haskell": "haskell",
        "Haxe": "haxe",
        "High-level shader language": "",
        "Hy": "hy",
        "Ini, TOML": "ini",
        "Inform7": "inform7",
        "IRPF90": "irpf90",
        "Iptables": "",
        "JSON": "json",
        "Java": "java",
        "JavaScript": "javascript",
        "Jolie": "",
        "Julia": "julia",
        "Julia REPL": "julia-repl",
        "Kotlin": "kotlin",
        "Lang": "",
        "LaTeX": "tex",
        "Leaf": "leaf",
        "Lean": "",
        "Lasso": "lasso",
        "Less": "less",
        "LDIF": "ldif",
        "Lisp": "lisp",
        "LiveCode Server": "livecodeserver",
        "LiveScript": "livescript",
        "LookML": "",
        "Lua": "lua",
        "Macaulay2": "",
        "Makefile": "makefile",
        "Markdown": "markdown",
        "Mathematica": "mathematica",
        "Matlab": "matlab",
        "Maxima": "maxima",
        "Maya Embedded Language": "mel",
        "Mercury": "mercury",
        "MIPS Assembler": "mipsasm",
        "Mint": "",
        "mIRC Scripting Language": "",
        "Mizar": "mizar",
        "MKB": "",
        "MLIR": "",
        "Mojolicious": "mojolicious",
        "Monkey": "monkey",
        "Moonscript": "moonscript",
        "Motoko": "",
        "N1QL": "n1ql",
        "NSIS": "nsis",
        "Never": "",
        "Nginx": "nginx",
        "Nim": "nimrod",
        "Nix": "nix",
        "Oak": "",
        "Object Constraint Language": "",
        "OCaml": "ocaml",
        "Objective C": "objectivec",
        "OpenGL Shading Language": "glsl",
        "OpenSCAD": "openscad",
        "Oracle Rules Language": "ruleslanguage",
        "Oxygene": "oxygene",
        "PF": "pf",
        "PHP": "php",
        "Papyrus": "",
        "Parser3": "parser3",
        "Perl": "perl",
        "Pine Script": "",
        "Plaintext": "plaintext",
        "Pony": "pony",
        "PostgreSQL &amp; PL/pgSQL": "pgsql",
        "PowerShell": "powershell",
        "Processing": "processing",
        "Prolog": "prolog",
        "Properties": "properties",
        "Protocol Buffers": "protobuf",
        "Puppet": "puppet",
        "Python": "python",
        "Python profiler results": "profile",
        "Python REPL": "",
        "Q#": "",
        "Q": "q",
        "QML": "qml",
        "R": "r",
        "Razor CSHTML": "",
        "ReasonML": "reasonml",
        "Rebol &amp; Red": "",
        "RenderMan RIB": "rib",
        "RenderMan RSL": "rsl",
        "RiScript": "",
        "RISC-V Assembly": "riscv",
        "Roboconf": "roboconf",
        "Robot Framework": "",
        "RPM spec files": "",
        "Ruby": "ruby",
        "Rust": "rust",
        "RVT Script": "",
        "SAS": "sas",
        "SCSS": "scss",
        "SQL": "sql",
        "STEP Part 21": "step21",
        "Scala": "scala",
        "Scheme": "scheme",
        "Scilab": "scilab",
        "SFZ": "",
        "Shape Expressions": "",
        "Shell": "shell",
        "Smali": "smali",
        "Smalltalk": "smalltalk",
        "SML": "sml",
        "Solidity": "",
        "Splunk SPL": "",
        "Stan": "stan",
        "Stata": "stata",
        "Structured Text": "",
        "Stylus": "stylus",
        "SubUnit": "subunit",
        "Supercollider": "",
        "Svelte": "",
        "Swift": "swift",
        "Tcl": "tcl",
        "Terraform (HCL)": "",
        "Test Anything Protocol": "tap",
        "Thrift": "thrift",
        "Toit": "",
        "TP": "tp",
        "Transact-SQL": "",
        "Twig": "twig",
        "TypeScript": "typescript",
        "Unicorn Rails log": "",
        "VB.Net": "vbnet",
        "VBA": "",
        "VBScript": "vbscript",
        "VHDL": "vhdl",
        "Vala": "vala",
        "Verilog": "verilog",
        "Vim Script": "vim",
        "X#": "",
        "X++": "",
        "x86 Assembly": "x86asm",
        "x86 Assembly (AT&amp;T)": "",
        "XL": "xl",
        "XQuery": "xquery",
        "YAML": "yaml",
        "ZenScript": "",
        "Zephir": "zephir"
    }
};
