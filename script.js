var element = document.getElementById("svgElement");


class Svg {
    constructor(element) {
      this.name = "svg"
      this.element = element;
      this.parentRect = element.getBoundingClientRect();
      this.strokeWidth = 2;
      this.strPath = "";
      this.fill = "none";
      this.path = "";
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
    svg.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.path.setAttribute("fill", svg.fill);
    svg.path.setAttribute("stroke", svg.stroke);
    svg.path.setAttribute("stroke-width",svg.strokeWidth );
    var pt = getMousePosition(e);
    svg.strPath = "M" + pt.x + " " + pt.y;
    svg.path.setAttribute("d", svg.strPath);
    this.appendChild(svg.path);
});

element.addEventListener("mousemove", function (e) {
    if (svg.path) {
        updateSvgPath(getMousePosition(e));
    }
});

element.addEventListener("mouseup", function () {
    if (svg.path) {
        svg.path = null;
    }
});

var getMousePosition = function (e) {
    return {
        x: e.pageX - svg.parentRect.left,
        y: e.pageY - svg.parentRect.top
    }
};


var updateSvgPath = function (p) {
    var tmpPath = svg.strPath +" L" + p.x + " " + p.y;
    
    svg.path.setAttribute("d", svg.strPath + tmpPath);
    svg.strPath = tmpPath;
};