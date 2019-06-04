<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html;charset=utf-8" >
        <title>Booth Creator</title>

        <script id="vertex-shader" type="x-shader/x-vertex">
            // ###### Vertex shader for 3D rendering --- ADD CODE HERE ######
            attribute vec4 vPosition;

            uniform mat4 modelView;
            uniform mat4 projection;

            void main() 
            { 
                gl_Position = projection*modelView*vPosition;
                gl_PointSize = 2.0;
            }
        </script>

        <script id="fragment-shader" type="x-shader/x-fragment">
            precision mediump float;
            
            uniform vec3 lineColor;

            void main()
            {
                gl_FragColor = vec4(lineColor, 1.0);
            }
        </script>
        
        <script id="vertex-shader-2d" type="x-shader/x-vertex">
            attribute vec2 vPosition;

            void main()
            {
                gl_Position = vec4(vPosition, 0, 1);
                gl_PointSize = 8.0;
            }
        </script>

        <!-- Included in the folder but can also be Downloaded: http://www.cs.unm.edu/~angel/WebGL/7E/Common/angelCommon.zip -->
        <script type="text/javascript" src="webgl-utils.js"></script>
        <script type="text/javascript" src="initShaders.js"></script>
        <script type="text/javascript" src="MV.js"></script>
        
    </head>

    <body> 
        <p id="demo">Draw Mode</p>

        <canvas id="gl-canvas" width="512" height="400">
            Oops ... your browser doesn't support the HTML5 canvas element
        </canvas>

        <!-- Javascript File is included in the Folder -->
        <script type="text/javascript" src="program2.js"></script>
        <div>
            <input onclick="newBooth()" type="button" value="New Booth" id="btnNewBooth" />
        </div>
        <div id="numBoothsDiv">
            Maximum Number of Booths: <input id="numBooths" type="number" value="20" min="1" max="100" step="1" />
        </div>
        <div id="stepsDiv" style="visibility:hidden" >
            Number of steps per curve: <input id="stepsPerCurve" type="number" value="6" min="2" max="10" step="1" />
        </div>
    </body>
</html>