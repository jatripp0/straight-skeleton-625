//Retrieve the canvas element from index.html
var canvas = document.getElementById('canvas');
//Define the width and height of the canvas
canvas.width = window.screen.width*.6;
canvas.height = window.screen.height*.6;
canvas.style.width = "60%";
canvas.style.height = "60%";

//Get 2d context of canvas and set style
if(canvas.getContext){
  var ctx = canvas.getContext('2d');
  ctx.fillStyle="#7af4a1";
}
//Create event listeners for left and right mouse click events
canvas.addEventListener("mousedown", getPosition, false);
canvas.addEventListener("contextmenu", completePolygon, false);

//Create a 2D path variable to be used to draw and get information from the polygon
var polygon = new Path2D(ctx);
//Array to store vertexs for path
var LAV = new Array();
var restorePts = new Array();
var points = new Array();
var undoFlag = false;

/*
This function gets the position of a mousedown event on the page's canvas and
adds it as a vertex to the path on the canvas as well as a list of vertexs to
comprise the LAV of the straight skeleton
*/
function getPosition(event, x, y){

  if(!undoFlag){
    points.push({x : event.pageX, y : event.pageY});
  }
  var canvasImg = canvas.toDataURL("canvasState.png");
  restorePts.push(canvasImg);
  //Get canvas boundaries
  var bounds = canvas.getBoundingClientRect();
  //Set intersection flag to false for each new vertex
  var intersectDetected = false;

  //Initiialize the vertex from the mouseclick event arguments
  if(event != 0){
    var vertex = {
        x : event.pageX - bounds.left - scrollX, y : event.pageY - bounds.top - scrollY,
        interiorAngle : 0, bisector : 0, boundsIntercept : 0, prev : 0, next : 0,
        processed: false  // coordinates
    }
  } else {
    var vertex = {
        x : x - bounds.left - scrollX, y : y - bounds.top - scrollY,
        interiorAngle : 0, bisector : 0, boundsIntercept : 0, prev : 0, next : 0,
        processed: false  // coordinates
    }
  }
  //Normalize and adjust the vertex coordinates according to the constraints of the canvas
  vertex.x /=  bounds.width;
  vertex.y /=  bounds.height;
  vertex.x *= canvas.width;
  vertex.y *= canvas.height;

  //Add initial vertex to the LAV
  if(LAV.length == 0){
    //Begin the path of the polygon
    ctx.beginPath();
    ctx.moveTo(vertex.x, vertex.y);
    //console.log("x:" + vertex.x + " y:" + vertex.y);
    //Add the vertex to the LAV
    LAV.push(vertex);
  } else { //Add vertices 2...N to the LAV
    for(i=0; i<LAV.length; i++){
      //Detect intersections on any edges or interior of polygon. Reject vertex if collisions occur.
      if(isIntersecting(vertex, LAV[LAV.length-1], LAV[i], LAV[(i+1)%LAV.length]) && (LAV[LAV.length-1] != LAV[i])){
        //Set flag indicating collision
        intersectDetected = true;
      }
    }
    //Add vertex to LAV only if there are no intersections
    if(intersectDetected == false){

      ctx.lineTo(vertex.x, vertex.y);
      //Draw border line on edge of polygon
      ctx.stroke();
      //Fill the polygon as it is drawn
      ctx.fill();
      //console.log("x:" + vertex.x + " y:" + vertex.y);
      //Add the vertex to the LAV
      vertex.prev = LAV[LAV.length-1];
      LAV[LAV.length-1].next = vertex;
      LAV.push(vertex);
      //ctx.moveTo(LAV[LAV.length-1].x, LAV[LAV.length-1].y);
    }
  }
  console.log(LAV);
}

/*
On right-click or button press, close the path of the polygon and draw the final edge
*/
function completePolygon(event){
  event.preventDefault();
  //Complete the connection between the first and last vertices in the LAV
  LAV[LAV.length-1].next = LAV[0];
  LAV[0].prev = LAV[LAV.length-1];
  //Close the path and draw the final edge
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  //Calculate interior angles for all vertices and the canvas intercepts
  //May combine into generateStraightSkeleton method
  getAllInteriorAngles(LAV);
  if(validateInteriorAngleCount()){
    generateStraightSkeleton(ctx);
  } else {
    alert("Invalid polygon.");
    clearAll();
  }
  //Return false to prevent context menu from appearing on right-click
  return false;
}

