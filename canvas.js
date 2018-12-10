var canvas = document.getElementById('canvas');
canvas.width = 1024;
canvas.height = 1024;

canvas.style.width = "80%";
canvas.style.height = "40%";

if(canvas.getContext){
  var ctx = canvas.getContext('2d');
  ctx.fillStyle="#7af4a1";
}
canvas.addEventListener("mousedown", getPosition, false);
canvas.addEventListener("contextmenu", completePolygon, false);
var point = {
    x : 0, y : 0,  // coordinates
}
//Create a 2D path variable to be used to draw and get information from the polygon
var polygon = new Path2D(ctx);
//Array to store points for path
var LAV = new Array();

//var prevX, prevY;

/*
This function gets the position of a mousedown event on the page's canvas and
adds it as a point to the path on the canvas as well as a list of points to
comprise the LAV of the straight skeleton
*/
function getPosition(event){

  var bounds = canvas.getBoundingClientRect();
  var intersectDetected = false;

  var point = {
      x : event.pageX - bounds.left - scrollX, y : event.pageY - bounds.top - scrollY,  // coordinates
  }
  //point.x = event.pageX - bounds.left - scrollX;
  //point.y = event.pageY - bounds.top - scrollY;
  point.x /=  bounds.width;
  point.y /=  bounds.height;
  point.x *= canvas.width;
  point.y *= canvas.height;

  if(LAV.length == 0){
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    console.log("x:" + point.x + " y:" + point.y);
    LAV.push(point);
  } else {
    for(i=0; i<LAV.length; i++){
      if(isIntersecting(point, LAV[LAV.length-1], LAV[i], LAV[(i+1)%LAV.length])){
        intersectDetected = true;
      }
    }
    if(intersectDetected == false){
      //prevX = points[points.length-1].x;
      //prevY = points[points.length-1].y;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.fill();
      console.log("hello");
      console.log("x:" + point.x + " y:" + point.y);
      LAV.push(point);
    }

    //ctx.closePath();
  }

  console.log(LAV);
}

function completePolygon(event){
  event.preventDefault();
  ctx.closePath();
  ctx.stroke();
  return false;
}

function isIntersecting(p1, p2, p3, p4) {
    function CCW(p1, p2, p3) {
        return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    return (CCW(p1, p3, p4) != CCW(p2, p3, p4)) && (CCW(p1, p2, p3) != CCW(p1, p2, p4));
}
