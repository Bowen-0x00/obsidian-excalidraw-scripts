---
name: 智能重复元素
description: 根据所选的最后两个相似分组，计算间距与文本变化模式，向后智能重复生成指定数量的元素群。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的最后两个具有相似结构的元素（或群组），运行脚本。在弹出的输入框中填入需要重复生成的次数。脚本会自动推断两者的位置间距和文本变化规律并进行外推。
features:
  - 基于深度优先搜索精确提取具有复杂嵌套关系的目标群组
  - 智能计算目标间的 X、Y 偏移量和文本数字的递增/递减步长
  - 新生成的阵列能保持原始的 Group 分组逻辑和容器绑定状态
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    prompt_repeat: "重复次数？",
    notice_invalid: "请输入有效的数字。",
    notice_select: "请至少选中两个可对比的群组。",
    notice_type: "所选的目标元素类型必须一致。"
  },
  en: {
    prompt_repeat: "repeat times?",
    notice_invalid: "Please enter a valid number.",
    notice_select: "Please select at least 2 comparable groups.",
    notice_type: "The selected target elements must be of the same type."
  }
};

let repeatNum = parseInt(await utils.inputPrompt(t("prompt_repeat"),"number","5"));
if(!repeatNum) {
    new Notice(t("notice_invalid"));
    return;
}

const selectedElements = ea.getViewSelectedElements();
let groups = ea.getMaximumGroups(selectedElements);
let maxLength = Math.max(...groups.map(group => group.length));
groups = groups.filter(group => group.length === maxLength);

if(groups.length < 2) {
  new Notice(t("notice_select"));
  return;
}

function findMaxWidthElement(group) {
  let maxWidthElement = group[0];
  for (let el of group) {
    if (el.width > maxWidthElement.width) {
      maxWidthElement = el;
    }
  }
  return maxWidthElement;
}

let el1 = findMaxWidthElement(groups[groups.length - 2]);
let el2 = findMaxWidthElement(groups[groups.length - 1]);

if(el1.type !== el2.type) {
    new Notice(t("notice_type"));
    return;
}

function getText(els) {
  for(let el of els) {
    if (el.type === 'text') return el.text;
  }
  return '';
}

function getSmartTextPattern(str1, str2) {
    const regex = /(-?\d+(?:\.\d+)?)/g;
    const parts1 = str1.split(regex);
    const parts2 = str2.split(regex);

    if (parts1.length !== parts2.length) return null;

    let changeIndex = -1;
    let diff = 0;

    for (let i = parts1.length - 1; i >= 0; i--) {
        if (parts1[i] !== parts2[i]) {
            const n1 = parseFloat(parts1[i]);
            const n2 = parseFloat(parts2[i]);
            if (!isNaN(n1) && !isNaN(n2)) {
                diff = n2 - n1;
                changeIndex = i;
                break; 
            }
        }
    }

    if (changeIndex === -1) return null;

    return {
        generate: (i) => {
            const newParts = [...parts2];
            const baseVal = parseFloat(newParts[changeIndex]);
            let newVal = baseVal + (diff * i);
            
            if (Number.isInteger(baseVal) && Number.isInteger(diff)) {
                 newParts[changeIndex] = newVal.toString();
            } else {
                 newParts[changeIndex] = Number(newVal.toFixed(6)).toString();
            }
            return newParts.join("");
        }
    };
}

const xDistance = el2.x - el1.x;
const yDistance = el2.y - el1.y;
const widthDistance = el2.width - el1.width;
const heightDistance = el2.height - el1.height;
const angleDistance = el2.angle - el1.angle;

const text1 = getText(groups[groups.length-2]);
const text2 = getText(groups[groups.length-1]);
const textPattern = getSmartTextPattern(text1, text2);

for(let i=0; i<repeatNum; i++) {
    let newEls = [];
    let idMap = {};

    // 第一遍：深拷贝并偏移所有属性
    for (let el of groups[groups.length-1]) {
        const safeClone = JSON.parse(JSON.stringify(el));
        const oldId = safeClone.id;
        const newId = Math.random().toString(36).substring(2, 10);
        idMap[oldId] = newId;

        safeClone.id = newId;
        safeClone.seed = Math.floor(Math.random() * 100000);
        safeClone.version = 1;
        safeClone.versionNonce = 0;
        
        if (safeClone.groupIds && safeClone.groupIds.length > 0) {
            safeClone.groupIds = safeClone.groupIds.map(gid => gid + `_repeat_${i}`);
        }
        
        safeClone.x += xDistance * (i + 1);
        safeClone.y += yDistance * (i + 1);
        safeClone.angle += angleDistance * (i + 1);
        
        const originWidth = safeClone.width;
        const originHeight = safeClone.height;
        const newWidth = safeClone.width + widthDistance * (i + 1);
        const newHeight = safeClone.height + heightDistance * (i + 1);
        
        if(newWidth >= 0 && newHeight >= 0) {
            if(safeClone.type === 'arrow' || safeClone.type === 'line' || safeClone.type === 'freedraw') {
              const minX = Math.min(...safeClone.points.map(pt => pt[0]));
              const minY = Math.min(...safeClone.points.map(pt => pt[1]));
              for(let j = 0; j < safeClone.points.length; j++) {
                if(safeClone.points[j][0] > minX) {
                  safeClone.points[j][0] = safeClone.points[j][0] + ((safeClone.points[j][0] - minX) / originWidth) * (newWidth - originWidth);
                }
                if(safeClone.points[j][1] > minY) {
                  safeClone.points[j][1] = safeClone.points[j][1] + ((safeClone.points[j][1] - minY) / originHeight) * (newHeight - originHeight);
                }
              }
            } else {
              safeClone.width = newWidth;
              safeClone.height = newHeight;
            }
            newEls.push(safeClone);
        }

        // 单独无容器文本模式处理
        if (safeClone.type === "text" && groups[groups.length-1].length === 1 && textPattern) {
            safeClone.originalText = safeClone.rawText = safeClone.text = textPattern.generate(i + 1);
        }
    }
    
    // 第二遍：统一修复内部绑定关系
    for (let newEl of newEls) {
        if (newEl.containerId && idMap[newEl.containerId]) {
            newEl.containerId = idMap[newEl.containerId];
        }
        if (newEl.boundElements && Array.isArray(newEl.boundElements)) {
            newEl.boundElements = newEl.boundElements.map(b => {
                return { ...b, id: idMap[b.id] || b.id };
            });
        }
        
        // 绑定了容器的文本在这里统一更新模式
        if (newEl.type === "text" && newEl.containerId && textPattern) {
            newEl.originalText = newEl.rawText = newEl.text = textPattern.generate(i + 1);
        }

        ea.elementsDict[newEl.id] = newEl;
    }
}

await ea.addElementsToView(false, false, true);