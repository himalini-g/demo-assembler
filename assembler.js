const debug = false;
const recLim = 100;

function draw(assemblage, visualize=false){
    var polyLines = [];
    for(var l = 0; l< assemblage.renderStack.length; l++){
        var drawing = assemblage.renderStack[l];
        polyLines.push(...drawing.getLines());
    }
    if(assemblage.tempDrawing != null && visualize){
      polyLines.push(...assemblage.tempDrawing.getLines());
    }
    return polyLines;
}
const P2ArrayToArray = arr => arr.reduce((acc, point)=> {

    acc.push(point.x);
    acc.push(point.y);
  
  return acc;
}, []);
class Assemblage{
  constructor(drawingJSONS, recursiveLimit, attachments, width, height){
    this.width = width;
    this.height = height; 
    this.referenceDrawingJsons = drawingJSONS;
    this.recursiveLimit = recursiveLimit;
    this.attachments = attachments;
    this.drawingStack = [];
    this.renderStack = [];
    this.tempDrawing = null;
    this.xform = "";
    this.checkRect = false;
    this.bbox = null;
  }
  checkIntersect(newDrawing){
    var polygonList = this.getPolygonBorders();
    var b = polygonList.some(polygon => {
      var inside = intersect(newDrawing.polygonBorder, polygon);
      return inside.length != 0;
    })
    if(this.checkRect){
      return !b && this.checkInRect(newDrawing);
    }
    return !b;
  }
  checkInRect(newDrawing){
    var b = newDrawing.polygonBorder.every(point => {
      if((this.bbox[0].x <= point.x && point.x <=this.bbox[1].x ) && (this.bbox[0].y <= point.y && point.y <= this.bbox[1].y)){
        return true;
      }
      return false;
    });
    return b;
  }
  deepCopies(){
    return this.referenceDrawingJsons.map(json => new Drawing(json, this.attachments));
  }
  shuffledDrawingIndexes(){
    if(!debug){
      return shuffleArray(this.referenceDrawingJsons.map((_, index)=>index));
    } else{
      return this.referenceDrawingJsons.map((_, index)=>index);
    }
  }
  addDrawingToAssemblage(drawing){
    this.renderStack.push(drawing);
    this.drawingStack.unshift(drawing);
  }
  getPolygonBorders(){
    var borders = this.renderStack.map(drawing => drawing.polygonBorder);
   
    return borders;
  }
  setRect(){
    var lineList =  this.renderStack.map(drawing => drawing.lines);
    if(this.tempDrawing != null){
      lineList.push(this.tempDrawing.lines);
  
    }
    var newLineList = lineList.flat(2);
    var bBox = get_bbox(newLineList);
    var scalingFactor = Math.min(this.width / (bBox[1].x - bBox[0].x), this.height / (bBox[1].y - bBox[0].y));
    const tMat = translateMatrix( bBox[0].x,  bBox[0].y);
    const scMat = scaleMatrix(1.0 / scalingFactor, 1.0 /  scalingFactor);
    const cMat = composeTransforms([scMat, tMat]);
    this.bbox = xformLine([{x: 0, y: 0}, {x: this.width, y: this.height}], cMat);
    console.log(this.bbox, bBox);
  }
  fitToCanvas(){
    var lineList =  this.renderStack.map(drawing => drawing.lines);
    if(this.tempDrawing != null){
      lineList.push(this.tempDrawing.lines);
  
    }
    var newLineList = lineList.flat(2);
    var bBox = get_bbox(newLineList);
    var scalingFactor = Math.min(this.width / (bBox[1].x - bBox[0].x), this.height / (bBox[1].y - bBox[0].y));
    const tMat = translateMatrix(-1 * bBox[0].x, -1 * bBox[0].y);
    const scMat = scaleMatrix(scalingFactor, scalingFactor);
    const cMat = composeTransforms([tMat, scMat]);
    this.xform = xformToString(cMat);
  }
  postProcess(){
    this.renderStack.forEach(drawing => {
      drawing.applyLambdaToLines(linePostProcessing)
    })
  }
}

