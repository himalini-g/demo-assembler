var element = document.getElementById("svgElement");
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
        this.debug();
    }
    appendPoint(point){
        this.points.push(point);
        this.path.setAttribute("d", this.toString());
        this.debug();
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
      
      this.stroke = "#000";
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
var svg = new Svg(element);

function downloadSVG(){
    svg.downloadSVG();

}

element.addEventListener("mousedown", function (e) {
    var lineObj = new Line(svg.fill, svg.stroke, svg.strokeWidth);
    var pt = getMousePosition(e);
    lineObj.appendPoint(pt);
    this.appendChild(lineObj.path);
    svg.lines.push(lineObj);
});

element.addEventListener("mousemove", function (e) {
  
    updateSvgPath(getMousePosition(e));

});

element.addEventListener("mouseup", function () {

});

var getMousePosition = function (e) {
    return {
        x: e.pageX - svg.parentRect.left,
        y: e.pageY - svg.parentRect.top
    }
};


var updateSvgPath = function (p) {
    var line = svg.lines.pop();
    line.appendPoint(p);
    
    line.path.setAttribute("d", line.toString());
    svg.lines.push(line);
   
};