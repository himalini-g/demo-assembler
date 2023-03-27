var recLim = 20;
var debugView = true;

const attachments = {
  'LIMB': ['MOUTH', 'LIMB'],
  'MOUTH': ['LIMB', 'MOUTH'],
};


function draw(renderStack){
    var polyLines = [];
    for(var l = 0; l< renderStack.length; l++){
        var drawing = renderStack[l];
        polyLines.push(...drawing.getLines());
    }
    return polyLines;
}

class Assemblage{
  constructor(drawingJSONS, recursiveLimit, attachments){
    this.referenceDrawingJsons = drawingJSONS;
    this.recursiveLimit = recursiveLimit;
    this.attachments = attachments;
    this.drawingStack = [];
    this.renderStack = [];

  }
  deepCopies(){
    return this.referenceDrawingJsons.map(json => new Drawing(json));
  }
  shuffledDrawingIndexes(){
    return shuffleArray(this.referenceDrawingJsons.map((_, index)=>index));
  }
  shuffledDeepCopies(){
    var drawings = this.referenceDrawingJsons.map(json => new Drawing(json));
    return shuffleArray(drawings);
  }
  addDrawingToAssemblage(drawing){
    this.renderStack.push(drawing);
    this.drawingStack.unshift(drawing);  
    
  }
  getPolygonBorders(){
    var borders = this.renderStack.map(drawing => drawing.polygonBorder);
   
    return borders;
  }
  randomDrawing(){
    var randomReferenceJson = this.referenceDrawingJsons[randomInteger(0, this.referenceDrawingJsons.length)];
    return new Drawing(randomReferenceJson);
  }
  fitToCanvas(){
    var newLineList = this.renderStack.map(drawing => drawing.lines).flat(2);
    var bBox = get_bbox_assembler(newLineList);
    var scalingFactor = Math.min(width / bBox.w, height / bBox.h);
    for(var l = 0; l< this.renderStack.length; l++){
      var processingLamba = function (line) {
        return linePostProcessing(line, bBox.x, bBox.y, scalingFactor);
      };
      this.renderStack[l].applyLambdaToLines(processingLamba);
    }
  
  }
}
function arrayToObjPoint(line){
  return line.map(point => {return {x: point[0], y: point[1]}})
}
function makeStack(drawingJSONs) {
  let assemblage = new Assemblage(drawingJSONs, recLim, attachments);
  //caps recursive limit on drawing fitting incase loops forever (probabilistically can happen)
  let drawingObj = assemblage.randomDrawing();
  assemblage.addDrawingToAssemblage(drawingObj);


  while(assemblage.drawingStack.length > 0 && assemblage.recursiveLimit > 0){
    // pops a drawings off the stack
    var drawing = assemblage.drawingStack.pop(0);
    
     // goes through each of the openings of the drawing
    for(var i = 0; i < drawing.orientLines.length; i++){
      //exhausts list of drawings
     
      var drawingOptionsIndexes = assemblage.shuffledDrawingIndexes();
      while(drawing.orientLines[i].attachedDrawing == false && drawingOptionsIndexes.length  > 0 ){
     
        var newDrawingIndex = drawingOptionsIndexes.pop();
        var newDrawing = assemblage.deepCopies()[newDrawingIndex];
        var labelOptions = assemblage.attachments[drawing.orientLines[i].label]
        var newPoints = newDrawing.getOrientIndexOptions(labelOptions);
     
        while(newPoints.length > 0){
          var newPoint = newPoints.pop();
          var newDrawing = assemblage.deepCopies()[newDrawingIndex];
          drawing.finewDrawing(newDrawing, i, newPoint);
          var polygonList = assemblage.getPolygonBorders();
          var b = polygonList.some(polygon => {
            var inside = intersect(arrayToObjPoint(newDrawing.polygonBorder), arrayToObjPoint(polygon));
            return inside.length != 0;
          })
          if(!b){
            
            assemblage.addDrawingToAssemblage(newDrawing);
            drawing.orientLines[i].attachedDrawing = true;
            newDrawing.orientLines[newPoint].attachedDrawing = true;
    

          } else{
            newDrawing = null;
          }
        }
       
      }
    }
    assemblage.recursiveLimit -= 1;
  }
  assemblage.fitToCanvas();
  return assemblage.renderStack;
}


