<%*
const filePath = await tp.system.prompt("File path?", app.workspace.activeLeaf.view.file.path.substring(0, app.workspace.activeLeaf.view.file.path.lastIndexOf(".")) + '_mindmap');
const lastIndex = filePath.lastIndexOf("/")
const fileName = filePath.substring(lastIndex + 1)
const folderName = fileName.substring(0, lastIndex) || tp.file.folder() || '/'
const IDX = Object.freeze({"depth":0, "text":1, "parent":2, "size":3, "children": 4, "objectId":5});

//check if an editor is the active view
const editor = this.app.workspace.activeLeaf?.view?.editor;
if(!editor) return;

//initialize the tree with the title of the document as the first element
let tree = [[0,this.app.workspace.activeLeaf?.view?.getDisplayText(),-1,0,[],0]];
let linecount = editor.lineCount();

//helper function, use regex to calculate indentation depth, and to get line text
function getLineProps (i) {
  props = editor.getLine(i).match(/^(\t*)-\s+(.*)/);
  return [props[1].length+1, props[2]];
}

//a vector that will hold last valid parent for each depth
let parents = [0];
let linecountFixed = 0;
//load outline into tree
for(i=0;i<linecount;i++) {
  props = editor.getLine(i).match(/^(\t*)-\s+(.*)/);
  if (!props) continue;
  
  [depth,text] = [props[1].length+1, props[2]];
  if(depth>parents.length) parents.push(linecountFixed+1);
  else parents[depth] = linecountFixed+1;
  tree.push([depth,text,parents[depth-1],1,[]]);
  tree[parents[depth-1]][IDX.children].push(linecountFixed+1);
  linecountFixed++;
}
linecount = linecountFixed;
//recursive function to crawl the tree and identify height aka. size of each node
function crawlTree(i) {
  if(i>linecount) return 0;
  size = 0;
  if((i+1<=linecount && tree[i+1][IDX.depth] <= tree[i][IDX.depth])|| i == linecount) { //I am a leaf
    tree[i][IDX.size] = 1; 
    return 1; 
  }
  tree[i][IDX.children].forEach((node)=>{ 
    size += crawlTree(node);
  });
  tree[i][IDX.size] = size; 
  return size;   
}

crawlTree(0);

//Build the mindmap in Excalidraw
const width = 300;
const height = 100;
const ea = ExcalidrawAutomate;
ea.reset();

//stores position offset of branch/leaf in height units
offsets = [0];
function getFontSize(level) {
	switch(level) {
		case 0:return 48;break;
		case 1:return 32;break;
		case 2:return 20;break;
		default:return 20;break;
	}
}
let colorList = ['#e03131', '#1971c2', '#099268', '#e8590c', '#9c36b5', '#6741d9', '#0c8599'];
ea.tools.assignNestedProperty(window, "customData.Mindmap.treeElements", [])
colorIndex = 0;
color = ''
cm = {};
let rootId;
ea.style.roundness = {type: 3};
ea.style.fillStyle = "solid";
ea.style.roughness = 0;
ea.style.fontFamily = 2;
let result;
const wikiImageList = []
for(i=0;i<=linecount;i++) {
  depth = tree[i][IDX.depth];
  if (depth == 0) {
    ea.style.strokeColor = "black";
	  ea.style.backgroundColor = "#343a40"; 
  }
  if (depth == 1) {
    color = colorList[colorIndex++%colorList.length]
    cm = ea.getCM(color);
    ea.style.strokeColor = "black";//cm.lightnessTo(Math.max(cm.lightness, 0)).stringHEX({alpha:false});//'#'+(Math.random()*0xFFFFFF<<0).toString(16);
    ea.style.backgroundColor = cm.lightnessTo(Math.max(cm.lightness, 0)).stringHEX({alpha:false});
  }
  if (depth > 1) {
	  ea.style.backgroundColor = ea.getCM(color).lightnessTo(Math.min(cm.lightness+(depth-1)*20, 255)).stringHEX({alpha:false});
  }
  //cm = ea.getCM(ea.style.strokeColor);
  ea.style.fontSize = getFontSize(depth);
  const e = await ea.tools.addElementsByString(tree[i][IDX.text],depth*width,((tree[i][IDX.size]/2)+offsets[depth])*height,{box:true,textAlign: "center", textVerticalAlign: "middle", boxStrokeColor: "black"}); 
  tree[i][IDX.objectId] = e[0]
  const els = e[1]
  const el = ea.getElement(tree[i][IDX.objectId]);
  result = e[2]
  result.forEach((r, index) => {
    if (r.type == "wikiLink") {
      const image = ea.imagesDict[els[index].fileId]
      if (image.hyperlink && !image.hyperlink.startsWith('[[')) {
        wikiImageList.push(els[index].fileId)
      }
    }
  })
  if (depth == 0) {
    rootId = el.id
  }
  el.customData = {
    mindmap: {
      status: "open",
      root: rootId,
      parent: tree[i][IDX.parent]!=-1 ? tree[tree[i][IDX.parent]][IDX.objectId] : rootId,
      level: depth+1
    }
  }
  window.customData.Mindmap.treeElements.push(el, ...els)
  //set child offset equal to parent offset
  if((depth+1)>offsets.length) offsets.push(offsets[depth]);
  else offsets[depth+1] = offsets[depth];
  offsets[depth] += tree[i][IDX.size];
  if(tree[i][IDX.parent]!=-1) {
    const id = ea.connectObjects(tree[tree[i][IDX.parent]][IDX.objectId],"right",tree[i][IDX.objectId],"left",{startArrowHead: 'dot'});
    const arrowEl = ea.getElement(id);
    window.customData.Mindmap.treeElements.push(arrowEl)
  }
}
const elementsDict = ea.elementsDict
const imagesDict = ea.imagesDict
await ea.tools.runScript('Mindmap format2')
ea.elementsDict = elementsDict
ea.imagesDict = imagesDict
wikiImageList.forEach(id => {
  const image = ea.imagesDict[id]
  image.hyperlink = `[[${image.hyperlink}]]`
})
// window.customData.Mindmap.formatOnFileOpen = true
await ea.create({filename: fileName,foldername:tp.file.folder() || '/', onNewPane: true});
ea.clear()
%>