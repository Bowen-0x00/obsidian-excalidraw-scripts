/*
```javascript
*/
//utility & convenience functions
console.log("autorun-TextHook")
await ea.setView(ea.targetView)
let api = ea.getExcalidrawAPI()
let flag = false

function save_context(context) {
    if (!flag) {
        context.save()
        flag = true
    }
}

window.drawElementOnCanvas_TextHook_before=function(element, context, lines, horizontalOffset, verticalOffset, lineHeightPx) {
    if (element.customData) {
        // console.log("drawElementOnCanvas_TextHook_before")
        if ("bold" in element.customData) {
            save_context(context)
            context.font = 'bold ' + context.font
        }
        if ("title" in element.customData) {
            save_context(context)
            context.font = context.font.match(/\d*\.*\d+px/)[0] + ' caption'
        } 
        if ("font" in element.customData) {
            save_context(context)
            if ("weight" in element.customData.font) {
                context.font = `${element.customData.font.weight} ${context.font}`
            }
            if ("bold" in element.customData) {
                context.font = 'bold ' + context.font
            }
            if ("title" in element.customData) {
                context.font = context.font.match(/\d*\.*\d+px/)[0] + ' caption'
            } 
        }
        if ("gradient" in element.customData) {
            save_context(context)
            window.customData.svgGradient.temp = {}
            window.customData.svgGradient.temp.gradientType = 'linearGradient'
            if (element.customData.gradient.contains("createRadialGradient")) {
                window.customData.svgGradient.temp.gradientType = "radialGradient";
            } else if(element.customData.gradient.contains("createConicGradient")) {
                window.customData.svgGradient.temp.gradientType = "Conic"
            }
            let el = element;
            let ctx = context;
            eval(`${element.customData.gradient}`);
            ctx.fillStyle = gradient;
            window.customData.svgGradient.temp.createArgs = []
            if(window?.customData?.svgGradient?.createArgs?.length == 4){
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[0] / element.width)
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[1] / element.height);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[2] / element.width);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[3] / element.height);
            } else if(createArgs?.length == 6){
                const maxSize = Math.max(element.width, element.height)
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[0] / element.width);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[1] / element.height);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[2] / maxSize);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[3] / element.width);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[4] / element.height);
                window.customData.svgGradient.temp.createArgs.push(window.customData.svgGradient.createArgs[5] / maxSize);
            }
            window.customData.svgGradient.temp.colorStops = window.customData.svgGradient.colorStops
        }
        if (element.customData?.boldPartial) {
            let count = 0;
            const pos = element.customData.boldPartial.sort((a, b) => {return a.start - b.start})
            let _posIndex = 0;
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index]
                function fillText(text, x, posIndex) {
                    if (!text) return
                    if (posIndex < pos.length && pos[posIndex].start < count + line.length) {//has highlight
                        const startIndex = Math.max(0, pos[posIndex].start - count)
                        let preText = text.substring(0, startIndex)//handle normal 
                        if (preText) {
                            context.fillText(
                                preText,
                                x,
                                (index) * lineHeightPx + verticalOffset,
                            );
                        }
                        count += preText.length
                        x += context.measureText(preText).width;   
                        context.save()
                        context.font = 'bold ' + context.font
                        const multilineHighlight = pos[posIndex].end - count  > text.length
                        const endIndex = Math.min(pos[posIndex].end - count + preText.length , text.length) 
                        let highlighText = text.substring(startIndex, endIndex)//handle highlight
                        if (highlighText) {
                            context.fillText(
                                highlighText,
                                x,
                                (index) * lineHeightPx + verticalOffset,
                            );
                        }
                        count += highlighText.length
                        context.restore()
                        
                        fillText(text.substring(endIndex), x + context.measureText(highlighText).width, posIndex+!multilineHighlight)
                    }
                    else {
                        context.fillText(
                            text,
                            x,
                            (index) * lineHeightPx + verticalOffset,
                        );
                        count += text.length
                    }
                    
                }
                fillText(line, horizontalOffset, _posIndex)
                
            }
            return true
        }
        if (element.customData?.colorPartial) {
            let count = 0;
            const pos = element.customData.colorPartial.sort((a, b) => {return a.start - b.start})
            let _posIndex = 0;
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index]
                function fillText(text, x, posIndex) {
                    if (!text) return
                    if (posIndex < pos.length && pos[posIndex].start < count + line.length) {//has highlight
                        const startIndex = Math.max(0, pos[posIndex].start - count)
                        let preText = text.substring(0, startIndex)//handle normal 
                        if (preText) {
                            context.fillText(
                                preText,
                                x,
                                (index + 1) * lineHeightPx - verticalOffset,
                            );
                        }
                        count += preText.length
                        x += context.measureText(preText).width;   
                        context.save()
                        // context.font = 'bold ' + context.font
                        context.fillStyle = pos[posIndex].color
                        context.strokeStyle = pos[posIndex].color
                        const multilineHighlight = pos[posIndex].end - count  > text.length
                        const endIndex = Math.min(pos[posIndex].end - count + preText.length , text.length) 
                        let highlighText = text.substring(startIndex, endIndex)//handle highlight
                        if (highlighText) {
                            context.fillText(
                                highlighText,
                                x,
                                (index + 1) * lineHeightPx - verticalOffset,
                            );
                        }
                        count += highlighText.length
                        context.restore()
                        
                        fillText(text.substring(endIndex), x + context.measureText(highlighText).width, posIndex+!multilineHighlight)
                    }
                    else {
                        context.fillText(
                            text,
                            x,
                            (index + 1) * lineHeightPx - verticalOffset,
                        );
                        count += text.length
                    }
                    
                }
                fillText(line, horizontalOffset, _posIndex)
                
            }
            return true
        }
    }    
}

window.drawElementOnCanvas_TextHook_after=function(element, context) {
    if (element.customData) {
        if ("bold" in element.customData) {
            context.restore()
        }
        if ("title" in element.customData) {
            context.restore()
        }
        if ("font" in element.customData) {
            context.restore()
        }
        if ("gradient" in element.customData) {
            context.restore()
        }
        flag = false
    }
}