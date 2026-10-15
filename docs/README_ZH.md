# Obsidian Excalidraw Scripts

[English](../README.md) | [简体中文](./README_ZH.md)

这是 [Bowen-0x00](https://github.com/Bowen-0x00) 维护的 Excalidraw Automate 自定义脚本及素材库，**不是插件源码或插件编译产物仓库**。

- **完整脚本目录、介绍与安装按钮：**[Scripts/index.md](../Scripts/index.md)。
- **推荐宿主插件：**[Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr)。很多 Feature 引擎依赖修改版的自定义 Hook；能否用于原版插件必须逐脚本核实。
- **可直接打开的示例：**[示例 vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault)。

## 从自定义脚本市场安装

1. 安装并启用 [Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr/releases)。BRAT 和手动安装方法见插件仓库；本脚本仓库不负责安装宿主插件。
2. 在插件设置中配置脚本目录，将 **Custom script store URL** 设置为：

   ```text
   https://raw.githubusercontent.com/Bowen-0x00/obsidian-excalidraw-scripts/main/Scripts/index.md
   ```

3. 打开一个 Excalidraw 绘图，从绘图菜单或标题栏入口选择 **安装或更新 Excalidraw 脚本（自定义地址）**。普通社区脚本市场是另一份目录，不是这里的自定义市场。
4. 从分类表跳转到脚本详情，阅读说明与依赖，再点击安装按钮。自定义市场下载的脚本保存在已配置脚本目录下的 `Downloaded(Custom)/`。
5. 除 `Action-*` 操作脚本外，还要安装它依赖的 `Feature-*-Engine`。Action 执行操作；Engine 提供后台渲染或交互。启用前检查脚本元数据中的 `dependencies`、`usage` 和 `autorun`。

脚本会在 vault 内执行代码。请审查源码、备份重要绘图，并先在临时 vault 中尝试不熟悉的脚本。部分脚本会调用外部应用或服务，其安装与配置要求以对应脚本为准。

### 手动安装

从 [`Scripts/`](../Scripts/) 下载需要的 `.md` 文件，放入 Excalidraw-ymjr 设置中的脚本目录。保留文件名及同名 `.svg` 图标，并安装所需引擎。可保留分类子目录。打开绘图后，从脚本界面或已注册命令运行 Action；Engine 的加载和启动行为取决于插件及脚本元数据。

不要把仓库说明、`index.md`、`directory-info.json` 或维护工具安装成脚本。不要在不同子目录保留同一脚本的多份副本，否则命令选择和更新容易产生歧义。

## 现有能力

[脚本市场目录](../Scripts/index.md)是完整清单。代表性分类如下：

| 方向 | 脚本分类 |
| --- | --- |
| 结构化绘图 | [`mindmap`](../Scripts/mindmap/)、[`table`](../Scripts/table/)、[`swimlane`](../Scripts/swimlane/)、[`outline`](../Scripts/outline/) |
| 图形与连线 | [`generate`](../Scripts/generate/)、[`arrow`](../Scripts/arrow/)、[`brace`](../Scripts/brace/)、[`connection`](../Scripts/connection/) |
| 文字与视觉样式 | [`text`](../Scripts/text/)、[`color`](../Scripts/color/)、[`gradient`](../Scripts/gradient/)、[`shadow`](../Scripts/shadow/)、[`code-highlight`](../Scripts/code-highlight/) |
| 交互与导航 | [`hover`](../Scripts/hover/)、[`layer`](../Scripts/layer/)、[`detail`](../Scripts/detail/)、[`link`](../Scripts/link/)、[`follow`](../Scripts/follow/)、[`zoom`](../Scripts/zoom/) |
| 动画与图表 | [`animation`](../Scripts/animation/)、[`gif`](../Scripts/gif/)、[`step-appear`](../Scripts/step-appear/)、[`echarts`](../Scripts/echarts/)、[`wave-drom`](../Scripts/wave-drom/) |
| 工具与集成 | [`library`](../Scripts/library/)、[`latex`](../Scripts/latex/)、[`export`](../Scripts/export/)、[`clipboard`](../Scripts/clipboard/)、[`select`](../Scripts/select/)、[`distribute`](../Scripts/distribute/) |

[`Library/`](../Library/) 提供额外 Excalidraw 素材库。[`images/`](../images/)、[演示视频](https://www.bilibili.com/video/BV1zN4y1H7Dx/)与 [B 站空间](https://space.bilibili.com/39231346/)中的历史演示可能使用旧界面或旧文件名。安装时请以当前市场目录为准，不再使用旧版 Encrypted 脚本链接。

## 版本与更新

每个脚本在 YAML frontmatter 中单独声明 `version`，与 Excalidraw-ymjr 插件版本相互独立。排查问题时，请对照下载文件的 frontmatter 与市场详情的 Version 字段。

当前 Markdown 自定义市场通过 [`Scripts/directory-info.json`](../Scripts/directory-info.json) 中的 `fname` 和 `mtime` 判断可用更新，**不是比较语义版本号**。市场页、清单和实际脚本必须属于同一次发布。更新后重新打开自定义市场并核对安装文件，不能只凭“已是最新版本”按钮认定版本正确。

下载失败时，先检查自定义市场 URL、`raw.githubusercontent.com` 的网络连通性、宿主插件及依赖引擎版本，并排查重复安装。反馈到 [Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues) 时，请提供准确脚本文件名、脚本版本、插件版本、Obsidian 版本和复现步骤；不要上传 token 或私人 vault 内容。

## 仓库维护

公开脚本位于 `Scripts/<分类>/`。`Scripts/index.md` 会被插件读取：前半部分是分类表格，后半部分是每个脚本的详情及 `excalidraw-script-install` 安装块。`Scripts/directory-info.json` 是更新检测清单，不是插件安装 manifest。

Node.js 维护入口是 `node Scripts/get_json.js`，路径以工具自身所在目录为基准。修改脚本后重新生成清单和市场页，不手工修改生成的版本与下载 URL。遵守 `.gitignore` 并审查明确的发布文件清单，不把整个开发脚本目录直接镜像到发布仓库。测试文件、私人 prompt、凭据和 vault 状态不得发布。

## 致谢与许可

感谢 [Zsolt Viczian 及 Obsidian Excalidraw 贡献者](https://github.com/zsviczian/obsidian-excalidraw-plugin)与 [Excalidraw 贡献者](https://github.com/excalidraw/excalidraw)。保留脚本作者和许可元数据；请检查各脚本或素材声明的许可，不假设整个仓库使用统一许可。

## 反馈与支持

反馈：[GitHub Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues) 或 [B 站](https://space.bilibili.com/39231346/)。

如果这些脚本对你有帮助，可以通过 [Ko-fi](https://ko-fi.com/G2G3SY16R) 或[微信赞助码](../images/赞助码.jpg)支持维护。