function stepInit(assemblage){
  var initIndexes = assemblage.shuffledDrawingIndexes();
  if(initIndexes.length == 0){
    return [false, assemblage];
  }
  let drawingObj = assemblage.deepCopies()[initIndexes.pop()];
  assemblage.renderStack.push(drawingObj);
  return [true, assemblage];
}

function stackInit(assemblage){
  var initIndexes = assemblage.shuffledDrawingIndexes();
  if(initIndexes.length == 0){
    return [false, assemblage];
  }
  let drawingObj = assemblage.deepCopies()[initIndexes.pop()];
  assemblage.addDrawingToAssemblage(drawingObj);
  return [true, assemblage];
}


function listUnfilledOpenings(assemblage){
  var openings = [];
  assemblage.renderStack.forEach((drawing, drawingIndex) => {
    drawing.orientLines.forEach((line, orientIndex) => {
      if(line.attachedDrawing == false ){
        openings.push({
          drawingIndex: drawingIndex,
          orientIndex: orientIndex,
          lineLabel: line.label,
        });
      }
    });
  });
  return openings;
}
function listCandidateOpenings(assemblage, unfilledOpening, candidateIndex){
  
  var drawing = assemblage.renderStack[unfilledOpening.drawingIndex];
  var index = unfilledOpening.orientIndex
  var drawingOpening = drawing.orientLines[index];
  var candidateDrawing = assemblage.deepCopies()[candidateIndex];
  var labelOptions = assemblage.attachments[drawingOpening.label];
  var candidateOrientOptions = candidateDrawing.getOrientIndexOptions(labelOptions);
  return candidateOrientOptions;
}
class stepStack{
  constructor(drawingJSONs, recLim, attachments, width, height, autoscale){
    this.assemblage= new Assemblage(drawingJSONs, recLim, attachments, width, height);
    this.canStep = true;
    this.canStep = stepInit(this.assemblage);
    this.openings = listUnfilledOpenings(this.assemblage);
    this.candidateIndices = this.assemblage.shuffledDrawingIndexes();
    this.candidateOpenings = [];
    this.autoscale = autoscale;
    this.oI = 0;
    this.cI = 0;
    this.cOI = 0;
    
  }
  stepOpening(){
    if(!this.canStep){
      return;
    }
    if(this.openings.length == 0){
      this.canStep = false;
      return;
    } else {
      this.oI = (this.oI + 1) % this.openings.length;
      var opening = this.openings[this.oI];
      this.candidateOpenings = listCandidateOpenings(this.assemblage, opening, this.cI);
      this.cOI = 0;
      visualize(this.assemblage);
    }
  }
  
  newCandidate(){
    var opening = this.openings[this.oI];
    this.cI = (this.cI + 1) % this.candidateIndices.length;
    this.candidateOpenings = listCandidateOpenings(this.assemblage, opening, this.cI);
    this.cOI = 0;
    this.rotateCandidate();
    visualize(this.assemblage);
  }
  rotateCandidate(){
    this.cOI = (this.cOI + 1) % this.candidateOpenings.length;
    var opening = this.openings[this.oI];
    var drawing = this.assemblage.renderStack[opening.drawingIndex];
    var candidate = this.assemblage.deepCopies()[this.cI];


    drawing.finewDrawing(candidate, opening.orientIndex, this.candidateOpenings[this.cOI], this.autoscale);
   
    this.assemblage.tempDrawing = candidate;
    visualize(this.assemblage);
    
  }
  acceptCandidate(){
    if(this.assemblage.tempDrawing == null){
      return;
    }
    var opening = this.openings[this.oI];
    var candidateOpening = this.candidateOpenings[this.cI];
    
    this.assemblage.renderStack[opening.drawingIndex].orientLines[opening.orientIndex].attachedDrawing = true;
    this.assemblage.tempDrawing.orientLines[candidateOpening].attachedDrawing = true;
    this.assemblage.renderStack.push(this.assemblage.tempDrawing);
    this.assemblage.tempDrawing = null;
    
    this.openings = listUnfilledOpenings(this.assemblage);
    this.oI = 0;
    this.cI = 0;
    // this.stepOpening();

    visualize(this.assemblage);

  }
}

