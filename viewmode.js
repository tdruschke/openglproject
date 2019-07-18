// webgl global variables
var canvas;
var gl;
var aspect;

// shaders
var shader;
var sqShader;
var texShader;

// buffers
var lineBuffer;
var boarderBuffer;
var vBuffer;
var cBuffer;
var tCoordBufferId;
var tPointBufferId;
var numBuffer;

var triPointBuffer;
var triColorBuffer;
var triLineBuffer;

var texture;

// other global variables
var nextBoothNumber = 1;
var nextTriNumber = 1;
var highestBoothNumber = 0; // used for handling duplicates when populating with svg
var shortestSide = 1000;
var conversionFactor;

// square booths
var boothArray = [];
var linesegs = [];
var numberArray = [];
var pointsArray = [];
var colorsArray = [];

// triangular booths
var triBoothArray = [];
var triLineSegs = [];
var triNumberArray = [];  // might not need, just use regular numberArray
var triPointsArray = [];
var triColorsArray = [];

// priority queue for deletion
var deletedBoothArray = [];

var boothSelectionArray = [];

var floorplanPoints = [vec3(1.0, 1.0, 0.1), vec3(-1.0, 1.0, 0.1),
                       vec3(-1.0, -1.0, 0.1), vec3(1.0, 1.0, 0.1),
                       vec3(1.0, -1.0, 0.1), vec3(-1.0, -1.0, 0.1)];
var floorplanTex = [vec2(1,0), vec2(0,0), vec2(0,1),
                    vec2(1,0), vec2(1,1), vec2(0,1)];
var image;

var numBooths = 0;
var selectedBooth = [0,0]; // [ARRAY: 0 sq, 1 tri; INDEX]
var snap = 2.5;
var lock = false;

// arrays for vendor table
var vendorArrayAlpha = [];
var vendorArrayNum = [];
var vendorArray;

var vendorArrayState = -1;

// colors for booths
var c_open_top = vec4(.2, .9, .9, 1.0);
var c_open_diag = vec4(.5, .95, .95, 1.0);
var c_open_bot = vec4(.8, 1, 1, 1.0);

var c_open_sel_top = vec4(.305, .328, .781, 1.0);
var c_open_sel_diag = vec4(.5, .514, .88, 1.0);
var c_open_sel_bot = vec4(.7, .7, .98, 1.0);

var c_taken_top = vec4(.8, .2, .2, 1.0);
var c_taken_diag = vec4(.75, .2, .5, 1.0);
var c_taken_bot = vec4(.7, .2, .8, 1.0);

var c_taken_sel_top = vec4(.664, .027, .418, 1.0); 
var c_taken_sel_diag = vec4(.522, .021, .395, 1.0);
var c_taken_sel_bot = vec4(.379, .016, .371, 1.0); 

// booth save states
const BSS_UNCHANGED = 0;
const BSS_CHANGED = 1;
const BSS_NEW = 2;
const BSS_DELETED = 4;

// border
var b = 0.999;
var boarder =[vec3(b, b, -.1), vec3(-b, b, -.1),
              vec3(-b, b, -.1), vec3(-b, -b, -.1),
              vec3(-b, -b, -.1), vec3(b, -b, -.1),
              vec3(b, -b, -.1), vec3(b, b, -.1)];

// mouse selection
var clicked_x;
var clicked_y;
var x_offset_from_center;
var y_offset_from_center;

function setZoom(level) {
    var w = 400*level;
    var h = 300*level;
    var img = document.getElementById("floorplan-obj");
    var svgDoc;
    svgDoc = img.contentDocument;
    svgDoc.getElementsByTagName("svg")[0].setAttribute("width", w);
    svgDoc.getElementsByTagName("svg")[0].setAttribute("height", h);
    canvas.width = w;
    canvas.height = h;
    image.setAttribute("width", w);
    image.setAttribute("height", h);
}

function stepU() {
    document.getElementById("zoomer").stepUp(1);
    var val = parseInt(document.getElementById("zoomer").value);
    if (val < 7) {
        setZoom(val + 1);
    }
}

function stepD() {
    document.getElementById("zoomer").stepDown(1);
    var val = parseInt(document.getElementById("zoomer").value);
    if (val > 1) {
        setZoom(val - 1);
    }
}

function loadLayout () {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var booths = JSON.parse(this.responseText);
            // TODO: get new limit for following for loop from last booth's id number
            var len = booths.length;

            if (len > 1) {
                var r = 0;
                var t = 0;
                // parse request to populate booth arrays
                for(var i = 0; i < len; i++) {
                        // get all data from booth[b]
                        var x_b = parseFloat(booths[i].x);
                        var y_b = parseFloat(booths[i].y);
                        var w_b = parseFloat(booths[i].width);
                        var h_b = parseFloat(booths[i].height);
                        var v_b = booths[i].vendor;
                        var t_b = parseInt(booths[i].boothType);
                        var num_b = parseInt(booths[i].id);

                        // set globals
                        if (highestBoothNumber < num_b) {
                            highestBoothNumber = num_b;
                        }
                        if (shortestSide > w_b) {
                            shortestSide = w_b;
                        }
                        if (shortestSide > h_b) {
                            shortestSide = h_b;
                        }

                        // make numbers
                        var numArrayIdx = numberArray.length;
                        var nums = generateStringPoints(num_b, 0);
                        var numVerts = nums.length;
                        var booth = [0, x_b, y_b, w_b, h_b, v_b, BSS_UNCHANGED, numArrayIdx, numVerts, t_b, num_b];
                        adjustToCenter(nums, booth);
                        numberArray = numberArray.concat(nums);

                        // push booth to array
                        if (booth[9] == 0) {
                            r += 1;
                            booth[0] = r
                            boothArray.push(booth);
                            generatePoints(booth, 0);  
                        }
                        else {
                            t += 1;
                            booth[0] = t;
                            triBoothArray.push(booth);
                            generateTriPoints(booth, 0);
                        }
                             

                }
                conversionFactor = 10 / shortestSide;
            }

            buildBoothSelectionArray();
            populateVendorArrays();
            makeVendorTable();
        }
    };
    xhttp.open("GET", "loaddata.php", true);
    xhttp.send();
}

