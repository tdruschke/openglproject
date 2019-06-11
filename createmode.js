// webgl global variables
var canvas;
var gl;
var aspect;

// shaders
var shader;

// buffers
var lineBuffer;
var boarderBuffer;
var vBuffer;
var cBuffer;

// other global variables
var nextBoothNumber = 1;
var boothArray = [];
var linesegs = [];

var pointsArray = [];
var colorsArray = [];

var maxBooths;
var selectedBooth = 0;
var snap = 1;

var triangleColor;
var c_open = vec4(.2, .8, .8, 1.0);
var c_taken = vec4(.8, .2, .2, 1.0);

// booth save states
const BSS_UNCHANGED = 0;
const BSS_CHANGED = 1;
const BSS_NEW = 2;

// border
var b = 0.999;
var boarder =[vec2(b, b), vec2(-b, b),
              vec2(-b, b), vec2(-b,-b),
              vec2(-b, -b), vec2(b, -b),
              vec2(b, -b), vec2(b, b)];

// mouse selection
var clicked_x;
var clicked_y;

function newBooth() {
    if (nextBoothNumber <= maxBooths) {
        var number = nextBoothNumber;
        nextBoothNumber += 1;
        var x = y = 0.0;
        var h = 0.2;
        var w = 0.2;
        var vendor = "";
        var booth = [number, x, y, w, h, vendor, BSS_NEW];
        selectedBooth = number;
        boothArray.push(booth);
        generatePoints(booth);
        displayBooth(selectedBooth);
    }
    else {
        alert("Maximum booth limit reached!");
    }
}

function saveLayout() {
    console.log(boothArray);
    var boothData = {
        "new" : [],
        "changed" : []
    };
    var n = c = 0;
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
    }
    
    var data = "json_string="+JSON.stringify(boothData);
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "savedata.php", true);
    xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    console.log(data);
    xhttp.send(data);
}

function loadLayout () {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var booths = JSON.parse(this.responseText);
            console.log(booths);
            for(var i = 0; i < booths.length; i++) {
                var id_i = parseInt(booths[i].id);
                var x_i = parseFloat(booths[i].x);
                var y_i = parseFloat(booths[i].y);
                var w_i = parseFloat(booths[i].width);
                var h_i = parseFloat(booths[i].height);
                var v_i = booths[i].vendor;
                var booth = [id_i, x_i, y_i, w_i, h_i, v_i, BSS_UNCHANGED];
                selectedBooth = id_i;
                boothArray.push(booth);
                generatePoints(booth);
                displayBooth(selectedBooth);
                nextBoothNumber = id_i + 1;
            }

        }

    };
    xhttp.open("GET", "loaddata.php", true);
    xhttp.send();
    
}

function initControlEvents() {
    // numBooths on change
    document.getElementById("numBooths").onchange = function() {
        maxBooths = parseFloat(document.getElementById("numBooths").value);
    }

    // zoom

    // change x
    document.getElementById("boothX").onchange = function() {
        var x = parseFloat(document.getElementById("boothX").value);
        boothArray[selectedBooth-1][1] = x;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        
        generatePoints(boothArray[selectedBooth-1]);
    }

    // change y
    document.getElementById("boothY").onchange = function() {
        var y = parseFloat(document.getElementById("boothY").value);
        boothArray[selectedBooth-1][2] = y;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        generatePoints(boothArray[selectedBooth-1]);
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
        generatePoints(boothArray[selectedBooth-1]);
    }

    document.getElementById("boothNum").onchange = function() {
        selectedBooth = document.getElementById("boothNum").value;
        displayBooth(selectedBooth);
    }

    // change vendor
    document.getElementById("boothV").onchange = function() {
        var v = document.getElementById("boothV").value;
        boothArray[selectedBooth-1][5] = v;
        if (boothArray[selectedBooth-1][6] != BSS_NEW) {
            boothArray[selectedBooth-1][6] = BSS_CHANGED;
        }
        generatePoints(boothArray[selectedBooth-1]);
    }
    // change rotation?
    // delete selected booth?
}