function makeStack(assemblage, autoscale) {
  //caps recursive limit on drawing fitting incase loops forever (probabilistically can happen)
  
  while(assemblage.drawingStack.length > 0 && assemblage.recursiveLimit > 0 ){
    // pops a drawings off the stack
    var drawing = assemblage.drawingStack.pop(0);
    
     // goes through each of the openings of the drawing
    for(var i = 0; i < drawing.orientLines.length; i++){
      //exhausts list of drawings
     
      var drawingOptionsIndexes = assemblage.shuffledDrawingIndexes();
      while(drawing.orientLines[i].attachedDrawing == false && drawingOptionsIndexes.length  > 0 ){
     
        var newDrawingIndex = drawingOptionsIndexes.pop();
        var labelOptions = assemblage.attachments[drawing.orientLines[i].label]
        var newPoints = shuffleArray((assemblage.deepCopies()[newDrawingIndex]).getOrientIndexOptions(labelOptions));
     
        while(newPoints.length > 0){
          var newPoint = newPoints.pop();
          var newDrawing = assemblage.deepCopies()[newDrawingIndex];
          drawing.finewDrawing(newDrawing, i, newPoint, autoscale);
          var b = assemblage.checkIntersect(newDrawing);
          if(b){
            
            assemblage.addDrawingToAssemblage(newDrawing);
            drawing.orientLines[i].attachedDrawing = true;
            newDrawing.orientLines[newPoint].attachedDrawing = true;
            visualize(assemblage);
            // animationTimeout(200).then(() => { console.log("World!"); });
            
          } else{
            newDrawing = null;
          }
         
        }
       
      }
    }
    assemblage.recursiveLimit -= 1;
    
  }
  visualize(assemblage);
  
  return assemblage;
}


class Drawing {

  constructor (object, attachments){
    this.lines = JSON.parse(JSON.stringify(object.getLayerAssembler("construction")));
    this.polygonBorder = JSON.parse(JSON.stringify(object.getLayerAssembler("border")));
    this.polygonBorder = this.polygonBorder.flat(1);
    this.polygonBorder.push(this.polygonBorder[0]);
    this.orient = JSON.parse(JSON.stringify(object.getOrientLayer("orient")));
    this.orientLabels = JSON.parse(JSON.stringify(object.getLabels()));
    this.orientLines = [];
    this.attachments = attachments;

    for(var i = 0; i< this.orient.length; i++){
        var orientLine = {
          opening: this.orient[i].points.slice(0, 2),
          vector: this.getRay(this.orient[i].points.slice(0, 2)),
          attachedDrawing: false,
          //TODO: fix,
          label: this.orientLabels[this.orient[i].id],
          index: i,
        }
        this.orientLines.push(orientLine)
    }

  }
  getRays(points){
  
    const pointSum = {
      x: points[0].x + points[1].x, 
      y: points[0].y + points[1].y
    };
    const average = {
      x: pointSum.x / 2.0,
      y: pointSum.y / 2.0
    };
    const vector = {
      x: points[1].x - points[0].x,
      y: points[1].y - points[0].y,
    };
    const ray1 = {
      x: (vector.y * -1),
      y: vector.x,
    };

    const ray2 = {
      x: vector.y,
      y: (vector.x * -1),
    };
    const normal1 = {
      x: ray1.x + average.x,
      y: ray1.y + average.y,
    };

    const normal2 = {
      x:  ray2.x + average.x,
      y:  ray2.y + average.y,
    };
    return [[average, ray1 ],[average, normal1], [average, ray2 ], [average, normal2]] 
  }
  getRay(line){
 
    const [ray1, normal1, ray2, normal2] = this.getRays(line);
    const polygon = P2ArrayToArray(this.polygonBorder);
    const raycast1 = PolyK.Raycast(polygon, ray1[0].x, ray1[0].y,  ray1[1].x, ray1[1].y);
    const raycast2 = PolyK.Raycast(polygon, ray2[0].x, ray2[0].y,  ray2[1].x, ray2[1].y);
    if(raycast1 == null && raycast2 == null){
      return normal1;
    } else if(raycast1 == null){
      return normal1;
    } else if(raycast2 == null){
      return normal2;
    } else if (raycast1.dist < raycast2.dist){
      return normal2;
    } else {
      return normal1;
    }
  }
  getOrientIndexOptions(targetLabels){

    return this.orientLines
    .filter(line => targetLabels.includes(line.label))
    .map(line => line.index);
  }
  getLines(){
    
    var retLines = JSON.parse(JSON.stringify(this.lines));
    
    if(debug){
      var orientLines = JSON.parse(JSON.stringify(this.orientLines.map(orient => orient.opening)));
      var vectorLines = JSON.parse(JSON.stringify(this.orientLines.map(orient => orient.vector)));
      retLines.push(...orientLines);
      retLines.push(...vectorLines);
      retLines.push(this.polygonBorder);
    }
    return retLines;
  }