function buildBoothSelectionArray() {
    if (boothArray.length == 0 && triBoothArray.length == 0) {
        return;
    }
    for (var  i = 0; i < boothArray.length; i++) {
        //                        [number, array: 0 rect 1 tri, idx]
        boothSelectionArray.push([boothArray[i][10], 0, boothArray[i][0]]);
    }
    for (i = 0; i < triBoothArray.length; i++) {
        boothSelectionArray.push([triBoothArray[i][10], 1, triBoothArray[i][0]]);
    }
    boothSelectionArray = mergeSort(boothSelectionArray, 0);
    makeSelector();
}

function makeSelector() {
    var options = "";
    for (var i = 0; i < boothSelectionArray.length; i++) {
        options += "<option value=\""+boothSelectionArray[i][0]+"\" onclick=\"selectBooth("+boothSelectionArray[i][1]+","+boothSelectionArray[i][2] +")\">"+boothSelectionArray[i][0]+"</option>";
    }
    console.log(boothSelectionArray);
    document.getElementById("boothNum").innerHTML = options;
}

function selectBooth(array, idx) {
    deselectBooth(selectedBooth);
    selectedBooth = [array, idx];
    displayBooth(selectedBooth);
}

function buildNumberArray() {
    numberArray = [];
    for (var i = 0; i < boothArray.length; i++) {
        var numArrayIdx = numberArray.length;
        var booth = boothArray[i]
        var nums = generateStringPoints(booth[10], 0);
        var numVerts = nums.length;
        boothArray[i][7] = numArrayIdx;
        boothArray[i][8] = numVerts;
        adjustToCenter(nums, booth);
        numberArray = numberArray.concat(nums);
        selectedBooth = [0,i+1];
        generatePoints(booth, 0);
        displayBooth(selectedBooth);
    }
    for (var t = 0; t < triBoothArray.length; t++) {
        var numArrayIdx = numberArray.length;
        var booth = triBoothArray[t];
        var nums = generateStringPoints(booth[10], 0);
        var numVerts = nums.length;
        triBoothArray[t][7] = numArrayIdx;
        triBoothArray[t][8] = numVerts;
        nums = adjustToCenter(nums, booth);
        numberArray = numberArray.concat(nums);
        selectedBooth = [1,t+1];
        generateTriPoints(booth, 0);
        displayBooth(selectedBooth);
        nextBoothNumber += 1;
    }
}

function initControlEvents() {
    document.getElementById("zoomer").oninput = function() {
        var zoomLevel = document.getElementById("zoomer").value;
        setZoom(zoomLevel);
    }
}

function initWindowEvents() {
    var mousePressed = false;
    
    canvas.onmousedown = function(e) {
        mousePressed = true;
        var curr_x = 2 * (e.clientX - (canvas.width / 2) - canvas.offsetLeft + window.pageXOffset) / canvas.width;
        var curr_y = -2 * (e.clientY - (canvas.height / 2) - canvas.offsetTop + window.pageYOffset) / canvas.height;

        deselectBooth(selectedBooth);
    
        selectedBooth = [0,0];
        var boothx;
        var boothy;
        var boothw2;
        var boothh2;

        for (var i = 0; i < boothArray.length; i++) {
            boothx = boothArray[i][1] / aspect;
            boothy = boothArray[i][2];
            boothw2 = boothArray[i][3] / (2*aspect);
            boothh2 = boothArray[i][4] / 2; 
            if (curr_x < boothx + boothw2 &&
                curr_x > boothx - boothw2 &&
                curr_y < boothy + boothh2 &&
                curr_y > boothy - boothh2) {

                selectedBooth = [0,i+1];
                displayBooth(selectedBooth);
                x_offset_from_center = curr_x - boothArray[i][1];
                y_offset_from_center = curr_y - boothArray[i][2];
                break;
            }
        }
        for (var i = 0; i < triBoothArray.length; i++) {
            boothx = triBoothArray[i][1] / aspect;
            boothy = triBoothArray[i][2];
            boothw2 = triBoothArray[i][3] / (2*aspect);
            boothh2 = triBoothArray[i][4] / 2; 
            if (curr_x < boothx + boothw2 &&
                curr_x > boothx - boothw2 &&
                curr_y < boothy + boothh2 &&
                curr_y > boothy - boothh2) {

                selectedBooth = [1,i+1];
                displayBooth(selectedBooth);
                x_offset_from_center = curr_x - triBoothArray[i][1];
                y_offset_from_center = curr_y - triBoothArray[i][2];
                break;
            }
        }
        if(selectedBooth[1] == 0) {
            x_offset_from_center = 0;
            y_offset_from_center = 0;
            hideBoothDetails();
        }
    }

    canvas.onmousemove = function(e) {
        var curr_x = 2 * (e.clientX - (canvas.width / 2) - canvas.offsetLeft + window.pageXOffset) / canvas.width;
        var curr_y = -2 * (e.clientY - (canvas.height / 2) - canvas.offsetTop + window.pageYOffset) / canvas.height;
        var hoverBoothIdx = -1;
        var boothx;
        var boothy;
        var boothw2;
        var boothh2;

        for (var i = 0; i < boothArray.length; i++) {
            boothx = boothArray[i][1] / aspect;
            boothy = boothArray[i][2];
            boothw2 = boothArray[i][3] / (2*aspect);
            boothh2 = boothArray[i][4] / 2; 
            if (curr_x < boothx + boothw2 &&
                curr_x > boothx - boothw2 &&
                curr_y < boothy + boothh2 &&
                curr_y > boothy - boothh2) {

                hoverBoothIdx = i;
                displayHoverBox(hoverBoothIdx, 0, e);
                break;
            }
        }
        for (i = 0; i < triBoothArray.length; i++) {
            boothx = triBoothArray[i][1] / aspect;
            boothy = triBoothArray[i][2];
            boothw2 = triBoothArray[i][3] / (2*aspect);
            boothh2 = triBoothArray[i][4] / 2; 
            if (curr_x < boothx + boothw2 &&
                curr_x > boothx - boothw2 &&
                curr_y < boothy + boothh2 &&
                curr_y > boothy - boothh2) {

                hoverBoothIdx = i;
                displayHoverBox(hoverBoothIdx, 1, e);
                break;
            }
        }
        if (hoverBoothIdx < 0) {
            hideHoverBox();
        }
    }

    canvas.onmouseup = function(e) {
        mousePressed = false;
    }
}

