// global variables
var nextBoothNumber = 1;
var boothArray = [];
var linesegs = [];
var maxBooths = document.getElementById("numBooths").max;
var selectedBooth = 0;
// initialize state from file, if present
// create file if not

function newBooth() {
    if (nextBoothNumber <= maxBooths) {
        var number = nextBoothNumber;
        nextBoothNumber += 1;
        var x = y = 0.0;
        var h = 10.0;
        var w = 20.0;
        var vendor = "";
        var booth = array(number, x, y, w, h, vendor)
        boothArray.push(booth);
        generatePoints(booth);
    }
    else {
        alert("Maximum booth limit reached!");
    }
}

function initControlEvents() {
    // numBooths on change
    // new booth
    // save layout
    // zoom
    // change height
    // change width
    // change rotation?
    // delete selected booth?
}

function initWindowEvents() {
    // select booth

    // move booth
}

function generatePoints(booth) {
    var idx = (booth[0] - 1) * 8;

}

function render() {

}

window.onload = function() {

};