/*
Detect any intersection that occurs between the lines (p1,p2) and (p3,p4)
*/
function isIntersecting(p1, p2, p3, p4) {
    function CCW(p1, p2, p3) {
        return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    return (CCW(p1, p3, p4) != CCW(p2, p3, p4)) && (CCW(p1, p2, p3) != CCW(p1, p2, p4));
}

/*
Returns the interior angles for all vertices in the LAV. Calculates the interior angle
based on the adjacent vertices to the given point. Also calculates and stores the
angle bisector at the vertex
*/
function getAllInteriorAngles(LAV){
  for(var i=0; i<LAV.length; i++){
    if(i == 0){
      LAV[i].interiorAngle = (getAngle(LAV[LAV.length-1], LAV[i], LAV[(i+1)%LAV.length])*180)/Math.PI;
    } else {
      LAV[i].interiorAngle = (getAngle(LAV[i-1], LAV[i], LAV[(i+1)%LAV.length])*180)/Math.PI;
    }
    LAV[i].bisector = LAV[i].interiorAngle/2;
  }
}

/*
Returns the angle between lines (A,B) and (B,C)
*/
function getAngle(A,B,C) {
    var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));
    var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2));
    var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
    return Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
}

/*
Iterate through the LAV to set the intercept points for each vertex. These points
will be used to calculate the position of edge events
*/
function setAllPointIntercepts(LAV){
  for(i=0; i<LAV.length; i++){
    if(i == 0){
      findPointIntercept(LAV[i], LAV[LAV.length-1]);
    } else {
      findPointIntercept(LAV[i], LAV[i-1]);
    }
  }
  console.log(LAV);
}

/*
Get and assign the point where the bisector origin for a vertex intersects with
the canvas edge
*/
function findPointIntercept(bisectorOrigin, a){
  var b = bisectorOrigin.bisector;
  var p;
  //Scan top edge of canvas
  for(var i=0; i<canvas.width; i++){
    p = { x: i, y: 0}
    if((Math.abs(b - (getAngle(a, bisectorOrigin, p)*180)/Math.PI) <= 1) && isIntersecting(bisectorOrigin, p, bisectorOrigin.prev, bisectorOrigin.next)){
      /* Log location of intercept and angle
      console.log("top");
      console.log((getAngle(a, bisectorOrigin, p)*180)/Math.PI);
      */
      bisectorOrigin.boundsIntercept = { x: p.x, y: p.y};
      LAV[LAV.indexOf(bisectorOrigin)].boundsIntercept = { x: p.x, y: p.y};
      /* Draw a circle to show intercept point
      ctx.beginPath();
      ctx.arc(p.x,p.y,3,0,2*Math.PI);
      ctx.fill();
      ctx.closePath();
      */
      return { x: p.x, y: p.y};
    }
  }
  //Scan left edge
  for(var i=0; i<canvas.height; i++){
    var p = { x: 0, y: i}
    if((Math.abs(b - (getAngle(a, bisectorOrigin, p)*180)/Math.PI) <= 1) && isIntersecting(bisectorOrigin, p, bisectorOrigin.prev, bisectorOrigin.next)){
      /* Log location of intercept and angle
      console.log("left");
      console.log((getAngle(a, bisectorOrigin, p)*180)/Math.PI);
      */
      bisectorOrigin.boundsIntercept = { x: p.x, y: p.y};
      LAV[LAV.indexOf(bisectorOrigin)].boundsIntercept = { x: p.x, y: p.y};
      /* Draw a circle to show intercept point
      ctx.beginPath();
      ctx.arc(p.x,p.y,3,0,2*Math.PI);
      ctx.fill();
      ctx.closePath();
      */
      return { x: p.x, y: p.y};
    }
  }
  //Scan bottom edge
  for(var i=0; i<canvas.width; i++){
    var p = { x: i, y: canvas.height}
    if((Math.abs(b - (getAngle(a, bisectorOrigin, p)*180)/Math.PI) <= 1) && isIntersecting(bisectorOrigin, p, bisectorOrigin.prev, bisectorOrigin.next)){
      /* Log location of intercept and angle
      console.log("bottom");
      console.log((getAngle(a, bisectorOrigin, p)*180)/Math.PI);
      */
      bisectorOrigin.boundsIntercept = { x: p.x, y: p.y};
      LAV[LAV.indexOf(bisectorOrigin)].boundsIntercept = { x: p.x, y: p.y};
      /* Draw a circle to show intercept point
      ctx.beginPath();
      ctx.arc(p.x,p.y,3,0,2*Math.PI);
      ctx.fill();
      ctx.closePath();
      */
      return { x: p.x, y: p.y};
    }
  }
  //Scan right edge
  for(var i=0; i<canvas.height; i++){
    var p = { x: canvas.width, y: i}
    console.log(isIntersecting(bisectorOrigin, p, bisectorOrigin.prev, bisectorOrigin.next));
    if((Math.abs(b - (getAngle(a, bisectorOrigin, p)*180)/Math.PI) <= 1) && isIntersecting(bisectorOrigin, p, bisectorOrigin.prev, bisectorOrigin.next)){
      /* Log location of intercept and angle
      console.log("right");
      console.log((getAngle(a, bisectorOrigin, p)*180)/Math.PI);
      */
      bisectorOrigin.boundsIntercept = { x: p.x, y: p.y};
      LAV[LAV.indexOf(bisectorOrigin)].boundsIntercept = { x: p.x, y: p.y};
      /* Draw a circle to show intercept point
      ctx.beginPath();
      ctx.arc(p.x,p.y,3,0,2*Math.PI);
      ctx.fill();
      ctx.closePath();
      */
      return { x: p.x, y: p.y};
    }
  }
}