function deselectBooth(sb) {
    if (sb[1] < 1) {
        return;
    }
    if (sb[0] == 0) {
        var idx = (sb[1] - 1) * 6;
        // change color
        if(boothArray[sb[1]-1][5] == "") {
            colorsArray[idx] = c_open_diag;
            colorsArray[idx+1] = c_open_top;
            colorsArray[idx+2] = c_open_diag;
            colorsArray[idx+3] = c_open_diag;
            colorsArray[idx+4] = c_open_bot;
            colorsArray[idx+5] = c_open_diag;
        }
        else {
            colorsArray[idx] = c_taken_diag;
            colorsArray[idx+1] = c_taken_top;
            colorsArray[idx+2] = c_taken_diag;
            colorsArray[idx+3] = c_taken_diag;
            colorsArray[idx+4] = c_taken_bot;
            colorsArray[idx+5] = c_taken_diag;
        }
        // move to backrground
        for (var i = 0; i < 6; i++) {
            pointsArray[idx+i][2] = 0;
        }
        idx = (selectedBooth[1]-1) * 8;
        for (var i = 0; i < 8; i++) {
            linesegs[idx+i][2] = -.1;
        }
        idx = boothArray[selectedBooth[1]-1][7];
        for (var i = 0; i < boothArray[selectedBooth[1]-1][8]; i++) {
            numberArray[idx+i][2] = -.1;
        }
    }
    else {
        var idx = (sb[1] - 1) * 3;
        // change color TODO: align color gradient with orientation
        if(triBoothArray[sb[1]-1][5] == "") {
            triColorsArray[idx] = c_open_diag;
            triColorsArray[idx+1] = c_open_top;
            triColorsArray[idx+2] = c_open_diag;
        }
        else {
            triColorsArray[idx] = c_taken_diag;
            triColorsArray[idx+1] = c_taken_top;
            triColorsArray[idx+2] = c_taken_diag;
        }
        // move to backrground
        for (var i = 0; i < 3; i++) {
            triPointsArray[idx+i][2] = 0;
        }
        idx = (selectedBooth[1]-1) * 6;
        for (var i = 0; i < 6; i++) {
            triLineSegs[idx+i][2] = -.1;
        }
        idx = boothArray[selectedBooth[1]-1][7];
        for (var i = 0; i < triBoothArray[selectedBooth[1]-1][8]; i++) {
            numberArray[idx+i][2] = -.1;
        }
    }
}

function displayBooth(sb) {
    var booth;
    if (sb[0] == 0) {
        booth = boothArray[sb[1]-1];
    }
    else {
        booth = triBoothArray[sb[1]-1];
    }
    document.getElementById("boothStats").style.visibility = 'visible';
    //document.getElementById("boothNum").value = booth[0];
    var options = document.getElementsByTagName("option");
    for (var i = 0; i < options.length; i++) {
        if (options[i].value == booth[10]) {
            options[i].selected = 'selected';
        }
    }
    var w = Math.round(booth[3] * conversionFactor);
    var h = Math.round(booth[4] * conversionFactor);
    document.getElementById("boothW").innerHTML = w;
    document.getElementById("boothH").innerHTML = h;
    var a = w * h;
    if (sb[0] == 1) {
        a = a/2;
    }
    document.getElementById("boothA").innerHTML = a;
    document.getElementById("boothV").value = booth[5];
}

function hideBoothDetails() {
    document.getElementById("boothStats").style.visibility = 'hidden';
}

function displayHoverBox(idx, arr, e) {
    var num, x, y, w, h, v;
    var box = document.getElementById("hoverbox");

    if (arr == 0) {
        x = boothArray[idx][1];
        y = boothArray[idx][2];
        w = Math.round(boothArray[idx][3] * conversionFactor);
        h = Math.round(boothArray[idx][4] * conversionFactor);
        v = boothArray[idx][5];
        num = boothArray[idx][10];
    }
    else {
        x = triBoothArray[idx][1];
        y = triBoothArray[idx][2];
        w = Math.round(triBoothArray[idx][3] * conversionFactor);
        h = Math.round(triBoothArray[idx][4] * conversionFactor);
        v = triBoothArray[idx][5];
        num = triBoothArray[idx][10];
    }
    
    if (v == "") {
        v = "Available";
    }
    box.innerHTML = "<p>Number: " + num + "</p><p>Vendor: " + v +
        "</p><p>Size: " + w + " X " + h + "</p>";
    box.style.visibility = 'visible';

    var x_pos = e.clientX + window.pageXOffset;
    var y_pos = e.clientY + window.pageYOffset;

    box.style.left = (x_pos).toString() + "px";
    box.style.top = (y_pos+30).toString() + "px";
}

function hideHoverBox () {
    document.getElementById("hoverbox").style.visibility = 'hidden';
}

