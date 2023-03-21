var width = 600;
var height = 400;
var recLim = 20;
var debugView = true;

const attachments = {
  'LIMB': 'MOUTH',
  'MOUTH': 'LIMB',
};


function draw(renderStack){
    console.log(renderStack);
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
    this.polygonList = [];
    this.assemblage = [];
    this.drawingStack = [];
    this.renderStack = [];

  }
  shuffledDeepCopies(){
    var drawings = this.referenceDrawingJsons.map(json => new Drawing(json));
    return shuffleArray(drawings);
  }
  addDrawingToAssemblage(drawing){
    var drawingBorder = drawing.getPolygonBorder();
    this.polygonList.push(drawingBorder);
    this.drawingStack.unshift(drawing);  
    
  }
  randomDrawing(){
    var randomReferenceJson = this.referenceDrawingJsons[randomInteger(0, this.referenceDrawingJsons.length)];
    return new Drawing(randomReferenceJson);
  }
  scaleAssemblage(){
    var bBox = get_bbox_assembler(this.polygonList.flat(1));
    // TODO: scaling factor is wrong
    var scalingFactor = Math.min(width / bBox.w, height / bBox.h);
  
    for(var l = 0; l< this.renderStack.length; l++){
      var processingLamba = function (line) {
        return linePostProcessing(line, bBox.x, bBox.y, scalingFactor);
      };
      this.renderStack[l].applyLambdaToLines(processingLamba);
    }
  }
}

function makeStack(drawingJSONs) {
  let assemblage = new Assemblage(drawingJSONs, recLim, attachments);
  //caps recursive limit on drawing fitting incase loops forever (probabilistically can happen)
  let drawingObj = assemblage.randomDrawing();
  assemblage.addDrawingToAssemblage(drawingObj);

  while(assemblage.drawingStack.length > 0 && assemblage.recursiveLimit > 0){
    // pops a drawings off the stack
    var drawing = assemblage.drawingStack.pop(0);

    assemblage.renderStack.push(drawing);
    
     // goes through each of the openings of the drawing
    for(var i = 0; i < drawing.orientLines.length; i++){
      //exhausts list of drawings
      var drawingOptions = assemblage.shuffledDeepCopies();
      while(drawing.orientLines[i].attachedDrawing == false && drawingOptions.length  > 1 ){
      // spawns and attaches new drawing to the opening

        var newDrawing = drawingOptions.pop();
        var newPoints = newDrawing
                  .getOrientIndexOptions(assemblage.attachments[drawing.orientLines[i].label]);
        // TODO: replace with while after refactoring attachment code
        if(newPoints.length > 0){
          var newPoint = newPoints.pop();
          drawing.finewDrawing(newDrawing, i, newPoint);
          var b = polygonIntersectPolygonList(newDrawing.getPolygonBorder(), assemblage.polygonList)
          if(!b){
            assemblage.addDrawingToAssemblage(newDrawing);
            drawing.orientLines[i].attachedDrawing = true;
            newDrawing.orientLines[newPoint].attachedDrawing = true;

          } else{
            drawing.orientLines[i].attachedDrawing = false;
            newDrawing.orientLines[newPoint].attachedDrawing = false;
          }

        }
       
      }
    }
    assemblage.recursiveLimit -= 1;
  }
  assemblage.scaleAssemblage();
  return assemblage.renderStack;
}


class Drawing {
  constructor (object){
    this.lines = JSON.parse(JSON.stringify(object.getLayerAssembler("construction")));
    this.polygonBorder = JSON.parse(JSON.stringify(object.getLayerAssembler("outline")));
    this.polygonBorder = this.polygonBorder.flat(1);
    this.orient = JSON.parse(JSON.stringify(object.getLayerAssembler("orient")));

    this.orientLines = [];

    for(var i = 0; i< this.orient.length; i++){
        var orientLine = {
          opening: this.orient[i].slice(0, 2),
          vector: this.orient[i].slice(2),
          attachedDrawing: false,
          //TODO: fix,
          label: attachments[i % attachments.length],
          index: i,
        }
        this.orientLines.push(orientLine)
    }

  }
  getOrientIndexOptions(targetLabel){

    return this.orientLines
    .filter(line => line.label == targetLabel)
    .map(line => line.index);
  }
  getLines(){
    var orientLines = this.orientLines.map(orient => orient.opening);
    var vectorLines = this.orientLines.map(orient => orient.vector);
    var retLines = this.lines;
    retLines.push(...orientLines);
    retLines.push(...vectorLines);
    return retLines;
  }
  getPolygonBorder(){
    
    return this.polygonBorder;
  }
  