  applyLambdaToLines(lambda){
    this.lines = this.lines.map(l => lambda(l))
    this.orientLines = this.orientLines.map(o => 
      { 
        return {
          opening: lambda(o.opening),
          vector: lambda(o.vector),
          attachedDrawing: o.attachedDrawing,
          label: o.label
        }
      })
    this.polygonBorder = lambda(this.polygonBorder);
  }
  
  finewDrawing(newDrawing, thisOrientationIndex, newDrawingIndex, autoscale){
    var target = this.orientLines[thisOrientationIndex]
    var start = newDrawing.orientLines[newDrawingIndex];

    const toOrigin = (v) =>{
      return {
        x: v[1].x - v[0].x, 
        y: v[1].y - v[0].y
      }
    }
  
    const magnitude = (v) => {
      const y = v[1].y - v[0].y;
      const x = v[1].x - v[0].x;
      return Math.sqrt((y * y) + (x * x))
    }

    const targetOrientMag = magnitude(target.opening);
    const startOrientMag = magnitude(start.opening);
    // start size * (target size/ start size) = target size

    const a = toOrigin(start.vector);
    const b = toOrigin(target.vector);
    const aTheta = math.atan2(a.y, a.x);
    const bTheta = math.atan2(b.y, b.x);
    const atan2Theta = aTheta - bTheta;
   
    // add 180 so that they rotate facing each other 
    const rotationAngle = (-1 * atan2Theta) + Math.PI;
  
    const tMat1 = translateMatrix(-1 * start.vector[0].x, -1 * start.vector[0].y);
    const scMat = scaleMatrix(targetOrientMag/ startOrientMag,targetOrientMag/ startOrientMag);
    const rMat = rotationMatrix(rotationAngle);
    const tMat2 = translateMatrix(target.vector[0].x, target.vector[0].y);
    var matList = [];
    if(autoscale){
      matList = [tMat1, scMat, rMat, tMat2];
    } else{
      matList = [tMat1, rMat, tMat2]
    }
  
    const transforms = composeTransforms(matList);

    const xformDrawing = line => {
      return xformLine(line, transforms)
    }
  
    newDrawing.applyLambdaToLines(xformDrawing);
    return;

  }
}
/// ********** utils
// averages points in line

function linePostProcessing(line){
 
  // line = resample(line, 1.0);
  if(line.length > 7){
    return firstOrderSmoothing(line);
  }
  return line;
}


