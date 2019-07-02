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

var texture;

// other global variables
var nextBoothNumber = 1;

var boothArray = [];
var linesegs = [];
var numberArray = [];

var pointsArray = [];
var colorsArray = [];

// priority queue for deletion
var deletedQueue = new priorityQueue();

var floorplanPoints = [vec3(1.0, 1.0, 0.1), vec3(-1.0, 1.0, 0.1),
                       vec3(-1.0, -1.0, 0.1), vec3(1.0, 1.0, 0.1),
                       vec3(1.0, -1.0, 0.1), vec3(-1.0, -1.0, 0.1)];
var floorplanTex = [vec2(1,0), vec2(0,0), vec2(0,1),
                    vec2(1,0), vec2(1,1), vec2(0,1)];
var image;

var maxBooths; // eventually a craft variable

var numBooths;
var selectedBooth = 0;
var snap = 1000;

var count;

var triangleColor;
// colors for booths
// var c_open_top = vec4(.2, .6, .8, 1.0);
// var c_open_diag = vec4(.2, .75, .85, 1.0);
// var c_open_bot = vec4(.2, .9, .9, 1.0);

var c_open_top = vec4(.2, .9, .9, 1.0);
var c_open_diag = vec4(.5, .95, .95, 1.0);
var c_open_bot = vec4(.8, 1, 1, 1.0);


// var c_open_sel_top = vec4(.1, .5, .7, 1.0);
// var c_open_sel_diag = vec4(.1, .6, .7, 1.0);
// var c_open_sel_bot = vec4(.1, .7, .7, 1.0);

var c_open_sel_top = vec4(.305, .328, .781, 1.0);
var c_open_sel_diag = vec4(.5, .514, .88, 1.0);
var c_open_sel_bot = vec4(.7, .7, .98, 1.0);

var c_taken_top = vec4(.8, .2, .2, 1.0);
var c_taken_diag = vec4(.75, .2, .5, 1.0);
var c_taken_bot = vec4(.7, .2, .8, 1.0);

// var c_taken_sel_top = vec4(.75, .281, .281, 1.0);
// var c_taken_sel_diag = vec4(.516, .145, .281, 1.0);
// var c_taken_sel_bot = vec4(.281, .0, .281, 1.0);

// var c_taken_sel_top = vec4(.797, .168, .367, 1.0);
// var c_taken_sel_diag = vec4(.627, .198, .449, 1.0);
// var c_taken_sel_bot = vec4(.457, .227, .531, 1.0);

var c_taken_sel_top = vec4(.664, .027, .418, 1.0); 
var c_taken_sel_diag = vec4(.522, .021, .395, 1.0);
var c_taken_sel_bot = vec4(.379, .016, .371, 1.0); 

// booth save states
const BSS_UNCHANGED = 0;
const BSS_CHANGED = 1;
const BSS_NEW = 2;
const BSS_TO_DELETE = 3;
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

function newBooth() {
    var number;
    var x = y = 0.0;
    var h = 0.2;
    var w = 0.2;
    var vendor = "";
    var booth;
    if(deletedQueue.size > 0) {
        number = deletedQueue.extract_min();
        console.log("adding booth: "+number);
        booth = boothArray[number-1];
        booth[1] = x;
        booth[2] = y;
        booth[3] = w;
        booth[4] = h;
        booth[5] = vendor;
        booth[6] = BSS_NEW;
        //booth[1] = 0.0;

        deselectBooth(selectedBooth);
        selectedBooth = number;
        generatePoints(booth, 1);
        var nums = generateStringPoints(number, 1);
        adjustNumber(number-1);

        displayBooth(selectedBooth);
    }
    else if (nextBoothNumber <= maxBooths) {
        number = nextBoothNumber;
        var nums = [];
        nextBoothNumber += 1;

        // make numbers
        var numArrayIdx = numberArray.length;
        var nums = generateStringPoints(number,1);
        var numVerts = nums.length;
        var booth = [number, x, y, w, h, vendor, BSS_NEW, numArrayIdx, numVerts];
        adjustToCenter(nums, booth);
        numberArray = numberArray.concat(nums);

        deselectBooth(selectedBooth);
        selectedBooth = number;
        boothArray.push(booth);
        generatePoints(booth, 1);
        displayBooth(selectedBooth);

        numBooths += 1;

        // console.log("booth added");
    }
    else {
        alert("Maximum booth limit reached!");
    }
}

