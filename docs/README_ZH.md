# Obsidian-Excalidraw-ymjr

[English](../README.md) | [简体中文](./README_ZH.md)

这是我的[obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin)的自定义脚本仓库。

实现了很多实用/有趣的功能，以提高使用excalidraw的体验

部分脚本依赖于我对obsidian-excalidraw的[修改版本](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr)，部分不需要任何依赖。

我打包了一个obsidian 示例库 [obsidian-excalidraw-example-vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault), 其中包含了修改后的插件和很多自定义脚本，以及一些用于演示功能的excalidraw画布。你可以直接用obsidian打开然后体验功能。
你也可以看[视频](https://www.bilibili.com/video/BV1zN4y1H7Dx/) 快速了解其中的部分功能。


## 特性&功能 (上传中...)

|feature|scripts|image|
|---|---|---|
|思维导图| - [autorun-_renderInteractiveScene_Hook](../Scripts/Encrypted/autorun-_renderInteractiveScene_Hook.md) </br> - [autorun-deleteSelectedElementsHook](../Scripts/Encrypted/autorun-deleteSelectedElementsHook.md) </br> - [autorun-handleCanvasPointerUp_Hook](../Scripts/Encrypted/autorun-handleCanvasPointerUp_Hook.md)  </br> - [autorun-onKeyDownHook](../Scripts/Encrypted/autorun-onKeyDownHook.md) </br> - [autorun-onPointerDownHook](../Scripts/Encrypted/autorun-onPointerDownHook.md) </br> - [_autorun-utils](../Scripts/Encrypted/_autorun-utils.md) </br> - [add mind map](../Scripts/Encrypted/add%20mind%20map.md) </br> - [Mindmap format2](../Scripts/Encrypted/Mindmap%20format2.md) </br> - [clear ea Mindmap](../Scripts/Encrypted/clear%20ea%20Mindmap.md) </br> - [replace mindmap node](../Scripts/Encrypted/replace%20mindmap%20node.md)| <img src="../images/mindmap2.gif"> </br> <img src="../images/mindmap2 - mobile.gif"> |
|md <=> ex思维导图| - [export mindmap to md](../Scripts/Encrypted/export%20mindmap%20to%20md.md) </br> - [tp.excalidraw.mindmap](../Templaters/tp.excalidraw.mindmap.md)| <img src="../images/md ex mindmap.gif">|
|转换连接为直角连接| [convert line to Right-angle.md](../Scripts/convert%20line%20to%20Right-angle.md) | <img src="../images/right%20angle.gif" alt="Image" >|
|转换连接为直角连接 (圆角边)| [convert connection shape to elbow.md](../Scripts/Encrypted/convert%20connection%20shape%20to%20elbow.md) | <img src="../images/Convert connection to elbow.gif" alt="Image" >|
用kanban显示frame为大纲|[show outline by frame - kanban.md](../Scripts/show%20outline%20by%20frame%20-%20kanban.md)|<img src="../images/kanban.gif" alt="Image" >|
|设置箭头类型| [Set arrow type.md](../Scripts/Set%20arrow%20type.md) | <img src="../images/arrow type2.gif" alt="Image" >|
|插入垂直间隔 | [insert vertical space.md](../Scripts/insert%20vertical%20space.md) | <img src="../images/insert vertical space.gif" alt="Image" >|
|插入垂直间隔 (宽度范围) | [insert vertical space with width.md](../Scripts/insert%20vertical%20space%20with%20width.md) | <img src="../images/insert vertical space.gif" alt="Image" >|
|增加图片到当前画布|[add image server.md](../Scripts/add%20image%20server.md)| <img src="../images/add image by server1.gif" alt="Image" >|
|x方向顺序连接元素|[connect elements sequece by x](../Scripts/Connect%20elements%20sequence%20by%20x.md)|<img src="../images/connect elements sequece by x.gif" alt="Image" >|
|y方向顺序连接元素|[connect elements sequece by y](../Scripts/Connect%20elements%20sequence%20by%20x.md)|<img src="../images/connect elements sequece by y.gif" alt="Image" >|
|连接元素为思维导图结构|[connect elements sequece by y](../Scripts/Connect%20elements_by_x.md)|<img src="../images/connect elements by x - mindmap.gif" alt="Image" >|
|按需加载library|[load more library](../Scripts/Encrypted/load%20more%20library.md)|<img src="../images/library1.gif" alt="Image" ><img src="../images/library2.gif" alt="Image" >|
|自定义形状箭头拉伸|- [add fixed and dragable for line](../Scripts/Encrypted/add%20fixed%20and%20dragable%20for%20line.md)</br>- [autorun-handlePointDraggingHook](../Scripts/Encrypted/autorun-handlePointDraggingHook.md)|<img src="../images/fixedDragable.gif" alt="Image" >|
| 显示/隐藏细节 |- [add detail - detail](../Scripts/Encrypted/add%20detial%20-%20detail.md)</br>- [add detail - target](../Scripts/Encrypted/add%20detial%20-%20target.md)</br>- [autorun-handleCanvasPointerUp_detail_Hook](../Scripts/Encrypted/autorun-handleCanvasPointerUp_detail_Hook.md)|<img src="../images/detail2.gif" alt="Image" >|
| 自动连接功能 (直角连接、附着到连接点) |- [autorun-binding](../Scripts/Encrypted/autorun-binding.md)</br>- [_autorun-utils](../Scripts/Encrypted/_autorun-utils.md)</br>- [switch connection shape](../Scripts/Encrypted/switch%20connection%20shape.md) </br>- [autorun-dragSelectedElementsHook](../Scripts/Encrypted/autorun-dragSelectedElementsHook.md)</br>- [autorun-handlePointDraggingHook](../Scripts/Encrypted/autorun-handlePointDraggingHook.md)</br>- [autorun-maybeBindLinearElement_Hook](../Scripts/Encrypted/autorun-maybeBindLinearElement_Hook.md)</br>- [autorun-updateBoundPoint_Hook](../Scripts/Encrypted/autorun-updateBoundPoint_Hook.md)|<img src="../images/switch connection shape2.gif" alt="Image" > </br> <img src="../images/curve.gif" alt="Image" >|
| 代码语法高亮 |- [mark as code](../Scripts/Encrypted/mark%20as%20code.md)</br>- [autorun-drawElementOnCanvasHook](../Scripts/Encrypted/autorun-drawElementOnCanvasHook.md)</br>- [_autorun-utils](../Scripts/Encrypted/_autorun-utils.md)|<img src="../images/code.gif" alt="Image" >|
| 展开/折叠元素  |- [add collapse by line](../Scripts/Encrypted/add%20collapse%20by%20line.md)</br>- [autorun-onPointerDownHook](../Scripts/Encrypted/autorun-onPointerDownHook.md)|<img src="../images/collapse.gif" alt="Image" >|
| echarts  |- [insert echarts](../Scripts/Encrypted/insert%20echarts.md)</br>- [convert text to echarts](../Scripts/Encrypted/convert%20text%20to%20echarts.md) </br>- [switch echarts type](../Scripts/Encrypted/switch%20echarts%20type.md) </br>- [autorun-onPasteHook](../Scripts/Encrypted/autorun-onPasteHook.md) </br>- [autorun-renderCustomDocument](../Scripts/Encrypted/autorun-renderCustomDocument.md)|<img src="../images/echarts.gif" >|
| 导出svg时渲染本地md、代码高亮、echarts  |- [autorun-renderElementToSvg_Hook](../Scripts/Encrypted/autorun-renderElementToSvg_Hook.md)</br>|<img src="../images/export svg.gif" alt="Image" >|
| 箭头和形状流动动画  |- [add animation for line](../Scripts/Encrypted/add%20animation%20for%20line.md)</br> - [autorun-drawElementFromCanvasHook](../Scripts/Encrypted/autorun-drawElementFromCanvasHook.md)</br> - [remove animation](../Scripts/Encrypted/remove%20animation.md)</br> - [autorun-deleteSelectedElementsHook](../Scripts/Encrypted/autorun-deleteSelectedElementsHook.md)|<img src="../images/arrow flow animation.gif" alt="Image" >|

你可以查看演示和更多细节在:
- 我的[B站空间](https://space.bilibili.com/39231346/)

## 问题、反馈、创意
欢迎联系我，如果：
- 遇到使用问题
- 建议与反馈
- 交流沟通有趣的想法、新的feature

沟通渠道可以是：
- github issue
- 邮件
- B站留言或私信
- 我的个人联系方式 (微信、qq)

## 赞助
如果你觉得我做的这些修改对你有所帮助，欢迎评论、留言。

你也可以赞助我一杯咖啡：
- 微信赞助码 
  <img src="../images/赞助码.jpg" width="200px">
- ko-fi
  <a href='https://ko-fi.com/G2G3SY16R' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## 感谢
感谢[zsviczian](https://github.com/zsviczian)和[obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin)的其他贡献者

感谢[excalidraw](https://github.com/excalidraw/excalidraw)的贡献者