function sortVendors(col) {
    if (col == 0 && vendorArrayState != 0) {
        vendorArray = vendorArrayNum;
        vendorArrayState = 0;
        makeVendorTable();
    }
    else if(col == 1 && vendorArrayState != col) {
        vendorArray = vendorArrayAlpha;
        vendorArrayState = 1;
        makeVendorTable();
    }
}

function populateVendorArrays() {
    // vendorArray: [number, vendor, array, index]
    vendorArrayNum = [];
    for (var i = 0; i < boothArray.length; i++) {
        var num = boothArray[i][10];
        var id = boothArray[i][0];
        var v = boothArray[i][5]
        if (v != "") {
            vendorArrayNum.push([num, v, 0, id]);
        }
    }
    for (i = 0; i < triBoothArray.length; i++) {
        var num = triBoothArray[i][10];
        var id = triBoothArray[i][0];
        var v = triBoothArray[i][5]
        if (v != "") {
            vendorArrayNum.push([num, v, 1, id]);
        }
    }
    vendorArrayNum = mergeSort(vendorArrayNum, 0);
    vendorArrayAlpha = mergeSort(vendorArrayNum, 1);
    vendorArrayState = 0;
    vendorArray = vendorArrayNum;
}

function makeVendorTable() {
    tableContents = "";
    for (var i = 0; i < vendorArray.length; i++) {
        id = vendorArray[i][0];
        tableContents += "<tr onclick=\"highlightBooth(" + arr + ", " + id + ")\"><td>" + id + 
            "</td><td>"+ vendorArray[i][1] + "</td></tr>";
    }
    document.getElementById("vendorTable").innerHTML = tableContents;
}

function highlightBooth(arr, idx) {
    // deselect old booth
    deselectBooth(selectedBooth);
    // select new booth
    selectedBooth = [arr, idx];

    displayBooth(selectedBooth);
}

function generatePoints(booth, depth) {
    var color_t = c_taken_top;
    var color_b = c_taken_bot;
    var color_d = c_taken_diag;
    var w2 = booth[3]/2/aspect;
    var h2 = booth[4]/2;
    var x = booth[1]/aspect;
    var y = booth[2];
    var z = -.1;

    if (depth == 1) {
        z = -.3
    }
    // outline
    linesegs.push( vec3(x+w2, y+h2, z) );
    linesegs.push( vec3(x-w2, y+h2, z) );
    linesegs.push( vec3(x-w2, y+h2, z) );
    linesegs.push( vec3(x-w2, y-h2, z) );
    linesegs.push( vec3(x-w2, y-h2, z) );
    linesegs.push( vec3(x+w2, y-h2, z) );
    linesegs.push( vec3(x+w2, y-h2, z) );
    linesegs.push( vec3(x+w2, y+h2, z) );

    z += .1;
    // fill triangles
    pointsArray.push( vec4(x+w2, y+h2, z, 1) );
    pointsArray.push( vec4(x-w2, y+h2, z, 1) );
    pointsArray.push( vec4(x-w2, y-h2, z, 1) );
    pointsArray.push( vec4(x+w2, y+h2, z, 1) );
    pointsArray.push( vec4(x+w2, y-h2, z, 1) );
    pointsArray.push( vec4(x-w2, y-h2, z, 1) );
    
    if (booth[5] == "") {
        color_t = c_open_top;
        color_b = c_open_bot;
        color_d = c_open_diag;
    }
    // gradient fill
    colorsArray.push(color_d);
    colorsArray.push(color_t);
    colorsArray.push(color_d);
    colorsArray.push(color_d);
    colorsArray.push(color_b);
    colorsArray.push(color_d);
}

function generateTriPoints(booth, depth) {
    var color_t = c_taken_top;
    var color_b = c_taken_bot;
    var color_d = c_taken_diag;
    var idx = (booth[0]-1) * 6;
    var w2 = booth[3]/2/aspect;
    var h2 = booth[4]/2;
    var x = booth[1]/aspect;
    var y = booth[2];
    var z = -.1;
    if (depth == 1) {
        z = -.3
    }
    if (booth[5] == "") {
        color_t = c_open_top;
        color_b = c_open_bot;
        color_d = c_open_diag;
    }
    var type = booth[9];
    var rgt, hyp1, hyp2;
    var rgt_c, hyp1_c, hyp2_c;

    switch (type) {
        case 1:
            rgt = vec3(x-w2, y+h2, z);
            hyp1 = vec3(x+w2, y+h2, z);
            hyp2 = vec3(x-w2, y-h2, z);
            rgt_c = color_t;
            hyp1_c = color_d;
            hyp2_c = color_d;
            break;
        case 2:
            rgt = vec3(x+w2, y+h2, z);
            hyp1 = vec3(x-w2, y+h2, z);
            hyp2 = vec3(x+w2, y-h2, z);
            rgt_c = color_d;
            hyp1_c = color_t;
            hyp2_c = color_b;
            break;
        case 3:
            rgt = vec3(x+w2, y-h2, z);
            hyp1 = vec3(x+w2, y+h2, z);
            hyp2 = vec3(x-w2, y-h2, z);
            rgt_c = color_b;
            hyp1_c = color_d;
            hyp2_c = color_d;
            break;
        case 4:
            rgt = vec3(x-w2, y-h2, z);
            hyp1 = vec3(x-w2, y+h2, z);
            hyp2 = vec3(x+w2, y-h2, z);
            rgt_c = color_d;
            hyp1_c = color_t;
            hyp2_c = color_b;
            break;
        
    }
    // outline
    triLineSegs.push(hyp1);
    triLineSegs.push(hyp2);
    triLineSegs.push(hyp1);
    triLineSegs.push(rgt);
    triLineSegs.push(hyp2);
    triLineSegs.push(rgt);

    z += .1;
    // fill triangles
    idx = (booth[0]-1) * 3;
    triPointsArray.push( vec4(hyp1[0], hyp1[1], z, 1) );
    triPointsArray.push( vec4(hyp2[0], hyp2[1], z, 1) );
    triPointsArray.push( vec4(rgt[0], rgt[1], z, 1) );
 
    // gradient fill
    triColorsArray.push(hyp1_c);
    triColorsArray.push(hyp2_c);
    triColorsArray.push(rgt_c);
}

