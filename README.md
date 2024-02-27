# Obsidian-Excalidraw-Scripts

[English](./README.md) | [简体中文](docs/README_ZH.md)

This is my personal repository of [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) custom scripts.

It implements many useful/interesting features to enhance the experience of using Excalidraw.

Some scripts rely on [modified version](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr) to Obsidian-Excalidraw, while others don't require any dependencies.

You can find the demo obsidian vault at [obsidian-excalidraw-example-vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault), that includes the modified plugin and many custom scripts. You can directly open it with Obsidian and experience the features. Here is a demonstration [video](https://www.bilibili.com/video/BV1zN4y1H7Dx/). 


## Features (Uploading...)

|feature|scripts|image|
|---|---|---|
|mindmap| - [autorun-_renderInteractiveScene_Hook](Scripts/Encrypted/autorun-_renderInteractiveScene_Hook.md) </br> - [autorun-deleteSelectedElementsHook](Scripts/Encrypted/autorun-deleteSelectedElementsHook.md) </br> - [autorun-handleCanvasPointerUp_Hook](Scripts/Encrypted/autorun-handleCanvasPointerUp_Hook.md)  </br> - [autorun-onKeyDownHook](Scripts/Encrypted/autorun-onKeyDownHook.md) </br> - [autorun-onPointerDownHook](Scripts/Encrypted/autorun-onPointerDownHook.md) </br> - [_autorun-utils](Scripts/Encrypted/_autorun-utils.md) </br> - [add mind map](Scripts/Encrypted/add%20mind%20map.md) </br> - [Mindmap format2](Scripts/Encrypted/Mindmap%20format2.md) </br> - [clear ea Mindmap](Scripts/Encrypted/clear%20ea%20Mindmap.md) </br> - [replace mindmap node](Scripts/Encrypted/replace%20mindmap%20node.md)| <img src="images/mindmap2.gif"> </br> <img src="images/mindmap2 - mobile.gif"> |
|md <=> ex mindmap | - [export mindmap to md](Scripts/Encrypted/export%20mindmap%20to%20md.md) </br> - [tp.excalidraw.mindmap](Templaters/tp.excalidraw.mindmap.md)| <img src="images/md ex mindmap.gif">|
|Convert line and arrow to right angle| [convert line to Right-angle.md](Scripts/convert%20line%20to%20Right-angle.md) | <img src="images/right%20angle.gif" alt="Image" >|
|Convert line and arrow to elbow (round edge)| [convert connection shape to elbow.md](Scripts/Encrypted/convert%20connection%20shape%20to%20elbow.md) | <img src="images/Convert connection to elbow.gif" alt="Image" >|
|Show outline by kanban|[show outline by frame - kanban.md](Scripts/show%20outline%20by%20frame%20-%20kanban.md)|<img src="images/kanban.gif" alt="Image" >|
|Set arrow head| [Set arrow type.md](Scripts/Set%20arrow%20type.md) | <img src="images/arrow type2.gif" alt="Image" >|
| Insert vertical space | [insert vertical space.md](Scripts/insert%20vertical%20space.md) | <img src="images/insert vertical space.gif" alt="Image" >|
| insert vertical space (limited by width) | [insert vertical space with width.md](Scripts/insert%20vertical%20space%20with%20width.md) | <img src="images/insert vertical space.gif" alt="Image" >|
| insert image to current excalidraw (http server)|[add image server.md](Scripts/add%20image%20server.md)| <img src="images/add image by server1.gif" alt="Image" >|
| Connect elements sequence in x direction |[connect elements sequece by x](Scripts/Connect%20elements%20sequence%20by%20x.md)|<img src="images/connect elements sequece by x.gif" alt="Image" >|
| Connect elements sequence in y direction |[connect elements sequece by y](Scripts/Connect%20elements%20sequence%20by%20x.md)|<img src="images/connect elements sequece by y.gif" alt="Image" >|
| Connect elements to mindmap structure |[connect elements sequece by y](Scripts/Connect%20elements_by_x.md)|<img src="images/connect elements by x - mindmap.gif" alt="Image" >|
|Library grouping & on-demand loading.|[load more library](Scripts/Encrypted/load%20more%20library.md)|<img src="images/library1.gif" alt="Image" ><img src="images/library2.gif" alt="Image" >|
| drag and stretch custom-shaped arrows while keeping the arrowhead|- [add fixed and dragable for line](Scripts/Encrypted/add%20fixed%20and%20dragable%20for%20line.md)</br>- [autorun-handlePointDraggingHook](Scripts/Encrypted/autorun-handlePointDraggingHook.md)|<img src="images/fixedDragable.gif" alt="Image" >|
| Expand/collapse details  |- [add detail - detail](Scripts/Encrypted/add%20detial%20-%20detail.md)</br>- [add detail - target](Scripts/Encrypted/add%20detial%20-%20target.md)</br>- [autorun-handleCanvasPointerUp_detail_Hook](Scripts/Encrypted/autorun-handleCanvasPointerUp_detail_Hook.md)|<img src="images/detail2.gif" alt="Image" >|
| Automatic connection feature (elbow connection, curve connection, attaching to connection points) |- [autorun-binding](Scripts/Encrypted/autorun-binding.md)</br>- [autorun-updateBoundPoint_Hook](Scripts/Encrypted/autorun-updateBoundPoint_Hook.md)</br>- [_autorun-utils](Scripts/Encrypted/_autorun-utils.md)</br>- [switch connection shape](Scripts/Encrypted/switch%20connection%20shape.md)|<img src="images/switch connection shape2.gif" alt="Image" > </br> <img src="images/curve.gif" alt="Image" >|
| Code syntax highlight |- [mark as code](Scripts/Encrypted/mark%20as%20code.md)</br>- [autorun-drawElementOnCanvasHook](Scripts/Encrypted/autorun-drawElementOnCanvasHook.md)</br>- [_autorun-utils](Scripts/Encrypted/_autorun-utils.md)|<img src="images/code.gif" alt="Image" >|
| Expand/collapse elements  |- [add collapse by line](Scripts/Encrypted/add%20collapse%20by%20line.md)</br>- [autorun-onPointerDownHook](Scripts/Encrypted/autorun-onPointerDownHook.md)|<img src="images/collapse.gif" alt="Image" >|
| echarts  |- [insert echarts](Scripts/Encrypted/insert%20echarts.md)</br>- [convert text to echarts](Scripts/Encrypted/convert%20text%20to%20echarts.md) </br>- [switch echarts type](Scripts/Encrypted/switch%20echarts%20type.md) </br>- [autorun-onPasteHook](Scripts/Encrypted/autorun-onPasteHook.md) </br>- [autorun-renderCustomDocument](Scripts/Encrypted/autorun-renderCustomDocument.md)|<img src="images/echarts.gif" >|
| Rendering local MD, code highlighting, and Echarts when exporting SVG/embedding Excalidraw into MD. |- [autorun-renderElementToSvg_Hook](Scripts/Encrypted/autorun-renderElementToSvg_Hook.md)</br>|<img src="images/export svg.gif" alt="Image" >|
| Flow animation fow arrow and shapes  |- [add animation for line](Scripts/Encrypted/add%20animation%20for%20line.md)</br> - [autorun-drawElementFromCanvasHook](Scripts/Encrypted/autorun-drawElementFromCanvasHook.md)</br> - [remove animation](Scripts/Encrypted/remove%20animation.md)</br> - [autorun-deleteSelectedElementsHook](Scripts/Encrypted/autorun-deleteSelectedElementsHook.md)|<img src="images/arrow flow animation.gif" alt="Image" >|


You can view the demonstration and more details on
- My [Bilibili Space](https://space.bilibili.com/39231346/).


## Feedback, questions, ideas, problems
Feel free to contact me if:

- You have any issues or questions regarding usage.
- You have suggestions or feedback.
- You want to discuss interesting ideas or new features.

Communication channels can be:
- GitHub issues.
- Email.
- Bilibili comments or private messages.
- My personal contact information (WeChat, QQ).


## Say Thank You
If you find the modifications I made helpful to you, feel free to leave comments and messages.

You can also sponsor me a cup of coffee:
- WeChat sponsorship code.
<img src="images/赞助码.jpg" width="200px">
- ko-fi
  <a href='https://ko-fi.com/G2G3SY16R' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## Thanks
Thanks to [zsviczian](https://github.com/zsviczian) and other contributors of [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin).

Thanks to contributors of [excalidraw](https://github.com/excalidraw/excalidraw)."