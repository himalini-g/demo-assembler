
class Point {
    constructor(point, ID, radius=3, fill="#0000ff", stroke="#0000c8"){
        this.fill = fill;
        this.stroke = stroke;
        this.point = point;
        this.radius = radius
        this.circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.circle.setAttribute("fill", this.fill);
        this.circle.setAttribute("stroke", this.stroke);
        this.circle.setAttribute("cy", this.point.y);
        this.circle.setAttribute("cx", this.point.x);
        this.circle.setAttribute("r", this.radius);
        this.circle.setAttribute("stroke-width", this.radius / 2);
        this.circle.setAttribute("class", "circle");
        this.circle.id = "point_" + ID.toString();

    }

    getID(){
        return this.circle.id;
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

class Line {
    constructor(ID, lineClosed=false, stroke="#000") {
        this.fill = "none";
        this.strokeWidth = 2;
        this.stroke = stroke;
        this.points = [];
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute("fill", this.fill);
        this.path.setAttribute("stroke", this.stroke);
        this.path.setAttribute("stroke-width",this.strokeWidth);
        this.path.id = "stroke_" + ID.toString();
        this.lineClosed = lineClosed;
        this.closePoint = null;
    }
    movePoint(index, vec){
        var point = this.points[index];
        point =  {
            x: point.x + vec.x, 
            y: point.y + vec.y,
        }
        this.points[index] = point;

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
        this.points.splice(index, 0, point);
    }
    appendPoint(point){
        this.points.push(point);
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }

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
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }

    }
    getLength(){
        return this.points.length;
    }
    getPoints(){
        return this.points;
    }
    getPointsArray(){
        return this.points.map(point => [point.x, point.y]);
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
    module.exports.Point = Point;
}