function updatePoints(booth, depth) {
    var color_t = c_taken_top;
    var color_b = c_taken_bot;
    var color_d = c_taken_diag;
    var idx = (booth[0] - 1) * 8;
    var w2 = booth[3]/2/aspect;
    var h2 = booth[4]/2;
    var x = booth[1]/aspect;
    // console.log("x: "+x+", w2: "+w2);
    var y = booth[2];
    var z = -.1;
    if (depth == 1) {
        z = -.3
    }
    // outline
    linesegs[idx] = vec3(x+w2, y+h2, z);
    linesegs[idx+1] = vec3(x-w2, y+h2, z);
    linesegs[idx+2] = vec3(x-w2, y+h2, z);
    linesegs[idx+3] = vec3(x-w2, y-h2, z);
    linesegs[idx+4] = vec3(x-w2, y-h2, z);
    linesegs[idx+5] = vec3(x+w2, y-h2, z);
    linesegs[idx+6] = vec3(x+w2, y-h2, z);
    linesegs[idx+7] = vec3(x+w2, y+h2, z);

    z += .1;
    idx = (booth[0] - 1) * 6;

    // fill triangles
    pointsArray[idx] = vec4(x+w2, y+h2, z, 1);
    pointsArray[idx+1] = vec4(x-w2, y+h2, z, 1);
    pointsArray[idx+2] = vec4(x-w2, y-h2, z, 1);
    pointsArray[idx+3] = vec4(x+w2, y+h2, z, 1);
    pointsArray[idx+4] = vec4(x+w2, y-h2, z, 1);
    pointsArray[idx+5] = vec4(x-w2, y-h2, z, 1);
    
    if (booth[5] == "") {
        color_t = c_open_top;
        color_b = c_open_bot;
        color_d = c_open_diag;
    }
    // gradient fill
    colorsArray[idx] = color_d;
    colorsArray[idx+1] = color_t;
    colorsArray[idx+2] = color_d;
    colorsArray[idx+3] = color_d;
    colorsArray[idx+4] = color_b;
    colorsArray[idx+5] = color_d;
}

function updateTriPoints(booth, depth) {
    var color_t = c_taken_top;
    var color_b = c_taken_bot;
    var color_d = c_taken_diag;
    var idx = (booth[0]-1) * 6;
    var w2 = booth[3]/2/aspect;
    var h2 = booth[4]/2;
    var x = booth[1]/aspect;
    var y = booth[2];
    var z = -.1;
    if (depth == 1) {
        z = -.3
    }
    if (booth[5] == "") {
        color_t = c_open_top;
        color_b = c_open_bot;
        color_d = c_open_diag;
    }
    var type = booth[9];
    var rgt, hyp1, hyp2;
    var rgt_c, hyp1_c, hyp2_c;

    switch (type) {
        case 1:
            rgt = vec3(x-w2, y+h2, z);
            hyp1 = vec3(x+w2, y+h2, z);
            hyp2 = vec3(x-w2, y-h2, z);
            rgt_c = color_t;
            hyp1_c = color_d;
            hyp2_c = color_d;
            break;
        case 2:
            rgt = vec3(x+w2, y+h2, z);
            hyp1 = vec3(x-w2, y+h2, z);
            hyp2 = vec3(x+w2, y-h2, z);
            rgt_c = color_d;
            hyp1_c = color_t;
            hyp2_c = color_b;
            break;
        case 3:
            rgt = vec3(x+w2, y-h2, z);
            hyp1 = vec3(x+w2, y+h2, z);
            hyp2 = vec3(x-w2, y-h2, z);
            rgt_c = color_b;
            hyp1_c = color_d;
            hyp2_c = color_d;
            break;
        case 4:
            rgt = vec3(x-w2, y-h2, z);
            hyp1 = vec3(x-w2, y+h2, z);
            hyp2 = vec3(x+w2, y-h2, z);
            rgt_c = color_d;
            hyp1_c = color_t;
            hyp2_c = color_b;
            break;
        
    }
    // outline
    triLineSegs[idx] = hyp1;
    triLineSegs[idx+1] = hyp2;
    triLineSegs[idx+2] = hyp1;
    triLineSegs[idx+3] = rgt;
    triLineSegs[idx+4] = hyp2;
    triLineSegs[idx+5] = rgt;

    z += .1;
    // fill triangles
    idx = (booth[0]-1) * 3;
    triPointsArray[idx] = vec4(hyp1[0], hyp1[1], z, 1);
    triPointsArray[idx+1] = vec4(hyp2[0], hyp2[1], z, 1);
    triPointsArray[idx+2] = vec4(rgt[0], rgt[1], z, 1);
 
    // gradient fill
    triColorsArray[idx] = hyp1_c;
    triColorsArray[idx+1] = hyp2_c;
    triColorsArray[idx+2] = rgt_c;
}

