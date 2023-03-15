
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

    removePoint(index){
        if(this.points.length > 0 && index >= 0 && index < this.points.length){
            this.points.pop(index);
        } else if(this.points.length == 0){
            this.closePoint = null;
        }
        return;
    }
    popPoint(){
        this.points.pop();
        if(this.points.length == 0){
            this.closePoint = null;
        }
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
}
