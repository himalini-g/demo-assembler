
class Circle {
    constructor(point, ID, radius=3, fill="#0000ff", stroke="#0000c8"){
        this.fill = fill;
        this.stroke = stroke;
        this.point = point;
        this.radius = radius;
        this.id = "circle_" + ID.toString();
        this.circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.circle.setAttribute("fill", this.fill);
        this.circle.setAttribute("stroke", this.stroke);
        this.circle.setAttribute("cy", this.point.y);
        this.circle.setAttribute("cx", this.point.x);
        this.circle.setAttribute("r", this.radius);
        this.circle.setAttribute("stroke-width", this.radius / 2);
        this.circle.setAttribute("class", "circle");
        this.circle.setAttribute("id", this.id);
    }
    moveByVector(vec){
        this.point = {
                x: this.point.x + vec.x, 
                y: this.point.y + vec.y,
        }
    }
    reRender(){
        this.circle.setAttribute("cy", this.point.y);
        this.circle.setAttribute("cx", this.point.x);
    }
}
class TextSVG {
    constructor(point, ID, txt, fill="#0000ff") {
        this.fill = fill;
        this.point = point;
        this.id = ID;
        this.txt = txt;
        this.text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.text.setAttribute("fill", this.fill);
        this.text.setAttribute("y", this.point.y);
        this.text.setAttribute("x", this.point.x);
        this.text.setAttribute("id", this.id);
        this.text.textContent  = this.txt;
    }
    moveByVector(vec){
        this.point = {
                x: this.point.x + vec.x, 
                y: this.point.y + vec.y,
        }
    }
    reRender(){
        this.text.setAttribute("y", this.point.y);
        this.text.setAttribute("x", this.point.x);
        this.text.textContent  = this.txt;
    }
    fromJSON(json){
        this.fill = json.fill;
        this.point =json.point;
        this.id = json.id;
        this.txt = json.txt;
        this.text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.text.setAttribute("fill", this.fill);
        this.text.setAttribute("y", this.point.y);
        this.text.setAttribute("x", this.point.x);
        this.text.setAttribute("id", this.id);
        this.text.textContent  = this.txt;
    }
}

class Line {
    constructor(ID, lineClosed=false, stroke="#000", fill="none") {
        this.fill = fill;
        this.strokeWidth = 2;
        this.stroke = stroke;
        this.points = [];
        this.id = "stroke_" + ID.toString();
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute("fill", this.fill);
        this.path.setAttribute("stroke", this.stroke);
        this.path.setAttribute("stroke-width",this.strokeWidth);
        this.path.setAttribute("id", this.id);
        this.lineClosed = lineClosed;
        this.closePoint = null;
    }
    jsonToObj(json){
        this.fill = json.fill;
        this.strokeWidth = json.strokeWidth;
        this.stroke = json.stroke;
        this.points = json.points;
        this.id = json.id;
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute("fill", this.fill);
        this.path.setAttribute("stroke", this.stroke);
        this.path.setAttribute("stroke-width",this.strokeWidth);
        this.path.setAttribute("id", this.id);
        this.lineClosed = json.lineClosed;
        this.closePoint = json.lineClosed && this.points.length > 0 ? this.points[0] : null;
    }
    movePoint(index, vec){
        var point = this.points[index];
        point =  {
            x: point.x + vec.x, 
            y: point.y + vec.y,
        }
        this.points[index] = point;
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }
    }
    removePoint(index=null){
        if(index == null){
            this.points.pop();
        } else if(this.points.length > 0 && index >= 0 && index < this.points.length){
            this.points.pop(index);
        } 
        if(this.points.length == 0){
            this.closePoint = null;
        }
        return;
    }
    insertPoint(index, point){
        var trunced = {
            x: Math.trunc(point.x),
            y: Math.trunc(point.y),
        }
        
        this.points.splice(index, 0, trunced);
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }

    }
    appendPoint(point){
        var trunced = {
            x: Math.trunc(point.x),
            y: Math.trunc(point.y),
        }
        this.points.push(trunced);
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }
        this.path.setAttribute("d", this.toString());
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
                x: Math.trunc(point.x + vec.x), 
                y: Math.trunc(point.y + vec.y),
            };
        })
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }
    }
 
    toString(){
        var svgString = this.points.reduce(function(str, point){
            str += " L" + point.x + " " + point.y;
            return str;
        }, "");
        svgString = "M" + svgString.slice(2);

        if(this.lineClosed && this.points.length > 0){
            svgString += " L" + this.closePoint.x + " " + this.closePoint.y;
        }
        return svgString;
    }
}

if (typeof(module) !== "undefined") {
	module.exports.Line = Line;
    module.exports.Circle = Circle;
    module.exports.TextSVG = TextSVG; // Text is an inbuilt
}