function initWindowEvents() {
    var mousePressed = false;
    
    canvas.onmousedown = function(e) {
        mousePressed = true;
        var curr_x = 2 * (e.clientX - (canvas.width / 2) - canvas.offsetLeft) / canvas.width;
        var curr_y = -2 * (e.clientY - (canvas.height / 2) - canvas.offsetTop) / canvas.height;
        
        selectedBooth = 0;
        var boothx;
        var boothy;
        var boothw2;
        var boothh2;

        for (var i = 0; i < boothArray.length; i++) {
            boothx = boothArray[i][1];
            boothy = boothArray[i][2];
            boothw2 = boothArray[i][3] / 2;
            boothh2 = boothArray[i][4] / 2; 
            if (curr_x < boothx + boothw2 &&
                curr_x > boothx - boothw2 &&
                curr_y < boothy + boothh2 &&
                curr_y > boothy - boothh2) {
                    selectedBooth = i+1;
                    displayBooth(selectedBooth);
                    break;
                }
        }
        if(selectedBooth == 0) {
            hideBoothDetails();
        }
    }

    canvas.onmousemove = function(e) {
        if (mousePressed) {
            if (selectedBooth > 0) {
                var new_x = 2 * (e.clientX - (canvas.width / 2) - canvas.offsetLeft) / canvas.width;
                var new_y = -2 * (e.clientY - (canvas.height / 2) - canvas.offsetTop) / canvas.height;

                boothArray[selectedBooth-1][1] = parseFloat(new_x.toFixed(snap)); 
                boothArray[selectedBooth-1][2] = parseFloat(new_y.toFixed(snap));
                if (boothArray[selectedBooth-1][6] != BSS_NEW) {
                    boothArray[selectedBooth-1][6] = BSS_CHANGED;
                }
                generatePoints(boothArray[selectedBooth-1]);
                displayBooth(selectedBooth);
            }
        }
    }

    canvas.onmouseup = function(e) {
        mousePressed = false;
    }
}

function displayBooth(b) {
    document.getElementById("boothStats").style.visibility = 'visible';
    var booth = boothArray[b-1];
    document.getElementById("boothNum").value=booth[0];
    document.getElementById("boothX").value=booth[1];
    document.getElementById("boothY").value=booth[2];
    document.getElementById("boothW").value=booth[3];
    document.getElementById("boothH").value=booth[4];
    document.getElementById("boothV").value=booth[5];
}

function hideBoothDetails() {
    document.getElementById("boothStats").style.visibility = 'hidden';
}

function generatePoints(booth) {
    var color = c_open;
    var idx = (booth[0] - 1) * 8;
    var w2 = booth[3]/2;
    var h2 = booth[4]/2;
    var x = booth[1];
    var y = booth[2];
    // outline
    linesegs[idx] = vec2(x+w2, y+h2);
    linesegs[idx+1] = vec2(x-w2, y+h2);
    linesegs[idx+2] = vec2(x-w2, y+h2);
    linesegs[idx+3] = vec2(x-w2, y-h2);
    linesegs[idx+4] = vec2(x-w2, y-h2);
    linesegs[idx+5] = vec2(x+w2, y-h2);
    linesegs[idx+6] = vec2(x+w2, y-h2);
    linesegs[idx+7] = vec2(x+w2, y+h2);
    // fill 
    idx = (booth[0]-1) * 6;
    pointsArray[idx] = vec4(x+w2, y+h2, 0, 1);
    pointsArray[idx+1] = vec4(x-w2, y+h2, 0, 1);
    pointsArray[idx+2] = vec4(x-w2, y-h2, 0, 1);

    pointsArray[idx+3] = vec4(x+w2, y+h2, 0, 1);
    pointsArray[idx+4] = vec4(x+w2, y-h2, 0, 1);
    pointsArray[idx+5] = vec4(x-w2, y-h2, 0, 1);
    
    if(booth[5] != "") {
        color = c_taken;
    }
    
    for (var i = 0; i < 6; i++) {
        colorsArray[idx+i] = color;
    }
    // console.log("color array size = " + colorsArray.length);
}

function render() {
    // Ensure OpenGL viewport is resized to match canvas dimensions
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    // Set screen clear color to R, G, B, alpha; where 0.0 is 0% and 1.0 is 100%
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Enable color; required for clearing the screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Clear out the viewport with solid black color
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
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
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 8);

    // Draw line segments for all booths
    len = linesegs.length;
    if(len > 0){
        gl.bindBuffer( gl.ARRAY_BUFFER, lineBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(linesegs), gl.DYNAMIC_DRAW );
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, len);
    }
}

window.onload = function() {

    loadLayout();

    // get initial values from DOM
    maxBooths = parseFloat(document.getElementById("numBooths").value);

    // get the canvas
    canvas = document.getElementById("gl-canvas");

    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); 
    }
    
    gl.enable(gl.DEPTH_TEST);

    aspect =  canvas.width/canvas.height;

    // Load shaders
    shader = initShaders(gl, "vertex-shader-2d", "fragment-shader");
    sqShader = initShaders(gl, "vertex-shader", "fragment-shader-sq");

    // create and bind boarder buffer
    boarderBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boarderBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(boarder), gl.DYNAMIC_DRAW);

    // create and bind line buffer
    lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(linesegs), gl.DYNAMIC_DRAW);

    // create color buffer
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW);

    // create triangle buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW);

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

    //triangleColor = gl.getUniformLocation(sqShader, "fColor");

    //gl.uniform4fv(triangleColor, vec4(.3,.7,.7,1));

    // Set up events for the HTML controls
    initControlEvents();

    // Setup mouse and keyboard input
    initWindowEvents();
    
    // Start continuous rendering
    window.setInterval(render, 33);
};