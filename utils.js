function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
  
function randomInteger(bottom=0, top){
    return parseInt((Math.random() * (top- bottom)) + bottom, 10);
}
function firstOrderSmoothing(arr){
    for(let i = 1; i < arr.length - 1; i++){
      arr[i].x = (arr[i -1].x + arr[i].x + arr[i + 1].x) / 3
      arr[i].y = (arr[i -1].y + arr[i].y + arr[i + 1].y) / 3
    }
    return arr
  }

function resample(polyline,step){
    // https://github.com/LingDong-/fishdraw
    if (polyline.length < 2){
        return polyline.slice();
    }
    polyline = polyline.slice();
    let out = [polyline[0].slice()];
    let next = null;
    let i = 0;
    while(i < polyline.length-1){
        let a = polyline[i];
        let b = polyline[i+1];
        let dx = b[0]-a[0];
        let dy = b[1]-a[1];
        let d = Math.sqrt(dx*dx+dy*dy);
        if (d == 0){
            i++;
            continue;
        }
        let n = ~~(d/step);
        let rest = (n*step)/d;
        let rpx = a[0] * (1-rest) + b[0] * rest;
        let rpy = a[1] * (1-rest) + b[1] * rest;
        for (let j = 1; j <= n; j++){
            let t = j/n;
            let x = a[0]*(1-t) + rpx*t;
            let y = a[1]*(1-t) + rpy*t;
            let xy = [x,y];
            for (let k = 2; k < a.length; k++){
                xy.push(a[k]*(1-t) + (a[k] * (1-rest) + b[k] * rest)*t);
            }
            out.push(xy);
        }

        next = null;
        for (let j = i+2; j < polyline.length; j++){
            let b = polyline[j-1];
            let c = polyline[j];
            if (b[0] == c[0] && b[1] == c[1]){
                continue;
            }
            let t = isect_circ_line(rpx,rpy,step,b[0],b[1],c[0],c[1]);
            if (t == null){
                continue;
            }

            let q = [
                b[0]*(1-t)+c[0]*t,
                b[1]*(1-t)+c[1]*t,
            ];
            for (let k = 2; k < b.length; k++){
                q.push(b[k]*(1-t)+c[k]*t);
            }
            out.push(q);
            polyline[j-1] = q;
            next = j-1;
            break;
        } 
        if (next == null){
            break;
        }
        i = next;
    }

    if (out.length > 1){
        let lx = out[out.length-1][0];
        let ly = out[out.length-1][1];
        let mx = polyline[polyline.length-1][0];
        let my = polyline[polyline.length-1][1];
        let d = Math.sqrt((mx-lx)**2+(my-ly)**2);
        if (d < step*0.5){
        out.pop(); 
        }
    }
    out.push(polyline[polyline.length-1].slice());
    return out;
}
  // https://github.com/LingDong-/fishdraw
function isect_circ_line(cx,cy,r,x0,y0,x1,y1){
    //https://stackoverflow.com/a/1084899
    let dx = x1-x0;
    let dy = y1-y0;
    let fx = x0-cx;
    let fy = y0-cy;
    let a = dx*dx+dy*dy;
    let b = 2*(fx*dx+fy*dy);
    let c = (fx*fx+fy*fy)-r*r;
    let discriminant = b*b-4*a*c;
    if (discriminant<0){
        return null;
    }
    discriminant = Math.sqrt(discriminant);
    let t0 = (-b - discriminant)/(2*a);
    if (0 <= t0 && t0 <= 1){
        return t0;
    }
    let t = (-b + discriminant)/(2*a);
    if (t > 1 || t < 0){
        return null;
    }
    return t;
}

function scaleLine(l, scale){
    var scaled = []
    for(var j = 0; j< l.length; j++){
        var point = l[j];
        point = {x: point.x * scale, y:  point.y * scale}
        scaled.push(point)
    }
    return scaled;
}
function translateLine(arr, x,y){
    return arr.map(p => {return {x: p.x - x, y:  p.y - y}})
}
function dist(x1, y1, x2, y2){
    return Math.sqrt(((y2 - y1) * (y2 - y1)) + ((x2 - x1) * (x2 - x1)))
}



// https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

function sqr(x) { return x * x }
function dist2(v, w) { 
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
    module.exports.shuffleArray = shuffleArray;
    module.exports.randomInteger = randomInteger;
    module.exports.firstOrderSmoothing = firstOrderSmoothing;
    module.exports.resample = resample;
    module.exports.isect_circ_line = isect_circ_line;
    module.exports.scaleLine =scaleLine;
    module.exports.translateLine =translateLine;
    module.exports.dist =dist;
}