class Drawing {
  constructor (object){
    this.lines = JSON.parse(JSON.stringify(object.getLayerAssembler("construction")));
    this.polygonBorder = JSON.parse(JSON.stringify(object.getLayerAssembler("outline")));
    this.polygonBorder = this.polygonBorder.flat(1);
    this.polygonBorder.push(this.polygonBorder[0]);
    this.orient = JSON.parse(JSON.stringify(object.getLayerAssembler("orient")));
    this.orientLines = [];

    for(var i = 0; i< this.orient.length; i++){
        var orientLine = {
          opening: this.orient[i].slice(0, 2),
          vector: this.orient[i].slice(2),
          attachedDrawing: false,
          //TODO: fix,
          label: Object.keys(attachments)[0],
          index: i,
        }
        this.orientLines.push(orientLine)
    }

  }
  getOrientIndexOptions(targetLabels){

    return this.orientLines
    .filter(line => targetLabels.includes(line.label))
    .map(line => line.index);
  }
  getLines(){
    var orientLines = JSON.parse(JSON.stringify(this.orientLines.map(orient => orient.opening)));
    var vectorLines = JSON.parse(JSON.stringify(this.orientLines.map(orient => orient.vector)));
    var retLines = JSON.parse(JSON.stringify(this.lines));
    // retLines.push(...orientLines);
    // retLines.push(...vectorLines);
    // retLines.push(this.polygonBorder);
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
  
  finewDrawing(newDrawing, thisOrientationIndex, newDrawingIndex){
    var target = this.orientLines[thisOrientationIndex]
    var start = newDrawing.orientLines[newDrawingIndex];
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    const dotProduct = (v1, v2) =>{
      const x1 = v1[1][0] - v1[0][0];
      const x2 = v2[1][0] - v2[0][0];
      const y1 = v1[1][1] - v1[0][1];
      const y2 = v2[1][1] - v2[0][1];

      return x1 * x2 + y1 * y2
    }
    const magnitude = (v) => {
      const y = v[1][1] - v[0][1];
      const x = v[1][0] - v[0][0];
      return Math.sqrt((y * y) + (x * x))
    }

    // get angle between the new drawing orientation vector and this drawing's vector
  

    const numerator = dotProduct(target.vector,start.vector );
    const denom = magnitude(target.vector) * magnitude(start.vector);
    const cosTheta = clamp(numerator / denom, -1.0, 1.0);
    
    const targetOrientMag = magnitude(target.opening);
    const startOrientMag = magnitude(start.opening);
    // start size * (target size/ start size) = target size
    const scaleToNorm = (line) => {
      return scaleLine(line, 1.0 / startOrientMag);
    }
    const scaleToTarget = (line) =>{
      return scaleLine(line, targetOrientMag);
    }
    const thetaRad = Math.acos(cosTheta)
    // add 180 so that they rotate facing each other 
    const rotationAngle = -1 * thetaRad + Math.PI;
    const rotationMatrix = [
      [Math.cos(rotationAngle), -1 * Math.sin(rotationAngle)],
      [Math.sin(rotationAngle), Math.cos(rotationAngle)]
    ]
    const newDrawingToOriginLambda = (line) => {
      return translateLine(line, start.vector[0][0], start.vector[0][1])
    }
    const newDrawingRotated = line => {
      return rotateLine(line, rotationMatrix)
    }
    const newDrawingToTarget = line => {
      return translateLine(line, target.vector[0][0] * -1, target.vector[0][1] * -1)
    }

    newDrawing.applyLambdaToLines(newDrawingToOriginLambda);
    newDrawing.applyLambdaToLines(scaleToNorm);
    newDrawing.applyLambdaToLines(scaleToTarget);
    newDrawing.applyLambdaToLines(newDrawingRotated);
    newDrawing.applyLambdaToLines(newDrawingToTarget);
    return;

  }
  arrayDist(arr){
    return dist(arr[0][0], arr[0][1], arr[1][0], arr[1][1])
  }
}
/// ********** utils
// averages points in line

function linePostProcessing(line, x, y, scalingFactor){
  line = scaleLine(translateLine(line, x, y), scalingFactor)
  // line = resample(line, 1.0);
  if(line.length > 7){
    return firstOrderSmoothing(line);
  }
  return line;

}

function translateRotateTranslate(l, v1, rotationMatrix, v2){
  var newLine  = translateLine(
    rotateLine(
    translateLine(l, v1[0][0], v1[1][1]), rotationMatrix), v2[0][0] * -1.0, v2[0][1] * -1.0)
  return newLine
}

// rotates point (x, y) by 2d rotation matrix rotationMatrix
function rotateLine(line, rotationMatrix){
  return line.map(p => rPwM(rotationMatrix, p[0], p[1]))
}
function rPwM(rotationMatrix, x, y){
  var a = rotationMatrix[0][0]; //0
  var b = rotationMatrix[0][1]; //-1
  var c = rotationMatrix[1][0]; //1
  var d = rotationMatrix[1][1]; //0
  return [a *x + b *y, c*x + d*y];

}

//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array


function draw_svg(element, polylines, width, height, id){
  var linesXY = polylines.map(line => line.map(point => {
    return {x: point[0], y: point[1]}
  }))
  var lineObjs = linesXY.map((line, index) => {
    var lineObj = new Line("assembler_" + index.toString())
    lineObj.points = line;
    lineObj.reRender();
    return lineObj
  });
  lineObjs.forEach(line => element.appendChild(line.path));
  

  return;
}
function saveSVG(svgData){
  var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = "newesttree.svg";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function renderDebug(renderStack){
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", id);
  container.appendChild(element);
  var polyLines = draw(renderStack);
  draw_svg(element, polyLines, width, height, id);
}

var id = "assembler-svg"
function assemblerSetup(drawings){
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", id);
  container.appendChild(element);
  var toRender = makeStack(drawings);

  var polyLines = draw(toRender);
  draw_svg(element, polyLines, width, height, id);
}

if (typeof(module) !== "undefined") {
	module.exports.assemblerSetup = assemblerSetup;
}