function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x),
                    y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

/*
Classes for a priority queue to store the information for processing the straight skeleton
*/
class QElement {
    constructor(element, priority)
    {
        this.element = element;
        this.priority = priority;
    }
}

class PriorityQueue {

    // An array is used to implement priority
    constructor()
    {
        this.items = [];
    }

    enqueue(element, priority)
    {
        // creating object from queue element
        var qElement = new QElement(element, priority);
        var contain = false;

        // iterating through the entire
        // item array to add element at the
        // correct location of the Queue
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].priority > qElement.priority) {
                // Once the correct location is found it is
                // enqueued
                this.items.splice(i, 0, qElement);
                contain = true;
                break;
            }
        }

        // if the element have the highest priority
        // it is added at the end of the queue
        if (!contain) {
            this.items.push(qElement);
        }
    }

    dequeue()
    {
        // return the dequeued element
        // and remove it.
        // if the queue is empty
        // returns Underflow
        if (this.isEmpty())
            return "Underflow";
        return this.items.shift();
    }

    front()
    {
        // returns the highest priority element
        // in the Priority queue without removing it.
        if (this.isEmpty())
            return "No elements in Queue";
        return this.items[0];
    }

    rear()
    {
        // returns the lowest priorty
        // element of the queue
        if (this.isEmpty())
            return "No elements in Queue";
        return this.items[this.items.length - 1];
    }

    isEmpty()
    {
        // return true if the queue is empty.
        return this.items.length == 0;
    }
}

function getIntersection(p1, p2, p3, p4) {
  // Check if none of the lines are of length 0
	if ((p1.x === p2.x && p1.y === p2.y) || (p3.x === p4.x && p3.y === p4.y)) {
		return false
	}

	denominator = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y))

  // Lines are parallel
	if (denominator === 0) {
		return false
	}

	let ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator
	let ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator

  // is the intersection along the segments
	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
		return false
	}

  // Return a object with the x and y coordinates of the intersection
	let x = p1.x + ua * (p2.x - p1.x)
	let y = p1.y + ua * (p2.y - p1.y)

	return {x, y}
}

