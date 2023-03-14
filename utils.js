// https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

function sqr(x) { return x * x }
function dist2(v, w) { 
    console.log("hrs")
    return sqr(v.x - w.x) + sqr(v.y - w.y) 
}


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

if (typeof(module) !== "undefined") {
	module.exports.sqr = sqr;
    module.exports.dist2 = dist2;
    module.exports.minDistanceToLine = minDistanceToLine;
    module.exports.get_bbox = get_bbox;
    module.exports.distanceToLineSegment = distanceToLineSegment;
    
}