function deleteBooth() {
    var boothNum = selectedBooth;
    if (boothNum > 0) {
        deletedQueue.insert(boothNum);
        var idx = boothNum - 1;
        var i;
        var numIdx = boothArray[idx][7];
        for (i = 0; i < boothArray[idx][8]; i++) {
            numberArray[numIdx + i] = vec3(2+.1*i,2*.12*i, -.1);
        }
        boothArray[idx][1] = 4;
        boothArray[idx][2] = 4;
        generatePoints(boothArray[idx], 0);
        boothArray[idx][5] = "NOT CREATED";
        boothArray[idx][6] = BSS_TO_DELETE;
        hideBoothDetails();
        selectedBooth = 0;
    }
}

function saveLayout() {
    // json to hold data
    var boothData = {
        "new" : [],
        "changed" : [],
        "deleted" : []
    };
    var n = c = d = 0;

    // populate json
    for(var i = 0; i < boothArray.length; i++) {
        if (boothArray[i][6] == BSS_NEW) {
            boothData.new[n] = {
                "id": boothArray[i][0],
                "x": boothArray[i][1],
                "y": boothArray[i][2],
                "w": boothArray[i][3],
                "h": boothArray[i][4],
                "vendor": boothArray[i][5]
            };
            boothArray[i][6] = BSS_UNCHANGED;
            n += 1;
        }
        else if (boothArray[i][6] == BSS_CHANGED) {
            boothData.changed[c] = {
                "id": boothArray[i][0],
                "x": boothArray[i][1],
                "y": boothArray[i][2],
                "w": boothArray[i][3],
                "h": boothArray[i][4],
                "vendor": boothArray[i][5]
            };
            boothArray[i][6] = BSS_UNCHANGED;
            c += 1; 
        }
        else if (boothArray[i][6] == BSS_TO_DELETE) {
            boothData.deleted[d] = {"id": boothArray[i][0]};
            boothArray[i][6] = BSS_DELETED;
            d += 1;
        }
    }
    
    // send post request
    var data = "json_string="+JSON.stringify(boothData);
    console.log(data);
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "savedata.php", true);
    xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhttp.send(data);
}

function loadLayout () {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var booths = JSON.parse(this.responseText);
            // TODO: get new limit for following for loop from last booth's id number
            var len = booths.length;
            var limit = booths[len-1][0];
            var b = 0;
            var id_b = parseInt(booths[b].id);
            // parse request to populate boothArray
            // iterate over entire range of numbers in response, rather than just the array
            for(var i = 1; i <= limit; i++) {
                
                if (id_b == i) {
                    // load all data from booth[b]
                    var x_b = parseFloat(booths[b].x);
                    var y_b = parseFloat(booths[b].y);
                    var w_b = parseFloat(booths[b].width);
                    var h_b = parseFloat(booths[b].height);
                    var v_b = booths[b].vendor;

                    // make numbers
                    var numArrayIdx = numberArray.length;
                    var nums = generateStringPoints(id_b, 0);
                    var numVerts = nums.length;
                    var booth = [id_b, x_b, y_b, w_b, h_b, v_b, BSS_UNCHANGED, numArrayIdx, numVerts];
                    adjustToCenter(nums, booth);
                    numberArray = numberArray.concat(nums);

                    
                    selectedBooth = id_b;
                    boothArray.push(booth);
                    generatePoints(booth, 0);
                    displayBooth(selectedBooth);
                    nextBoothNumber = id_b + 1;

                    // increment for next iteration
                    b += 1;
                    if (i < limit) {
                        id_b = parseInt(booths[b].id);
                    }
                    
                }
                else {
                    // add null booth data to arrays
                    var numArrayIdx = numberArray.length;
                    var nums = generateStringPoints(i, 0);
                    var numVerts = nums.length;
                    var booth = [i, 2,2, 0,0,"NOT CREATED", BSS_DELETED, numArrayIdx, numVerts];
                    adjustToCenter(nums, booth);
                    numberArray = numberArray.concat(nums);

                    boothArray.push(booth);
                    generatePoints(booth, 0);
                    nextBoothNumber = i + 1;

                    // add booth id to p-queue
                    deletedQueue.insert(i);
                }
            }

            numBooths = boothArray.length;
            if (maxBooths < numBooths) {
                maxBooths = numBooths;
            }
            document.getElementById("numBooths").value = numBooths;
            // console.log(numberArray);
            // makeVendorTable();
        }
    };
    xhttp.open("GET", "loaddata.php", true);
    xhttp.send();
}