// ************************
// number rendering stuff *
// ************************
function generateNumberPoints(number, position, depth) {
    
    
    // for 45 degree edges:
    // x and y offsets are .293 and .707 instead of .33 and .67

    var numberPoints;
    var x_offset = 1.25 * position;
    var z = -.1
    if (depth == 1) {
        z = -.3;
    }

    switch (number) {
        case '0':
            numberPoints = [
                vec3(x_offset + 0, .293, z), vec3(x_offset + 0, 1.707, z),
                vec3(x_offset + 0, 1.707, z), vec3(x_offset + .293, 2, z),
                vec3(x_offset + .293, 2, z), vec3(x_offset + .707, 2, z),
                vec3(x_offset + .707, 2, z), vec3(x_offset + 1, 1.707, z),
                vec3(x_offset + 1, 1.707, z), vec3(x_offset + 1, .293, z), 
                vec3(x_offset + 1, .293, z),  vec3(x_offset + .707, 0, z),
                vec3(x_offset + .707, 0, z), vec3(x_offset + .293, 0, z),
                vec3(x_offset + .293, 0, z), vec3(x_offset + 0, .293, z)
            ];
            break;
        case '1':
            numberPoints = [
                vec3(x_offset + 0, 0, z), vec3(x_offset + 1, 0, z),
                vec3(x_offset + .5, 0, z), vec3(x_offset + .5, 2, z),
                vec3(x_offset + .5, 2, z), vec3(x_offset + .2, 1.7, z)
            ];
            break;
        case '2':
            numberPoints = [
                vec3(x_offset + 0, 1.707, z), vec3(x_offset + .293, 2, z),
                vec3(x_offset + .293, 2, z), vec3(x_offset + .707, 2, z),
                vec3(x_offset + .707, 2, z), vec3(x_offset + 1, 1.707, z),
                vec3(x_offset + 1, 1.707, z), vec3(x_offset + 1, 1.293, z),
                vec3(x_offset + 1, 1.293, z), vec3(x_offset + 0, 0, z),
                vec3(x_offset + 0, 0, z), vec3(x_offset + 1, 0, z)
            ];
            break;
        case '3': 
            numberPoints = [
                vec3(x_offset + 0, 1.707, z), vec3(x_offset + .293, 2, z),
                vec3(x_offset + .293, 2, z), vec3(x_offset + .707, 2, z),
                vec3(x_offset + .707, 2, z), vec3(x_offset + 1, 1.707, z),
                vec3(x_offset + 1, 1.707, z), vec3(x_offset + 1, 1.293, z),
                vec3(x_offset + 1, 1.293, z), vec3(x_offset + .707, 1, z),
                vec3(x_offset + .707, 1, z), vec3(x_offset + .293, 1, z),
                vec3(x_offset + .707, 1, z), vec3(x_offset + 1, .707, z),
                vec3(x_offset + 1, .707, z), vec3(x_offset + 1, .293, z),
                vec3(x_offset + 1, .293, z), vec3(x_offset + .707, 0, z),
                vec3(x_offset + .707, 0, z), vec3(x_offset + .293, 0, z),
                vec3(x_offset + .293, 0, z), vec3(x_offset + 0, .293, z)
            ];
            break;
        case '4':
            numberPoints = [
                vec3(x_offset + .75, 0, z), vec3(x_offset + .75, 2, z),
                vec3(x_offset + .75, 2, z), vec3(x_offset + 0, .707, z),
                vec3(x_offset + 0, .707, z), vec3(x_offset + 1, .707, z)
            ];
            break;
        case '5':
            numberPoints = [
                vec3(x_offset + 1, 2, z), vec3(x_offset + 0, 2, z),
                vec3(x_offset + 0, 2, z), vec3(x_offset + 0, 1.15, z),
                vec3(x_offset + 0, 1.15, z), vec3(x_offset + .707, 1.15, z),
                vec3(x_offset + .707, 1.15, z), vec3(x_offset + 1, .857, z),
                vec3(x_offset + 1, .857, z), vec3(x_offset + 1, .293, z),
                vec3(x_offset + 1, .293, z), vec3(x_offset + .707, 0, z),
                vec3(x_offset + .707, 0, z), vec3(x_offset + .293, 0, z),
                vec3(x_offset + .293, 0, z), vec3(x_offset + 0, .293, z)
            ];
            break;
        case '6':
            numberPoints = [
                vec3(x_offset + 1, 1.707, z), vec3(x_offset + .707, 2, z),
                vec3(x_offset + .707, 2, z), vec3(x_offset + .293, 2, z), 
                vec3(x_offset + .293, 2, z), vec3(x_offset + 0, 1.707, z),
                vec3(x_offset + 0, 1.707, z), vec3(x_offset + 0, .293, z),
                vec3(x_offset + 0, .293, z), vec3(x_offset + .293, 0, z),
                vec3(x_offset + .293, 0, z), vec3(x_offset + .707, 0, z),
                vec3(x_offset + .707, 0, z), vec3(x_offset + 1, .293, z),
                vec3(x_offset + 1, .293, z), vec3(x_offset + 1, .857, z),
                vec3(x_offset + 1, .857, z), vec3(x_offset + .707, 1.15, z),
                vec3(x_offset + .707, 1.15, z), vec3(x_offset + .293, 1.15, z),
                vec3(x_offset + .293, 1.15, z), vec3(x_offset + 0, .857, z)
            ];
            break;
        case '7':
            numberPoints = [
                vec3(x_offset + 0, 2, z), vec3(x_offset + 1, 2, z),
                vec3(x_offset + 1, 2, z), vec3(x_offset + .293, 0, z)
            ];
            break;
        case '8':
            numberPoints = [
                vec3(x_offset + 0, .293, z), vec3(x_offset + 0, .707, z),
                vec3(x_offset + 0, .707, z), vec3(x_offset + .293, 1, z),
                vec3(x_offset + .293, 1, z), vec3(x_offset + .707, 1, z),
                vec3(x_offset + .293, 1, z), vec3(x_offset + 0, 1.293, z),
                vec3(x_offset + 0, 1.293, z), vec3(x_offset + 0, 1.707, z),
                vec3(x_offset + 0, 1.707, z), vec3(x_offset + .293, 2, z),
                vec3(x_offset + .293, 2, z), vec3(x_offset + .707, 2, z),
                vec3(x_offset + .707, 2, z), vec3(x_offset + 1, 1.707, z),
                vec3(x_offset + 1, 1.707, z), vec3(x_offset + 1, 1.293, z),
                vec3(x_offset + 1, 1.293, z), vec3(x_offset + .707, 1, z),
                vec3(x_offset + .707, 1, z), vec3(x_offset + 1, .707, z),
                vec3(x_offset + 1, .707, z), vec3(x_offset + 1, .293, z),
                vec3(x_offset + 1, .293, z), vec3(x_offset + .707, 0, z),
                vec3(x_offset + .707, 0, z), vec3(x_offset + .293, 0, z),
                vec3(x_offset + .293, 0, z), vec3(x_offset + 0, .293, z),
            ];
            break;
        case '9':
            numberPoints = [ 
                vec3(x_offset + 0, .293, z), vec3(x_offset + .293, 0, z),
                vec3(x_offset + .293, 0, z), vec3(x_offset + .707, 0, z), 
                vec3(x_offset + .707, 0, z), vec3(x_offset + 1, .293, z),
                vec3(x_offset + 1, .293, z), vec3(x_offset + 1, 1.707, z),
                vec3(x_offset + 1, 1.707, z), vec3(x_offset + .707, 2, z),
                vec3(x_offset + .707, 2, z), vec3(x_offset + .293, 2, z),
                vec3(x_offset + .293, 2, z), vec3(x_offset + 0, 1.707, z),
                vec3(x_offset + 0, 1.707, z), vec3(x_offset + 0, 1.143, z),
                vec3(x_offset + 0, 1.143, z), vec3(x_offset + .293, .85, z),
                vec3(x_offset + .293, .85, z), vec3(x_offset + .707, .85, z),
                vec3(x_offset + .707, .85, z), vec3(x_offset + 1, 1.143, z)
            ]
            break;
    }

    return numberPoints;
}

