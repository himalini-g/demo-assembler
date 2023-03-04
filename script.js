// import {distanceToLineSegment} from "./utils.js"

var element = document.getElementById("svgElement");
var mode = document.getElementById("mode");
var drawMode = "draw"
var deleteMode = "delete"
var selectMode = "select"
var pressed = false;
var dragged = false;


class Line {
    constructor(ID) {
        this.fill = "none";
        this.strokeWidth = 2;
        this.stroke = "#000";
        this.points = [];
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute("fill", this.fill);
        this.path.setAttribute("stroke", this.stroke);
        this.path.setAttribute("stroke-width",this.strokeWidth);
        this.path.id = "stroke_" + ID.toString();
    }
    appendPoint(point){
        this.points.push(point);
        this.path.setAttribute("d", this.toString());
    }
    getID(){
        return this.path.id;
    }
    pointInRect(point){
        var lineRect = get_bbox(this.points);
        if((lineRect[0].x <= point.x && point.x <=lineRect[1].x ) && (lineRect[0].y <= point.y && point.y <= lineRect[1].y)){
            return true;
        }
        return false;

    }
    inRect(rect){
        var lineRect = get_bbox(this.points);
 
        if (rect[0].x == rect[1].x || rect[0].y == rect[1].y || lineRect[1].x == lineRect[0].x || lineRect[0].y == lineRect[1].y){
            return false;
        }
        // If one rectangle is on left side of other
        if (rect[0].x > lineRect[1].x || lineRect[0].x > rect[1].x) {
            return false;
        }

        // If one rectangle is above other
        if (rect[1].y < lineRect[0].y || lineRect[1].y < rect[0].y) {
            return false;
        }
     
        return true;
    }
    reRender(){
        this.path.setAttribute("d", this.toString());
    }
    moveByVector(vec){
        this.points = this.points.map(point => {
            return {
                x: point.x + vec.x, 
                y: point.y + vec.y,
            };
        })

    }
    toString(){
        var svgString = this.points.reduce(function(str, point){
            str += " L" + point.x + " " + point.y;
            return str;
        }, "");
        svgString = "M" + svgString.slice(2);
        return svgString;
    }
}

class Svg {
    constructor(element) {
      this.name = "svg"
      this.uniqueID = 1;
      this.element = element;
      this.parentRect = element.getBoundingClientRect();
      this.lines = [];
      this.pressed = false;
      this.tolerance = 5.0;
      this.mode = drawMode;
      
    }
    relativeMousePosition(point){
        return {
            x: point.pageX - svg.parentRect.left,
            y: point.pageY - svg.parentRect.top
        }
    }
    validID(){
        var ID = this.uniqueID;
        this.uniqueID += 1;
        return ID;
    }
    addLine(point){
        var line = new Line(this.validID());
        var relativePoint = this.relativeMousePosition(point);
        line.appendPoint(relativePoint);
        this.element.appendChild(line.path);
        this.lines.push(line);
    }
    getAllIDs(){
        var allIDs = this.lines.map(line => line.getID());
        return allIDs;
    }
    reRender(){
        this.element.innerHTML = ""
        this.lines.map(line => {
            this.element.appendChild(line.path);
            line.reRender();
        })
    }
    updateSvgPath(point) {
        var line = svg.lines.pop();
        var relativePoint = this.relativeMousePosition(point);
        line.appendPoint(relativePoint);
        this.lines.push(line);
       
    }
    moveLines(vec){
        this.lines.map(line => {
            line.moveByVector(vec);
        });
    }
    getLinesInPoint(point){
        var selectedIDs = this.lines.reduce((acc, curLine) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine.getID())
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getLinesInRect(rect){
        var selectedIDs = this.lines.reduce((acc, curLine) => {
            if(curLine.inRect(rect)){
                acc.push(curLine.getID())
            }
            return acc;
        }, []);
        return selectedIDs;
    }

    deleteMousePressed(point){
        var relativePoint = this.relativeMousePosition(point);
        this.lines = this.lines.reduce((acc, curLine) => 
        {
            var minDistance = minDistanceToLine(relativePoint, curLine.points);
            console.log(minDistance);
            if(minDistance > this.tolerance){
                console.log(curLine.toString())
                acc.push(curLine);
            }
            return acc;
        }, []);
        this.reRender();
    }
    

    downloadSVG(){
        var preface = '<?xml version="1.0" standalone="no"?>\r\n';
        var svgBlob = new Blob([preface, this.element.outerHTML], {type:"image/svg+xml;charset=utf-8"});
        var downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(svgBlob);
        downloadLink.download = this.name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } 
}
class Select{
    constructor(svg){
        this.svg = svg
        this.selectionCss = 'path-selection'
        this.selectionBox =  document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('fill', 'none')
        this.selectionBox.setAttribute('stroke','gray')
        this.selectionBox.setAttribute('stroke-width', 1)
        this.selectionBox.setAttribute('stroke-dasharray', 4);
        this.svg.element.appendChild(this.selectionBox);
        this.selected = [];
        this.moveVec = {
            x:0,
            y:0
        };
        this.clickedInSelection = false;
        this.oldCursorPosition = {
            x:0,
            y:0
        };
        this.originalLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
    }
    isSelected(){
        return this.selected.length > 0;
    }
    mouseDownHandler(e){
        // click is in the selected boxes
        if(this.isSelected() && this.clickInSelected(e)){
            this.clickedInSelection = true;
            this.startSelection(e);
        // click is outside the selection, therefore start new selection
        } else{
            this.resetSelection();
            this.startSelection(e);
        }

    }