function processSVG() {
    var img = document.getElementById("floorplan-obj");
    var svgDoc;
    svgDoc = img.contentDocument;
    var list = svgDoc.getElementsByTagName("path");
    var id_i = 1;
    var str;
    var arr = [];
    var x, y, w, h;

    for (var i = 0; i < list.length; i++) {
        if (list[i].getAttribute("stroke") == "blue") {
            // parse string to get points from path
            str = list[i].getAttribute("d");
            str = str.replace(/M/g," ");
            str = str.replace(/L/g," ");
            str = str.trim();
            arr = str.split(" ");
            if (arr.length == 16) {  // make rectangular booth
                // get height, width, position
                w = parseFloat(arr[6]) - parseFloat(arr[0]);
                h = parseFloat(arr[3]) - parseFloat(arr[1]);
                x = parseFloat(arr[0]) + w/2;
                y = parseFloat(arr[1]) + h/2;
                
                // scale to fit on canvas
                w = .4/w;
                h = .4/h;
                x = x/150; // TODO: dynamically get from image
                x = x - 1.33;
                y = y/150; // TODO: dynamically get from image
                y = y - .365;
                y *= -1;
                y += 1.5;

                // make booth
                var numArrayIdx = numberArray.length;
                var nums = generateStringPoints(id_i, 0);
                var numVerts = nums.length;
                var booth = [id_i, x, y, w, h, "", BSS_UNCHANGED, numArrayIdx, numVerts];
                adjustToCenter(nums, booth);
                numberArray = numberArray.concat(nums);
                selectedBooth = id_i;
                boothArray.push(booth);
                generatePoints(booth, 0);
                id_i += 1;
                displayBooth(selectedBooth);
                nextBoothNumber = id_i;
            }
            else if (arr.length == 12){
                // make triangular booth
            }
        }
    }
    console.log(boothArray);
    // console.log(pointsArray);
    // console.log(linesegs);
    // console.log(numberArray);
}

function initControlEvents() {
    // numBooths on change
    document.getElementById("numBooths").onchange = function() {
        maxBooths = parseFloat(document.getElementById("numBooths").value);
    }

    // change x
    document.getElementById("boothX").onchange = function() {
        var x = parseFloat(document.getElementById("boothX").value);
        boothArray[selectedBooth-1][1] = x;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        generatePoints(boothArray[selectedBooth-1],1);
        adjustNumber(selectedBooth-1);
    }

    // change y
    document.getElementById("boothY").onchange = function() {
        var y = parseFloat(document.getElementById("boothY").value);
        boothArray[selectedBooth-1][2] = y;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        generatePoints(boothArray[selectedBooth-1],1);
        adjustNumber(selectedBooth-1);
    }

    // change height, width
    document.getElementById("boothH").onchange = 
    document.getElementById("boothW").onchange = function() {
        var h = parseFloat(document.getElementById("boothH").value);
        var w = parseFloat(document.getElementById("boothW").value);
        boothArray[selectedBooth-1][3] = w;
        boothArray[selectedBooth-1][4] = h;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        generatePoints(boothArray[selectedBooth-1],1);
        adjustNumber(selectedBooth-1);
    }

    document.getElementById("boothNum").onchange = function() {
        // deselect old booth
        deselectBooth(selectedBooth);
        // select new booth
        selectedBooth = document.getElementById("boothNum").value;
        if (selectedBooth > numBooths) {
            selectedBooth = 1;
        }
        else if (selectedBooth < 1) {
            selectedBooth = numBooths;
        }

        displayBooth(selectedBooth);
    }

    // change vendor
    document.getElementById("boothV").onchange = function() {
        var v = document.getElementById("boothV").value;
        boothArray[selectedBooth-1][5] = v;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        // generatePoints(boothArray[selectedBooth-1],1);
    }
    // change rotation?
}

function initWindowEvents() {
    var mousePressed = false;
    
    canvas.onmousedown = function(e) {
        mousePressed = true;
        var curr_x = 2 * (e.clientX - (canvas.width / 2) - canvas.offsetLeft + window.pageXOffset) / canvas.width;
        var curr_y = -2 * (e.clientY - (canvas.height / 2) - canvas.offsetTop + window.pageYOffset) / canvas.height;

        deselectBooth(selectedBooth);
    
        selectedBooth = 0;
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

                selectedBooth = i+1;
                displayBooth(selectedBooth);
                // console.log(selectedBooth);
                x_offset_from_center = curr_x - boothArray[i][1];
                y_offset_from_center = curr_y - boothArray[i][2];
                // console.log("Curr x: " + curr_x);
                // console.log("Booth x: "+ boothArray[i][1]);
                break;
            }
        }
        if(selectedBooth == 0) {
            x_offset_from_center = 0;
            y_offset_from_center = 0;
            hideBoothDetails();
        }
    }

    canvas.onmousemove = function(e) {
        if (mousePressed) {
            if (selectedBooth > 0) {
                var new_x = 2 * (e.clientX - (canvas.width / 2) - canvas.offsetLeft + window.pageXOffset) / canvas.width * aspect; // - x_offset_from_center * aspect;
                //new_x *= aspect;
                //new_x += x_offset_from_center* aspect;
                var new_y = -2 * (e.clientY - (canvas.height / 2) - canvas.offsetTop + window.pageYOffset) / canvas.height - y_offset_from_center;

                boothArray[selectedBooth-1][1] = parseFloat((Math.ceil(new_x*snap)/snap).toFixed(2)); 
                boothArray[selectedBooth-1][2] = parseFloat((Math.ceil(new_y*snap)/snap).toFixed(2));
                if (boothArray[selectedBooth-1][6] != BSS_NEW) {
                    boothArray[selectedBooth-1][6] = BSS_CHANGED;
                }
                generatePoints(boothArray[selectedBooth-1], 1);
                adjustNumber(selectedBooth-1);
                displayBooth(selectedBooth);
            }
        }
    }

    canvas.onmouseup = function(e) {
        mousePressed = false;
    }
}