// applies matrix transform to point (x, y)
function xformLine(line, rotationMatrix){
  return line.map(p => xformPoint(rotationMatrix, p.x, p.y))
}
function xformPoint(xform, x, y){
  const newX = xform[0][0] * x + xform[0][1] * y + xform[0][2];
  const newY = xform[1][0] * x + xform[1][1] * y + xform[1][2];
  return {x: newX, y: newY};
}

function draw_svg(element, polylines, matrix){
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  element.appendChild(g);
  var lineObjs = polylines.map((line, index) => {
    var lineObj = new Line("assembler_" + index.toString())
    lineObj.points = line;
    lineObj.reRender();
    return lineObj
  });
  lineObjs.forEach(line => line.addToParentElement(g, "assembler"));
  g.setAttribute("transform", matrix);
  return;
}

function visualize(assemblage){
  assemblage.fitToCanvas();
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(assemblage.width, assemblage.height, assemblage.width, assemblage.height, "svg", "assembler-svg");
  container.appendChild(element);
  var polyLines = draw(assemblage, true);
  draw_svg(element, polyLines, assemblage.xform);
}


function controlAssemblerSetup(drawings, attachments, width, height){
 
  var autoscale = document.getElementById("autoscale-check").checked;
  var stepper = new stepStack(drawings, recLim, attachments, width, height, autoscale);
  document.getElementById("new-opening").onclick = () => stepper.stepOpening();
  document.getElementById("new-candidate").onclick = () => stepper.newCandidate();
  document.getElementById("rotate-candidate").onclick = () => stepper.rotateCandidate();
  document.getElementById("accept-candidate").onclick = () => stepper.acceptCandidate();

  // document.getElementById()
}
function addRandomNewTree(assemblage, autoscale, element){
  
  var initIndexes = assemblage.shuffledDrawingIndexes();
  let drawingObj = null;
  let outside = true;
  while(outside && initIndexes.length > 0 ){
    drawingObj = assemblage.deepCopies()[initIndexes.pop()];
    const tx = Math.random() * (Math.abs(assemblage.bbox[1].x - assemblage.bbox[0].x) + assemblage.bbox[0].x);
    const ty = Math.random() * (Math.abs(assemblage.bbox[1].y - assemblage.bbox[0].y) + assemblage.bbox[0].y);
    const tMat = translateMatrix(tx, ty);
    const xformDrawing = line => {
      return xformLine(line, tMat)
    }
    drawingObj.applyLambdaToLines(xformDrawing);
    outside = !assemblage.checkIntersect(drawingObj);    
  }
  if(outside){
    return
  }
  assemblage.addDrawingToAssemblage(drawingObj);
  console.log(assemblage.drawingStack);
  assemblage = makeStack(assemblage, autoscale);
  var polyLines = draw(assemblage);
  draw_svg(element, polyLines, assemblage.xform);
}
function assemblerSetup(drawings, attachments, width, height){
  const assemblageSVGId = "assembler-svg";
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", assemblageSVGId);
  container.appendChild(element);
  var autoscale = document.getElementById("autoscale-check").checked;
  let assemblageObj = new Assemblage(drawings, recLim, attachments, width, height);
  let [init, assemblage] = stackInit(assemblageObj);
  if(init){
    assemblage = makeStack(assemblage, autoscale);
    assemblage.setRect();
    assemblage.checkRect = true;
    document.getElementById("add-tree").onclick = () =>{
      assemblage.recursiveLimit = recLim;
      addRandomNewTree(assemblage, autoscale, element);
      assemblerElement = element;
      var polyLines = draw(assemblage);
      draw_svg(element, polyLines, assemblage.xform, );

    }
    
    // assemblage.recursiveLimit = recLim;
    // addRandomNewTree(assemblage, autoscale, element);
    var polyLines = draw(assemblage);
    // assemblage.postProcess();
    draw_svg(element, polyLines, assemblage.xform, );
  }
  return element;
  
}

if (typeof(module) !== "undefined") {
	module.exports.assemblerSetup = assemblerSetup;
}