  linePreprocessing(lines){
    
    return lines.entries.map(lineObj => lineObj.getPointsArray());
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
  
  finewDrawing(other, myOrientLine, theirOrientLine){
    var vectorMe = this.orientLines[myOrientLine].vector;
    var openingMe = this.orientLines[myOrientLine].opening;
    var openingMeD = this.arrayDist(openingMe);
    var vectorOther = other.orientLines[theirOrientLine].vector;
    var openingOther = other.orientLines[theirOrientLine].opening;
    var openingOtherD = this.arrayDist(openingOther);
    var scale = openingMeD / openingOtherD;
    
    var scaleLambda = function (line) {
      return scaleLine(line, scale);
    };
    other.applyLambdaToLines(scaleLambda);

    vectorOther = JSON.parse(JSON.stringify(other.orientLines[theirOrientLine].vector));

    var vMe = [vectorMe[1][0] - vectorMe[0][0],  vectorMe[1][1] - vectorMe[0][1]];
    var vMeD = Math.sqrt(vMe[0] * vMe[0] +  vMe[1] * vMe[1] );
    vMe = [vMe[0] / (vMeD + 0.0005), vMe[1] / (vMeD + 0.0005)];
    var vOther = [vectorOther[1][0] - vectorOther[0][0],  vectorOther[1][1] - vectorOther[0][1]];
    var vOther  = [vOther[0] * -1, vOther[1] * -1];
    var vOTherD = Math.sqrt(vOther[0] * vOther[0] +  vOther[1] * vOther[1] );
    vOther = [vOther[0] / (vOTherD + 0.0005), vOther[1] / (vOTherD + 0.0005)];
    var a = {
      x: vOther[0],
      y: vOther[1]
    }
    var b = {
      x: vMe[0],
      y: vMe[1]
    }

    var rotationMatrix = [[a.x * b.x + a.y*b.y, b.x * a.y- a.x * b.y,],
                          [a.x * b.y - b.x * a.y, a.x * b.x + a.y * b.y]];

    var trtLamba = function (line) {
      return translateRotateTranslate(line, vectorOther, rotationMatrix, vectorMe);
    };
    other.applyLambdaToLines(trtLamba);

  }
  arrayDist(arr){
    return dist(arr[0][0], arr[0][1], arr[1][0], arr[1][1])
  }
}
/// ********** utils
// averages points in line

function linePostProcessing(line, x, y, scalingFactor){
  line = scaleLine(translateLine(line, x, y), scalingFactor)
  line = resample(line, 1.0);
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
  var a = rotationMatrix[0][0];
  var b = rotationMatrix[0][1];
  var c = rotationMatrix[1][0];
  var d = rotationMatrix[1][1];
  return [a *x + b *y, c*x + d*y];

}

//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array


function draw_svg(polylines, width, height, id){
  let o = `<svg xmlns="http://www.w3.org/2000/svg" id="` + id + `" width="` + width.toString() + `" height="`+ height.toString()+`">`
  o += `<rect x="0" y="0" width="` + width.toString() + `" height="`+ height.toString()+`" fill="floralwhite"/> <path stroke="black" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round" d="`
  for (let i = 0; i < polylines.length; i++){
    o += '\nM ';
    for (let j = 0; j < polylines[i].length; j++){
      let [x,y] = polylines[i][j];
      o += `${(~~((x+10)*100)) /100} ${(~~((y+10)*100)) /100} `;
    }
  }
  o += `\n"/></svg>`
  return o;
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



var id = "assembler-svg"
var element = document.getElementById("assembler-svg");
function assemblerSetup(drawings){
    var renderStack = makeStack(drawings);
    console.log(renderStack);
    var polyLines = draw(renderStack);
    var svg = draw_svg(polyLines, width, height, id);
    element.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    element.outerHTML = svg;
    element = document.getElementById("assembler-svg");
}

if (typeof(module) !== "undefined") {
	module.exports.assemblerSetup = assemblerSetup;
}
