

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
  
function pointInPolygon(point, vs) {
    // https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
    // https://github.com/substack/point-in-polygon
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};
  
function randomInteger(bottom=0, top){
    return parseInt((Math.random() * (top- bottom)) + bottom, 10);
}
function firstOrderSmoothing(arr){
    for(let i = 1; i < arr.length - 1; i++){
      arr[i][0] = (arr[i -1][0] + arr[i][0] + arr[i + 1][0]) / 3
      arr[i][1] = (arr[i -1][1] + arr[i][1] + arr[i + 1][1]) / 3
    }
    return arr
  }
  
function get_bbox_assembler(points){
    // https://github.com/LingDong-/fishdraw
    let xmin = 9999999999999999;
    let ymin = 9999999999999999;
    let xmax = -9999999999999999;
    let ymax = -9999999999999999;
    for (let i = 0;i < points.length; i++){
        let x = points[i][0];
        let y = points[i][1];
        xmin = Math.min(xmin,x);
        ymin = Math.min(ymin,y);
        xmax = Math.max(xmax,x);
        ymax = Math.max(ymax,y);
    }
    return {x:xmin,y:ymin,w:xmax-xmin,h:ymax-ymin};
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
  
  
function polygonIntersectPolygonList(polygonTarget, polygonList){
    var intersect = false;
    for(var i = 0; i < polygonList.length; i ++ ){
        var polygon = polygonList[i];
        intersect = intersect || polygonIntersectsPolygon(polygonTarget, polygon);
    }
    return intersect;
}
function polygonIntersectsPolygon(polygon1, polygon2){
    var intersect = false;
    for(var i = 0; i < polygon1.length; i ++ ){
        var point = polygon1[i]
        intersect = intersect || pointInPolygon(point, polygon2)
    }
    return intersect
}
  
  
function scaleLine(l, scale){
    var scaled = []
    for(var j = 0; j< l.length; j++){
        var point = l[j];
        point = [point[0] * scale, point[1] * scale];
        scaled.push(point)
    }
    return scaled;
}
function translateLine(arr, x,y){
    return arr.map(p => [p[0] - x, p[1] - y])
}
function dist(x1, y1, x2, y2){
    return Math.sqrt(((y2 - y1) * (y2 - y1)) + ((x2 - x1) * (x2 - x1)))
}


if (typeof(module) !== "undefined") {
    module.exports.shuffleArray = shuffleArray;
    module.exports.pointInPolygon = pointInPolygon;
    module.exports.randomInteger = randomInteger;
    module.exports.firstOrderSmoothing = firstOrderSmoothing;
    module.exports.get_bbox_assembler = get_bbox_assembler;
    module.exports.resample = resample;
    module.exports.isect_circ_line = isect_circ_line;
    module.exports.polygonIntersectPolygonList =polygonIntersectPolygonList;
    module.exports.polygonIntersectsPolygon =polygonIntersectsPolygon;
    module.exports.scaleLine =scaleLine;
    module.exports.translateLine =translateLine;
    module.exports.dist =dist;

}
