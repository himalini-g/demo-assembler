// import {distanceToLineSegment} from "./utils.js"

var element = document.getElementById("svgElement");
var mode = document.getElementById("mode");
var drawMode = "draw"
var deleteMode = "delete"

class Line {
    constructor(fill, stroke, strokeWidth) {
        this.fill = fill;
        this.strokeWidth = strokeWidth;
        this.stroke = stroke;
        this.points = [];
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute("fill", this.fill);
        this.path.setAttribute("stroke", this.stroke);
        this.path.setAttribute("stroke-width",this.strokeWidth);
    }
    appendPoint(point){
        this.points.push(point);
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
      this.element = element;
      this.parentRect = element.getBoundingClientRect();
      this.strokeWidth = 2;
      this.fill = "none";
      this.lines = [];
      this.pressed = false;
      this.mode = drawMode;
      this.stroke = "#000";
    }
    
    addLine(point){
        var lineObj = new Line(this.fill, this.stroke, this.strokeWidth);
        lineObj.appendPoint(point);
        this.element.appendChild(lineObj.path);
        this.lines.push(lineObj);
    }
    updateSvgPath(point) {
        var line = svg.lines.pop();
        line.appendPoint(point);
        line.path.setAttribute("d", line.toString());
        this.lines.push(line);
       
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


class Mode{
    constructor(drawModeMouseDown, deleteModeMouseDown){
        this.drawMode = "draw"
        this.deleteMode = "delete"
        this.activeMode = this.drawMode;
        this.drawModeMouseDown = drawModeMouseDown;
        this.deleteModeMouseDown  = deleteModeMouseDown;
    }
}
var svg = new Svg(element);

function downloadSVG(){
    svg.downloadSVG();
}

element.addEventListener("mousedown", function (e) {
    if(svg.mode == drawMode){
        svg.addLine(getMousePosition(e));
        svg.pressed = true;
    } else if(svg.mode === deleteMode){
        svg.pressed = false;
        console.log('wrong mode!');
        deleteMousePressed(getMousePosition(e));

    }
});

element.addEventListener("mousemove", function (e) {
    if(svg.pressed && svg.mode == drawMode){
        svg.updateSvgPath(getMousePosition(e));
    } else if(svg.mode === deleteMode){
        svg.pressed = false;
        console.log('wrong mode!');
        
    }
});

element.addEventListener("mouseup", function () {
    if(svg.pressed && svg.mode == drawMode){
        svg.pressed = false;
    } else if(svg.mode === deleteMode){
        svg.pressed = false;
        console.log('wrong mode!');
        
    }
});

function getMousePosition(e) {
    console.log(e)
    return {
        x: e.pageX - svg.parentRect.left,
        y: e.pageY - svg.parentRect.top
    }
};
mode.addEventListener("toggle", function () {
    console.log("hello");
});

function changeMode(){
    console.log(mode.value);
    svg.mode = mode.value;
}

function deleteMousePressed(point){
}




// https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
// export function pDistance(x, y, x1, y1, x2, y2) {
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