function deselectBooth(sb) {
    if (sb < 1) {
        return;
    }
    // change color
    var idx = (sb - 1) * 6;
    if(boothArray[sb-1][5] == "") {
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
    idx = (selectedBooth-1) * 8;
    for (var i = 0; i < 8; i++) {
        linesegs[idx+i][2] = -.1;
    }
    idx = boothArray[selectedBooth-1][7];
    for (var i = 0; i < boothArray[selectedBooth-1][8]; i++) {
        numberArray[idx+i][2] = -.1;
    }
}

function displayBooth(b) {
    document.getElementById("boothStats").style.visibility = 'visible';
    var booth = boothArray[b-1];
    document.getElementById("boothNum").value = booth[0];
    document.getElementById("boothX").value = booth[1];
    document.getElementById("boothY").value = booth[2];
    document.getElementById("boothW").value = booth[3];
    document.getElementById("boothH").value = booth[4];
    document.getElementById("boothV").value = booth[5];
}

function hideBoothDetails() {
    document.getElementById("boothStats").style.visibility = 'hidden';
}

function generatePoints(booth, depth) {
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
    // fill triangles
    idx = (booth[0]-1) * 6;
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

// function makeVendorTable() {
//     tableContents = "";
//     for (var i = 0; i < boothArray.length; i++) {
//         if (boothArray[i][5] != "" && boothArray[i][6] < BSS_TO_DELETE) {
//             tableContents += "<tr><td>" + boothArray[i][0] + 
//                 "</td><td>"+ boothArray[i][5] + "</td></tr>";
//         }
//     }
//     console.log(tableContents);
//     document.getElementById("vendorTable").innerHTML = tableContents;
// }

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
    // convert number to string
    var num_str = booth_id.toString();
    var num_array = [];
    // iterate over individual characters in string
    for (var i = 0; i < num_str.length; i++) {
        // call generateNumberPoints on each and push to array
         num_array = num_array.concat(generateNumberPoints(num_str.charAt(i), i, depth));
    }
    // return array
    return num_array;
}

function adjustToCenter(array, booth) {
    // scale the text to a proper size
    var scale = 0;
    var str = booth[0].toString();
    var str_w = str.length * 1.25+.25;

    var b_w = booth[3]
    var b_h = booth[4];

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
    // console.log("adjusted booth number: " + booth[0]);
    return array;
}

function adjustNumber(idx) {
    var booth = boothArray[idx];
    // make numbers
    var nums = adjustToCenter(generateStringPoints(booth[0], 1), booth);
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
    // change color of selected booth
    if (selectedBooth > 0) {
        var idx = (selectedBooth-1)*6;
        if (boothArray[selectedBooth-1][5] == "") {
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

    // animate first booth
    // count++;
    // boothArray[0][1] = Math.sin(count/10.0);
    // generatePoints(boothArray[0]);
    // displayBooth(1);
    
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

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW );
    var vColor = gl.getAttribLocation( sqShader, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW );
    var vPosition2 = gl.getAttribLocation( sqShader, "vPosition2" );
    gl.vertexAttribPointer( vPosition2, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition2);

    var len = colorsArray.length;
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
    console.log(aspect);
    // loadLayout();
    processSVG();
 
    // get initial values from DOM
    maxBooths = parseFloat(document.getElementById("numBooths").value);

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
    gl.bufferData(gl.ARRAY_BUFFER, flatten(linesegs), gl.DYNAMIC_DRAW);

    // create and bind number buffer
    numBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, numBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(numberArray), gl.DYNAMIC_DRAW);

    // create color buffer
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW);

    // create triangle buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW);

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