function generateStringPoints(booth_id, depth) {
    var num_str = booth_id.toString();
    var num_array = [];
    for (var i = 0; i < num_str.length; i++) {
         num_array = num_array.concat(generateNumberPoints(num_str.charAt(i), i, depth));
    }
    return num_array;
}

function adjustToCenter(array, booth) {
    var scale = 0;
    var str = booth[10].toString();
    var str_w = str.length * 1.25+.25;
    var b_w = booth[3];
    var b_h = booth[4];

    if(booth[9] == 0) {  // square 
        // scale the text to a proper size
        if (str_w > 0){
            scale = b_w / str_w;
        }
        if (2.5 * scale > b_h) {
            scale = b_h / 2.5;
        }
        if (scale > .037) {
            scale = .037;
        }
        for (var i = 0; i < array.length; i++) {
            array[i][0] *= scale; 
            array[i][1] *= scale;
        }

        // find center of scaled string
        var str_c_x = (str_w/2-.25)*scale;
        var str_c_y = scale;
        
        // find offsets from center_x and center_y
        var off_x = booth[1] - str_c_x;
        var off_y = booth[2] - str_c_y;

        // adjust entire array by offsets and scale
        for (var i = 0; i < array.length; i++) {
            array[i][0] += off_x;
            array[i][0] /= aspect;
            array[i][1] += off_y;
        }
        return array;
    }
    else {  // triangle
        // find size of inscribed rectangle
        var r_h = b_h * b_w / (b_h * (str_w/2) + b_w);
        var r_w = (str_w/2) * r_h;
        // scale the text to a proper size
        if (str_w > 0) {
            scale = r_w / str_w;
        }
        if (2.5 * scale > r_h) {
            scale = r_h / 2.5;
        }
        if (scale > .037) {
            scale = .037;
        }
        for (var i = 0; i < array.length; i++) {
            array[i][0] *= scale; 
            array[i][1] *= scale;
        }
        // find center of scaled string
        var str_c_x = (str_w/2-.25)*scale;
        var str_c_y = scale;

        // find offsets from center_x and center_y
        var off_x;
        var off_y;
        switch (booth[9]) {  // on type
            case 1:
                off_x = booth[1] - b_w/2 + r_w/2 - str_c_x;
                off_y = booth[2] + b_h/2 - r_h/2 - str_c_y;
                break;
            case 2:
                off_x = booth[1] + b_w/2 - r_w/2 - str_c_x;
                off_y = booth[2] + b_h/2 - r_h/2 - str_c_y;
                break;
            case 3:
                off_x = booth[1] + b_w/2 - r_w/2 - str_c_x;
                off_y = booth[2] - b_h/2 + r_h/2 - str_c_y;
                break;
            case 4:
                off_x = booth[1] - b_w/2 + r_w/2 - str_c_x;
                off_y = booth[2] - b_h/2 + r_h/2 - str_c_y;    
                break;
        }
        // adjust entire array by offsets and scale
        for (var i = 0; i < array.length; i++) {
            array[i][0] += off_x;
            array[i][0] /= aspect;
            array[i][1] += off_y;
        }
        return array;
    }
        
}

function adjustNumber(sb) {
    var booth;
    var nums;
    if (sb[0] == 0) {
        booth = boothArray[sb[1]-1];
    }
    else {
        booth = triBoothArray[sb[1]-1];
    }
    // make numbers
    nums = adjustToCenter(generateStringPoints(booth[10], 1), booth);
    var numArrayIdx = booth[7];
    var limit = booth[8];
    // copy over new values
    for(var i = 0; i < limit; i++) {
        numberArray[numArrayIdx + i] = nums[i];
    }
}
// ****************
// End of numbers *
// ****************