    setSelectedLines(){
        this.selected = this.svg.getLinesInRect([this.selectionLeftTopCorner, this.selectionBottomRightCorner ]);
 
        this.removeCSS();
        for(var i = 0; i < this.selected.length; i++){
            var lineElement = document.getElementById(this.selected[i]);
            lineElement.classList.add(this.selectionCss);
        }
    }
    clickInSelected(e){
        if(!this.isSelected()){
            return false;
        }
        var point = svg.relativeMousePosition(e);
        var potentialIDs = svg.getLinesInPoint(point);
        const found = potentialIDs.some(r=> this.selected.includes(r))
        return found;


    }
    startSelection(e){
        this.moveVec = {
            x: 0, 
            y: 0,
        };
        this.oldCursorPosition = svg.relativeMousePosition(e);
        this.selectionLeftTopCorner = svg.relativeMousePosition(e);
        this.originalLeftTopCorner = svg.relativeMousePosition(e);
        this.selectionBottomRightCorner = svg.relativeMousePosition(e);
        this.setSelectionBox();

    }
    setSelectionBox(){
        this.selectionBox.setAttribute('x', this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('y', this.selectionLeftTopCorner.y);
        this.selectionBox.setAttribute('width',this.selectionBottomRightCorner.x - this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('height', this.selectionBottomRightCorner.y - this.selectionLeftTopCorner.y);
    }
    mouseMoveHandler(e){
        if(this.clickedInSelection){
            this.updateSelection(e);
            this.svg.moveLines(this.moveVec);
            this.svg.reRender();
        } else {
            this.updateSelection(e);
            this.setSelectionBox();
            this.setSelectedLines();
        }
    }

    updateSelection(e){
        var point = svg.relativeMousePosition(e);
        var [minX, maxX] = [Math.min(point.x, this.originalLeftTopCorner.x), Math.max(point.x, this.originalLeftTopCorner.x)];
        var [minY, maxY] = [Math.min(point.y, this.originalLeftTopCorner.y), Math.max(point.y, this.originalLeftTopCorner.y)];
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }

        this.oldCursorPosition = point;

        this.selectionLeftTopCorner = {
            x: minX,
            y: minY,
        };

        this.selectionBottomRightCorner = {
            x: maxX,
            y: maxY,
        };

    }
    removeCSS(){
        var allIDs = svg.getAllIDs();
        for(var i = 0; i < allIDs.length; i++){
            var lineElement = document.getElementById(allIDs[i]);
            lineElement.classList.remove(this.selectionCss);
        }
    }
    resetSelection(){
        this.removeCSS();
        this.selected = [];
        
    }
    resetSelectionBox(){
        this.originalLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
        this.setSelectionBox();

    }

}

var svg = new Svg(element);
var select = new Select(svg);

function downloadSVG(){
    svg.downloadSVG();
}

element.addEventListener("mousedown", function (e) {
    pressed = true;
    if(svg.mode == drawMode){
        svg.addLine(e);
    } else if(svg.mode === deleteMode){
        svg.deleteMousePressed(e);
    } else if(svg.mode === selectMode){
        select.mouseDownHandler(e);
    }
});

element.addEventListener("mousemove", function (e) {
    if(pressed){
        dragged = true;
    }
    if(pressed && svg.mode == drawMode){
        svg.updateSvgPath(e); 
    } else if (pressed && svg.mode == selectMode){
        select.mouseMoveHandler(e);
    }
});

element.addEventListener("mouseup", function () {
    pressed = false;
    dragged = false;
    if(svg.mode == selectMode){
        select.clickedInSelection = false;
        select.resetSelectionBox();
    }
    
});


function changeMode(){
    console.log(mode.value);
    svg.mode = mode.value;

}


// https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }


function minDistanceToLine(point, line){
    if(line.length < 2){
        return 99999999.0;
    }
    var minDistance = 99999999.0;
    for(var i = 0; i < line.length - 1; i++){
        var curDistance = distanceToLineSegment(point, line[i], line[i+1]);
        if(curDistance < minDistance){
            minDistance = curDistance;
        }
    }
    return minDistance;
}
function distanceToLineSegment(point, linePoint1, linePoint2) {
    var x = point.x;
    var y = point.y;
    var x1 = linePoint1.x;
    var y1 = linePoint1.y;
    var x2 = linePoint2.x;
    var y2 = linePoint2.y;


    var A = x - x1;
    var B = y - y1;
    var C = x2 - x1;
    var D = y2 - y1;

    var dot = A * C + B * D;
    var len_sq = C * C + D * D;
    var param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;

    var xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    }
    else if (param > 1) {
        xx = x2;
        yy = y2;
    }
    else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    var dx = x - xx;
    var dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}
//https://github.com/LingDong-/fishdraw/blob/main/fishdraw.js
function get_bbox(points){
    let xmin = Infinity;
    let ymin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity
    for (let i = 0;i < points.length; i++){
      let x = points[i].x;
      let y = points[i].y;
      xmin = Math.min(xmin,x);
      ymin = Math.min(ymin,y);
      xmax = Math.max(xmax,x);
      ymax = Math.max(ymax,y);
    }
    return [{x:xmin,y:ymin},{x:xmax,y:ymax}];
  }