function generateStraightSkeleton(ctx){
  //ctx.strokeStyle="#FF0000";
  setAllPointIntercepts(LAV);
  var pq = new PriorityQueue();
  fillQueue(pq);
  console.log(pq);
  while(!pq.isEmpty()){
    var currentVertex = pq.dequeue().element;
    if(currentVertex.origin1.processed == true && currentVertex.origin2.processed == true ){
      continue;
    }
    if(currentVertex.origin1.prev.prev === currentVertex.origin2 ){
      var remainingCount = 0;
      for(var i=0; i<LAV.length; i++){
        if(LAV[i].processed == false && (LAV[i] == currentVertex.origin1 || LAV[i] == currentVertex.origin2)){
          remainingCount++;
        }
      }
      if(remainingCount == 2){
        currentVertex.origin1.processed = true;
        currentVertex.origin2.processed = true;
        ctx.moveTo(currentVertex.origin1.x, currentVertex.origin1.y);
        ctx.lineTo(currentVertex.origin2.x, currentVertex.origin2.y);
        ctx.stroke();
      } else {
        currentVertex.origin1.processed = true;
        currentVertex.origin2.processed = true;
        currentVertex.origin1.prev.processed = true;
        ctx.moveTo(currentVertex.x, currentVertex.y);
        ctx.lineTo(currentVertex.origin1.x, currentVertex.origin1.y);
        ctx.stroke();
        ctx.moveTo(currentVertex.x, currentVertex.y);
        ctx.lineTo(currentVertex.origin2.x, currentVertex.origin2.y);
        ctx.stroke();
        ctx.moveTo(currentVertex.x, currentVertex.y);
        ctx.lineTo(currentVertex.origin1.prev.x, currentVertex.origin1.prev.y);
        ctx.stroke();
      }
      continue;
    } else {
      //Output the skeleton arcs (Step 2d)
      ctx.moveTo(currentVertex.x, currentVertex.y);
      ctx.lineTo(currentVertex.origin1.x, currentVertex.origin1.y);
      ctx.stroke();
      ctx.moveTo(currentVertex.x, currentVertex.y);
      ctx.lineTo(currentVertex.origin2.x, currentVertex.origin2.y);
      ctx.stroke();
      //Mark the origin nodes as processed (Step 2e)
      LAV[LAV.indexOf(currentVertex.origin1)].processed = true;
      LAV[LAV.indexOf(currentVertex.origin2)].processed = true;

      //Create a new node with the coordinates of the intersection (Step 2e/f)
      var intAngle = (getAngle(currentVertex.origin1, currentVertex, currentVertex.origin2)*180)/Math.PI
      if(intAngle < 180){
        intAngle = 360 - intAngle;
      }
      var vertex = {
          x : currentVertex.x, y : currentVertex.y,
          interiorAngle : intAngle,
          bisector : intAngle/2, boundsIntercept : null,
          prev : currentVertex.origin1, next : currentVertex.origin2,
          processed: false  // coordinates
      }
      var interceptPrev = LAV[LAV.indexOf(currentVertex.origin1)];
      LAV.splice(LAV.indexOf(currentVertex.origin2), 0, vertex);
      vertex.prev = LAV[LAV.indexOf(currentVertex.origin1)].prev;
      vertex.next = LAV[LAV.indexOf(currentVertex.origin2)].next;
      LAV[LAV.indexOf(currentVertex.origin1)].next = LAV[LAV.indexOf(vertex)];
      LAV[LAV.indexOf(currentVertex.origin2)].prev = LAV[LAV.indexOf(vertex)];
      findPointIntercept(vertex, interceptPrev);

      console.log("hi");
      var intersection1 = getIntersection(vertex, vertex.boundsIntercept, vertex.prev, vertex.prev.boundsIntercept);
      var intersection2 = getIntersection(vertex, vertex.boundsIntercept, vertex.next, vertex.next.boundsIntercept);
      var d1 = distToSegment(intersection1, vertex, vertex.next);
      var d2 = distToSegment(intersection2, vertex, vertex.next);
      var shortestDistance = Math.min(d1, d2);
      var queueItem;
      if(shortestDistance == d1){
        if(vertex.next.processed == true && vertex.prev.processed == true){
          queueItem = {x: intersection1.x, y: intersection1.y, origin1: vertex, origin2: vertex.prev.prev, processed: false}
        } else {
          queueItem = {x: intersection1.x, y: intersection1.y, origin1: vertex.next, origin2: vertex.prev, processed: false}
        }
      } else {
        if(vertex.next.processed == true && vertex.prev.processed == true){
          queueItem = {x: intersection2.x, y: intersection2.y, origin1: vertex, origin2: vertex.prev.prev, processed: false}
        } else {
          queueItem = {x: intersection2.x, y: intersection2.y, origin1: vertex.next, origin2: vertex.prev, processed: false}
        }
      }
      //Store the intersection in the queue (Step 2f)
      pq.enqueue(queueItem, shortestDistance);
    }
  }
  console.log("end");
}

