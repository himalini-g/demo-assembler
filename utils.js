// https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

export function sqr(x) { return x * x }
export function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
// export function pDistance(x, y, x1, y1, x2, y2) {
export function distanceToLineSegment(point, linePoint1, linePoint2) {
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