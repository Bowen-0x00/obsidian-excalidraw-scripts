//ymjr
/*
```javascript
*/
console.log("convert latex in text")
const elements = ea.getViewElements()
const elementMap = new Map();
elements.forEach(el => elementMap.set(el.id, el))
const selectedEls = ea.getViewSelectedElements();
const targetEls = selectedEls.filter(el => ["line", "arrow"].includes(el.type) && el.startBinding && el.endBinding)

for (const el of targetEls) {
    const startBindingEl = elementMap.get(el.startBinding.elementId)
    const endBindingEl = elementMap.get(el.endBinding.elementId)
    const dirStart = el.x < startBindingEl.x ? 0 : (el.x > startBindingEl.x + startBindingEl.width ? 3 : (el.y < startBindingEl.y ? 1 : 2))
    const endX = el.x+el.points[el.points.length-1][0]
    const endY = el.y+el.points[el.points.length-1][1]
    const dirEnd = endX < endBindingEl.x ? 0 : (endX > endBindingEl.x + endBindingEl.width ? 3 : (endY < endBindingEl.y ? 1 : 2))

    let sameX = false
    let offset= {
        0: [0, 0.5],
        1: [0.5, 0],
        2: [0.5, 1],
        3: [1, 0.5]
    } 
    if ([1, 2].includes(dirStart)) {
        sameX = true
    }
    console.log(`sameX: ${sameX}`)
    el.x = startBindingEl.x+startBindingEl.width * offset[dirStart][0]
    el.y = startBindingEl.y+startBindingEl.height * offset[dirStart][1]
    const pointsEnd = [endBindingEl.x+endBindingEl.width*offset[dirEnd][0] - el.x, endBindingEl.y+endBindingEl.height*offset[dirEnd][1] - el.y]
    const points = [[0, 0], [0, 0], pointsEnd]
    if (dirStart + dirEnd == 3) {
        points.splice(2, 0, [0, 0]);
        const midXY = (points[0][Number(sameX)] + points[3][Number(sameX)]) / 2
        points[1] = [midXY, points[0][Number(!sameX)]]
        points[2] = [midXY, points[3][Number(!sameX)]]
        if (sameX) {
            points[1] = [points[1][1], points[1][0]]
            points[2] = [points[2][1], points[2][0]]
        }   
    } else {
        points[1] = [points[2][0], points[0][1]]//
        if (sameX)
            points[1] = [points[0][0], points[2][1]]
    }
    el.points = points
}
ea.clear()
ea.copyViewElementsToEAforEditing(targetEls);
ea.addElementsToView(false, false, false);
