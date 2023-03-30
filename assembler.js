
function draw(renderStack){
    var polyLines = [];
    for(var l = 0; l< renderStack.length; l++){
        var drawing = renderStack[l];
        polyLines.push(...drawing.getLines());
    }
    return polyLines;
}
const P2ArrayToArray = arr => arr.reduce((acc, point)=> {

    acc.push(point.x);
    acc.push(point.y);
  
  return acc;
}, []);
class Assemblage{
  constructor(drawingJSONS, recursiveLimit, attachments){
    this.referenceDrawingJsons = drawingJSONS;
    this.recursiveLimit = recursiveLimit;
    this.attachments = attachments;
    this.drawingStack = [];
    this.renderStack = [];
    this.debug = false;

  }
  deepCopies(){
    return this.referenceDrawingJsons.map(json => new Drawing(json, this.attachments));
  }
  shuffledDrawingIndexes(){
    if(!this.debug){
      return shuffleArray(this.referenceDrawingJsons.map((_, index)=>index));
    } else{
      return this.referenceDrawingJsons.map((_, index)=>index);
    }
  }
  shuffledDeepCopies(){
    var drawings = this.referenceDrawingJsons.map(json => new Drawing(json, this.attachments));
    if(!this.debug){
      return shuffleArray(drawings);
    } else {
      return drawings;
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
  randomDrawing(){
    if(!this.debug){
      var randomReferenceJson = this.referenceDrawingJsons[randomInteger(0, this.referenceDrawingJsons.length)];
      return new Drawing(randomReferenceJson, this.attachments);
    } else{
      return new Drawing(this.referenceDrawingJsons[0], this.attachments);
    }
   
  }
  fitToCanvas(){
    var newLineList = this.renderStack.map(drawing => drawing.lines).flat(2);
    var bBox = get_bbox(newLineList);
    var scalingFactor = Math.min(width / (bBox[1].x - bBox[0].x), height / (bBox[1].y - bBox[0].y));
    for(var l = 0; l< this.renderStack.length; l++){
      var processingLamba = function (line) {
        return linePostProcessing(line, bBox[0].x, bBox[0].y, scalingFactor);
      };
      this.renderStack[l].applyLambdaToLines(processingLamba);
    }
  
  }
}

function makeStack(drawingJSONs, recLim, attachments) {
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
            var inside = intersect(newDrawing.polygonBorder, polygon);
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

  constructor (object, attachments){
    this.lines = JSON.parse(JSON.stringify(object.getLayerAssembler("construction")));
    this.polygonBorder = JSON.parse(JSON.stringify(object.getLayerAssembler("border")));
    this.polygonBorder = this.polygonBorder.flat(1);
    this.polygonBorder.push(this.polygonBorder[0]);
    this.orient = JSON.parse(JSON.stringify(object.getLayerAssembler("orient")));
    this.orientLines = [];
    this.attachments = attachments;

    for(var i = 0; i< this.orient.length; i++){
        var orientLine = {
          opening: this.orient[i].slice(0, 2),
          vector: this.getRay(this.orient[i].slice(0, 2)),
          attachedDrawing: false,
          //TODO: fix,
          label: Object.keys(this.attachments)[0],
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
      const x1 = v1[1].x - v1[0].x;
      const x2 = v2[1].x - v2[0].x;
      const y1 = v1[1].y - v1[0].y;
      const y2 = v2[1].y - v2[0].y;

      return x1 * x2 + y1 * y2
    }
    const magnitude = (v) => {
      const y = v[1].y - v[0].y;
      const x = v[1].x - v[0].x;
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
      return translateLine(line, start.vector[0].x, start.vector[0].y)
    }
    const newDrawingRotated = line => {
      return rotateLine(line, rotationMatrix)
    }
    const newDrawingToTarget = line => {
      return translateLine(line, target.vector[0].x * -1, target.vector[0].y * -1)
    }

    newDrawing.applyLambdaToLines(newDrawingToOriginLambda);
    newDrawing.applyLambdaToLines(scaleToNorm);
    newDrawing.applyLambdaToLines(scaleToTarget);
    newDrawing.applyLambdaToLines(newDrawingRotated);
    newDrawing.applyLambdaToLines(newDrawingToTarget);
    return;

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


// rotates point (x, y) by 2d rotation matrix rotationMatrix
function rotateLine(line, rotationMatrix){
  return line.map(p => rPwM(rotationMatrix, p.x, p.y))
}
function rPwM(rotationMatrix, x, y){
  var a = rotationMatrix[0][0]; //0
  var b = rotationMatrix[0][1]; //-1
  var c = rotationMatrix[1][0]; //1
  var d = rotationMatrix[1][1]; //0
  return {x: a *x + b *y, y: c*x + d*y};

}

//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array


function draw_svg(element, polylines){
  var lineObjs = polylines.map((line, index) => {
    var lineObj = new Line("assembler_" + index.toString())
    lineObj.points = line;
    lineObj.reRender();
    return lineObj
  });
  lineObjs.forEach(line => line.addToParentElement(element, "assembler"));

  return;
}

function renderDebug(renderStack){
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", id);
  container.appendChild(element);
  var polyLines = draw(renderStack);
  draw_svg(element, polyLines);
}

var id = "assembler-svg";

function assemblerSetup(drawings){
  const attachments = {
    'LIMB': ['MOUTH', 'LIMB'],
    'MOUTH': ['LIMB', 'MOUTH'],
  };
  var recLim = 10;
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", id);
  container.appendChild(element);
  var toRender = makeStack(drawings, recLim, attachments);

  var polyLines = draw(toRender);
  draw_svg(element, polyLines, width, height, id);
  return element;
}
function assemblerStart(){
  var container = document.getElementById("assembler-svg-container");
  container.innerHTML = ""
  var element = SVGElement(width, height, width, height, "svg", id);
  container.appendChild(element);
  return element; 

}

if (typeof(module) !== "undefined") {
	module.exports.assemblerSetup = assemblerSetup;
  module.exports.assemblerStart = assemblerStart;
}