function fillQueue(pq){
  for(var i=0; i<LAV.length; i++){
    var intersection1, intersection2, d1, d2, queueItem, origin1, origin2;
    if(i == 0){
      intersection1 = getIntersection(LAV[i], LAV[i].boundsIntercept, LAV[LAV.length-1], LAV[LAV.length-1].boundsIntercept);
      intersection2 = getIntersection(LAV[i], LAV[i].boundsIntercept, LAV[(i+1)%LAV.length], LAV[(i+1)%LAV.length].boundsIntercept);
      d1 = distToSegment(intersection1, LAV[i], LAV[(i+1)%LAV.length]);
      d2 = distToSegment(intersection2, LAV[i], LAV[(i+1)%LAV.length]);

    } else {
      intersection1 = getIntersection(LAV[i], LAV[i].boundsIntercept, LAV[i-1], LAV[i-1].boundsIntercept);
      intersection2 = getIntersection(LAV[i], LAV[i].boundsIntercept, LAV[(i+1)%LAV.length], LAV[(i+1)%LAV.length].boundsIntercept);
      d1 = distToSegment(intersection1, LAV[i], LAV[(i+1)%LAV.length]);
      d2 = distToSegment(intersection2, LAV[i], LAV[(i+1)%LAV.length]);
    }
    var shortestDistance = Math.min(d1, d2);
    if(shortestDistance == d1){
      if(i == 0){
        queueItem = {x: intersection1.x, y: intersection1.y, origin1: LAV[LAV.length-1], origin2: LAV[i], processed: false}
      } else {
        queueItem = {x: intersection1.x, y: intersection1.y, origin1: LAV[i-1], origin2: LAV[i], processed: false}
      }
    } else {
      if(i == 0){
        queueItem = {x: intersection2.x, y: intersection2.y, origin1: LAV[i], origin2: LAV[(i+1)%LAV.length], processed: false}
      } else {
        queueItem = {x: intersection2.x, y: intersection2.y, origin1: LAV[i], origin2: LAV[(i+1)%LAV.length], processed: false}
      }
    }
    pq.enqueue(queueItem, shortestDistance);
  }
}

function validateInteriorAngleCount(){
  var angleSum = 0;
  for(var i=0; i<LAV.length; i++){
    angleSum += LAV[i].interiorAngle;
  }
  if(Math.round(angleSum) == (LAV.length-2)*180){
    return true;
  }
  return false;
}

function clearAll(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  LAV.length = 0;

}

function undo(){
  undoFlag = true;
  var lastPoint = LAV.pop();
  ctx.moveTo(LAV[LAV.length-1].x, LAV[LAV.length-1].y);
  lastPoint.prev.next = null;
  console.log(LAV);

  points.pop();
  clearAll();
  for(var j=0; j<points.length; j++){
    var p = points[j];
    getPosition(0, p.x, p.y);
  }
  points.length = 0;
  undoFlag = false;
}

function print(){
    var win = window.open();
    win.document.write("<br><img src='"+canvas.toDataURL()+"'/>");
    win.print();
    win.location.reload();
}

var saveLink = document.getElementById("saveLink");
function download() {
    var dt = canvas.toDataURL('image/jpeg');
    this.href = dt;
};
saveLink.addEventListener('click', download, false);

var modal = document.getElementById('help-modal');

var btn = document.getElementById("help-button");

var span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
  modal.style.display = "block";
}

span.onclick = function() {
  modal.style.display = "none";
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function showHelp(){
    modal.style.display = "block";
}