function render() {
    var idx;
    // change color of selected booth
    if (selectedBooth[1] > 0) {
        if (selectedBooth[0] == 0){
            idx = (selectedBooth[1]-1)*6;
            if (boothArray[selectedBooth[1]-1][5] == "") {
                colorsArray[idx] = c_open_sel_diag;
                colorsArray[idx+1] = c_open_sel_top;
                colorsArray[idx+2] = c_open_sel_diag;
                colorsArray[idx+3] = c_open_sel_diag;
                colorsArray[idx+4] = c_open_sel_bot;
                colorsArray[idx+5] = c_open_sel_diag;
            }
            else {
                colorsArray[idx] = c_taken_sel_diag;
                colorsArray[idx+1] = c_taken_sel_top;
                colorsArray[idx+2] = c_taken_sel_diag;
                colorsArray[idx+3] = c_taken_sel_diag;
                colorsArray[idx+4] = c_taken_sel_bot;
                colorsArray[idx+5] = c_taken_sel_diag;
            }
        }
        else {
            idx = (selectedBooth[1]-1)*3;
            if (triBoothArray[selectedBooth[1]-1][5] == "") {
                triColorsArray[idx] = c_open_sel_diag;
                triColorsArray[idx+1] = c_open_sel_top;
                triColorsArray[idx+2] = c_open_sel_diag;
            }
            else {
                triColorsArray[idx] = c_taken_sel_diag;
                triColorsArray[idx+1] = c_taken_sel_top;
                triColorsArray[idx+2] = c_taken_sel_diag;
            }
        }
    }
    
    // Ensure OpenGL viewport is resized to match canvas dimensions
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    // Set screen clear color to white
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // Enable color; required for clearing the screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Clear out the viewport with solid white color
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
    // Draw background
    gl.useProgram(texShader);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );

    gl.bindBuffer(gl.ARRAY_BUFFER, tCoordBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(floorplanTex), gl.DYNAMIC_DRAW);

    var vTexCoord = gl.getAttribLocation(texShader, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, tPointBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(floorplanPoints), gl.DYNAMIC_DRAW);

    var vPosition3 = gl.getAttribLocation(texShader, "vPosition3");
    gl.vertexAttribPointer(vPosition3, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition3);

    gl.bindTexture( gl.TEXTURE_2D, texture );

    gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
    gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
    gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // use sq program
    gl.useProgram(sqShader);
    var combinedColors = colorsArray.concat(triColorsArray);
    var combinedPoints = pointsArray.concat(triPointsArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(combinedColors), gl.DYNAMIC_DRAW );
    var vColor = gl.getAttribLocation( sqShader, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(combinedPoints), gl.DYNAMIC_DRAW );
    var vPosition2 = gl.getAttribLocation( sqShader, "vPosition2" );
    gl.vertexAttribPointer( vPosition2, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition2);

    var len = combinedColors.length;
    if(len > 0){
        gl.drawArrays(gl.TRIANGLES, 0, len);
    }

    // Use 2D program
    gl.useProgram(shader);

    // Set line color 
    gl.uniform3fv(gl.getUniformLocation(shader, "lineColor"), vec3(0.2, 0.2, 0.2));

    var vPosition = gl.getAttribLocation(shader, "vPosition");

    // Draw boarder
    gl.bindBuffer( gl.ARRAY_BUFFER, boarderBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(boarder), gl.DYNAMIC_DRAW );
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 8);

    // Draw line segments for all booths
    len = linesegs.length;
    if (len > 0) {
        gl.bindBuffer( gl.ARRAY_BUFFER, lineBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(linesegs), gl.DYNAMIC_DRAW );
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, len);
    }
    
    len = triLineSegs.length;
    if (len > 0) {
        gl.bindBuffer( gl.ARRAY_BUFFER, triLineBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(triLineSegs), gl.DYNAMIC_DRAW );
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, len);
    }

    // Draw numbers for all booths
    len = numberArray.length;
    if (len > 0) {
        gl.bindBuffer( gl.ARRAY_BUFFER, numBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(numberArray), gl.DYNAMIC_DRAW );
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, len);
    }
}

window.onload = function() {
    image = document.getElementById("floorplan-img");
    
    // get the canvas
    canvas = document.getElementById("gl-canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    aspect =  canvas.width/canvas.height;
    // console.log(aspect);
    loadLayout();

    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); 
    }
    
    gl.enable(gl.DEPTH_TEST);

    // Load shaders
    shader = initShaders(gl, "vertex-shader-2d", "fragment-shader");
    sqShader = initShaders(gl, "vertex-shader", "fragment-shader-sq");
    texShader = initShaders(gl, "tex-vertex-shader", "tex-fragment-shader");

    // create and bind boarder buffer
    boarderBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boarderBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(boarder), gl.DYNAMIC_DRAW);

    // create and bind line buffer
    lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(linesegs), gl.DYNAMIC_DRAW);

    // line buffer for triangular booths
    triLineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triLineBuffer);

    // create and bind number buffer
    numBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, numBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(numberArray), gl.DYNAMIC_DRAW);

    // create color buffer
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW);

    // triangle booth color buffer
    triColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triColorBuffer);

    // create triangle buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW);

    // triangle booth point buffer
    triPointBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triPointBuffer);

    // create texture buffer 
    tCoordBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tCoordBufferId);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(floorplanTex), gl.DYNAMIC_DRAW);

    // create background point buffer
    tPointBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tPointBufferId);

    // Enable the position attribute for our 2D shader program.
    gl.useProgram(shader);
    var vPosition = gl.getAttribLocation(shader, "vPosition");
    gl.enableVertexAttribArray(vPosition);

    // Enable position and color attributes for triangles
    gl.useProgram(sqShader);

    var vColor = gl.getAttribLocation( sqShader, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor);

    var vPosition2 = gl.getAttribLocation( sqShader, "vPosition2" );
    gl.vertexAttribPointer( vPosition2, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition2 );

    // Enable attributes for texture mapping
    gl.useProgram(texShader);

    // Texture object
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );

    // Set up events for the HTML controls
    initControlEvents();

    // Set up mouse and keyboard input
    initWindowEvents();
    
    // Start continuous rendering
    window.setInterval(render, 33);
};