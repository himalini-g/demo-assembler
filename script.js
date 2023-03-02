// import {distanceToLineSegment} from "./utils.js"

var element = document.getElementById("svgElement");
var mode = document.getElementById("mode");
var drawMode = "draw"
var deleteMode = "delete"
var selectMode = "select"

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
    reRender(){
        this.path.setAttribute("d", this.toString());
    }
    toString(){
        var svgString = this.points.reduce(function(str, point){
            str += " L" + point.x + " " + point.y;
            return str;
        }, "");
        svgString = "M" + svgString.slice(2);
        return svgString;
    }
    debug(){
        console.log(this.points);
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

    deleteMousePressed(point){
        var relativePoint = this.relativeMousePosition(point);
        console.log(this.lines)
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
        this.selectionBox =  document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('style', "fill: none; stroke: cadetblue; stroke-width: 2;")
        this.svg.element.appendChild(this.selectionBox);
        this.selected = []
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
    }
    applyAction(action){
        action(this.selected)
    }
    getSelectedLines(){
    }
    startSelection(e){
        this.selectionLeftTopCorner = svg.relativeMousePosition(e);
        this.selectionBox.setAttribute('x', this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('y', this.selectionLeftTopCorner.y);
    }
    updateSelection(e){
        this.selectionBottomRightCorner = svg.relativeMousePosition(e);
        this.selectionBox.setAttribute('width',this.selectionBottomRightCorner.x - this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('height', this.selectionBottomRightCorner.y - this.selectionLeftTopCorner.y);
        console.log(this.selectionBox);

    }
    resetSelection(){
        this.selected = []
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
    }

}

var svg = new Svg(element);
var select = new Select(svg);

function downloadSVG(){
    svg.downloadSVG();
}

element.addEventListener("mousedown", function (e) {
    svg.pressed = true;
    if(svg.mode == drawMode){
        svg.addLine(e);
    } else if(svg.mode === deleteMode){
        svg.deleteMousePressed(e);
    } else if(svg.mode === selectMode){
        select.startSelection(e);
    }
});

element.addEventListener("mousemove", function (e) {
    if(svg.pressed && svg.mode == drawMode){
        svg.updateSvgPath(e); 
    } else if (svg.pressed && svg.mode == selectMode){
        select.updateSelection(e);
    }
});

element.addEventListener("mouseup", function () {
    svg.pressed = false;
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