/*
```javascript
*/

let repeatNum = parseInt(await utils.inputPrompt("repeat times?","number","5"));
if(!repeatNum) {
    new Notice("Please enter a number.");
    return;
}

const selectedElements = ea.getViewSelectedElements()
let groups = ea.getMaximumGroups(selectedElements);
if(groups.length < 2) {
  new Notice("Please select at least 2 elements.");
  return;
}
let el1 = groups[groups.length-2][0]
let el2 = groups[groups.length-1][0]



if(el1.type !== el2.type) {
    new Notice("The selected elements must be of the same type.");
    return;
}

const xDistance = el2.x - el1.x;
const yDistance = el2.y - el1.y;
const widthDistance = el2.width - el1.width;
const heightDistance = el2.height - el1.height;
const angleDistance = el2.angle - el1.angle;

// const bgColor1 = ea.colorNameToHex(el1.backgroundColor);
// const cmBgColor1 = ea.getCM(bgColor1);
// const bgColor2 = ea.colorNameToHex(el2.backgroundColor);
// let   cmBgColor2 = ea.getCM(bgColor2);
// const isBgTransparent = cmBgColor1.alpha === 0  || cmBgColor2.alpha === 0;
// const bgHDistance = cmBgColor2.hue - cmBgColor1.hue;
// const bgSDistance = cmBgColor2.saturation - cmBgColor1.saturation;
// const bgLDistance = cmBgColor2.lightness - cmBgColor1.lightness;
// const bgADistance = cmBgColor2.alpha - cmBgColor1.alpha;

// const strokeColor1 = ea.colorNameToHex(el1.strokeColor);
// const cmStrokeColor1 = ea.getCM(strokeColor1);
// const strokeColor2 = ea.colorNameToHex(el2.strokeColor);
// let   cmStrokeColor2 = ea.getCM(strokeColor2);
// const isStrokeTransparent = cmStrokeColor1.alpha === 0 || cmStrokeColor2.alpha ===0;
// const strokeHDistance = cmStrokeColor2.hue - cmStrokeColor1.hue;
// const strokeSDistance = cmStrokeColor2.saturation - cmStrokeColor1.saturation;
// const strokeLDistance = cmStrokeColor2.lightness - cmStrokeColor1.lightness;
// const strokeADistance = cmStrokeColor2.alpha - cmStrokeColor1.alpha;


// ea.copyViewElementsToEAforEditing(selectedElements);
for(let i=0; i<repeatNum; i++) {
    for (el of groups[groups.length-1]) {
        const newEl = ea.cloneElement(el);
        ea.elementsDict[newEl.id] = newEl;
        for (let j in newEl.groupIds) {
          newEl.groupIds[j] += `${i}`;
        }
        
        newEl.x += xDistance * (i + 1);
        newEl.y += yDistance * (i + 1);
        newEl.angle += angleDistance * (i + 1);
        const originWidth = newEl.width;
        const originHeight = newEl.height;
        const newWidth = newEl.width + widthDistance * (i + 1);
        const newHeight = newEl.height + heightDistance * (i + 1);
        if(newWidth >= 0 && newHeight >= 0) {
            if(newEl.type === 'arrow' || newEl.type === 'line' || newEl.type === 'freedraw') {
              const minX = Math.min(...newEl.points.map(pt => pt[0]));
              const minY = Math.min(...newEl.points.map(pt => pt[1]));
              for(let j = 0; j < newEl.points.length; j++) {
                if(newEl.points[j][0] > minX) {
                  newEl.points[j][0] = newEl.points[j][0] + ((newEl.points[j][0] - minX) / originWidth) * (newWidth - originWidth);
                }
                if(newEl.points[j][1] > minY) {
                  newEl.points[j][1] = newEl.points[j][1] + ((newEl.points[j][1] - minY) / originHeight) * (newHeight - originHeight);
                }
              }
            }
            else {
              newEl.width = newWidth;
              newEl.height = newHeight;
            }
        }

        // if(!isBgTransparent) {
        // cmBgColor2 = cmBgColor2.hueBy(bgHDistance).saturateBy(bgSDistance).lighterBy(bgLDistance).alphaBy(bgADistance);
        // newEl.backgroundColor = cmBgColor2.stringHEX();
        // } else {
        //   newEl.backgroundColor = "transparent";
        // }

        // if(!isStrokeTransparent) {
        // cmStrokeColor2 = cmStrokeColor2.hueBy(strokeHDistance).saturateBy(strokeSDistance).lighterBy(strokeLDistance).alphaBy(strokeADistance);
        // newEl.strokeColor = cmStrokeColor2.stringHEX();
        // } else {
        //   newEl.strokeColor = "transparent";
        // }
    }
}

await ea.addElementsToView(false, false, true);
