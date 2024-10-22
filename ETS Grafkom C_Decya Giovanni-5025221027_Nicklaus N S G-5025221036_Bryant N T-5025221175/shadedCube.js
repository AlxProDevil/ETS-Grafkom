"use strict";

var shadedCube = function() {
    var canvas;
    var gl;

    var numPositions = 36;

    var positionsArray = [];
    var normalsArray = [];

    let position = 0.0;
    let yPosition = 0.0;

    let initialVelocity = 0.0;
    let mass = 0.0;
    let force = 0.0;
    let acceleration = 0.0;
    let time = 0.0;
    let elapsedTime = 0.0;
    let isMoving = false;

    let velocityC = 0.0;

    let velocityY = 0.0;
    let initialVerticalVelocity = 0.0;
    let gravity = 0.0;
    let isParabolic = false;

    var vertices = [
        vec4(-0.25, -0.25,  0.25, 1.0),
        vec4(-0.25,  0.25,  0.25, 1.0),
        vec4(0.25,  0.25,  0.25, 1.0),
        vec4(0.25, -0.25,  0.25, 1.0),
        vec4(-0.25, -0.25, -0.25, 1.0),
        vec4(-0.25,  0.25, -0.25, 1.0),
        vec4(0.25,  0.25, -0.25, 1.0),
        vec4(0.25, -0.25, -0.25, 1.0)
    ];

    var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
    var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
    var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

    var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
    var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
    var materialSpecular = vec4(1.0, 0.8, 0.0, 1.0);
    var materialShininess = 100.0;

    var ctm;
    var ambientColor, diffuseColor, specularColor;
    var modelViewMatrix, projectionMatrix;
    var modelViewMatrixLoc, projectionMatrixLoc;
    var eye;
    const at = vec3(0.0, 0.0, 0.0);
    const up = vec3(0.0, 1.0, 0.0);
    var program;

    var xAxis = 0;
    var yAxis = 1;
    var zAxis = 2;
    var axis = 0;
    var theta = vec3(0, 0, 0);

    var thetaLoc;

    var flag = false;

    function quad(a, b, c, d) {
        var t1 = subtract(vertices[b], vertices[a]);
        var t2 = subtract(vertices[c], vertices[b]);
        var normal = normalize(cross(t1, t2));

        positionsArray.push(vertices[a]);
        normalsArray.push(normal);
        positionsArray.push(vertices[b]);
        normalsArray.push(normal);
        positionsArray.push(vertices[c]);
        normalsArray.push(normal);
        positionsArray.push(vertices[a]);
        normalsArray.push(normal);
        positionsArray.push(vertices[c]);
        normalsArray.push(normal);
        positionsArray.push(vertices[d]);
        normalsArray.push(normal);
    }

    function colorCube() {
        quad(1, 0, 3, 2);
        quad(2, 3, 7, 6);
        quad(3, 0, 4, 7);
        quad(6, 5, 1, 2);
        quad(4, 5, 6, 7);
        quad(5, 4, 0, 1);
    }

    function init() {
        canvas = document.getElementById("gl-canvas");

        gl = canvas.getContext('webgl2');
        if (!gl) alert("WebGL 2.0 isn't available");

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        program = initShaders(gl, "vertex-shader", "fragment-shader");
        gl.useProgram(program);

        colorCube();

        var nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

        var normalLoc = gl.getAttribLocation(program, "aNormal");
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalLoc);

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

        var positionLoc = gl.getAttribLocation(program, "aPosition");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        var materialColor = vec4(0.5, 0.5, 1.0, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "uMaterialColor"), flatten(materialColor));

        thetaLoc = gl.getUniformLocation(program, "uTheta");

        modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
        projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

        document.getElementById("ButtonX").onclick = function() { axis = xAxis; };
        document.getElementById("ButtonY").onclick = function() { axis = yAxis; };
        document.getElementById("ButtonZ").onclick = function() { axis = zAxis; };
        document.getElementById("ButtonT").onclick = function() { flag = !flag; };

        // Add event listeners for color inputs
        document.getElementById("ambientColor").addEventListener("input", updateColors);
        document.getElementById("diffuseColor").addEventListener("input", updateColors);
        document.getElementById("specularColor").addEventListener("input", updateColors);

        // Add event listeners for light position inputs
        document.getElementById("lightPositionX").addEventListener("input", updateLightPosition);
        document.getElementById("lightPositionY").addEventListener("input", updateLightPosition);
        document.getElementById("lightPositionZ").addEventListener("input", updateLightPosition);

        document.getElementById("cubeColor").addEventListener("input", function() {
            var cubeColor = hexToRgb(document.getElementById("cubeColor").value);
            materialColor = vec4(cubeColor.r, cubeColor.g, cubeColor.b, 1.0);
            gl.uniform4fv(gl.getUniformLocation(program, "uMaterialColor"), flatten(materialColor));
        });

        document.getElementById("start-constant").onclick = function () {
            velocityC = parseFloat(document.getElementById("velocityC").value);
            time = parseFloat(document.getElementById("timeC").value);
            acceleration = 0.0;
            elapsedTime = 0.0;
            initialVelocity = velocityC;
            isMoving = true;
        };

        document.getElementById("reset-constant").onclick = (function () {
            isMoving = false;
            elapsedTime = 0.0;
            velocity = document.getElementById("velocity").innerText = 0;
            ;
        });

        document.getElementById("start-accelerated").onclick = function () {
            mass = parseFloat(document.getElementById("mass").value);
            force = parseFloat(document.getElementById("force").value);
            time = parseFloat(document.getElementById("timeA").value);
            acceleration = force / mass;
            elapsedTime = 0.0;
            initialVelocity = 0.0;
            isMoving = true;
        };

        document.getElementById("reset-accelerated").onclick = function () {
            isMoving = false;
            elapsedTime = 0.0;
            velocity = document.getElementById("velocity").innerText = 0;
            ;
        };

        document.getElementById("start-parabolic").onclick = function () {
            initialVelocity = parseFloat(document.getElementById("Xvelocity").value);
            initialVerticalVelocity = parseFloat(document.getElementById("Yvelocity").value);
            gravity = parseFloat(document.getElementById("gravity").value);
            time = parseFloat(document.getElementById("timeP").value);
            acceleration = 0.0;  // No horizontal acceleration in parabolic motion
            elapsedTime = 0.0;
            isMoving = true;
            isParabolic = true;
        };

        document.getElementById("reset-parabolic").onclick = function () {
            isMoving = false; //tadi true
            isParabolic = false;
            elapsedTime = 0.0;
            document.getElementById("velocity").innerText = 0;
            document.getElementById("acceleration").innerText = 0;
        };
        
        document.getElementById("ButtonResetRotation").onclick = function() { 
            theta = vec3(0, 0, 0);
            flag = false; // Stop rotation if it's currently active
        };

        // Set up initial camera position
        eye = vec3(0.0, 0.0, 2.0);
        modelViewMatrix = lookAt(eye, at, up);
        projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

        updateColors();
        updateLightPosition();
        render();
    }

    function updateLightPosition() {
        var x = parseFloat(document.getElementById("lightPositionX").value);
        var y = parseFloat(document.getElementById("lightPositionY").value);
        var z = parseFloat(document.getElementById("lightPositionZ").value);
     
        lightPosition = vec4(x, y, z, 0.0);
     
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), flatten(lightPosition));
    }
     
    function updateColors() {
        var ambientColor = hexToRgb(document.getElementById("ambientColor").value);
        var diffuseColor = hexToRgb(document.getElementById("diffuseColor").value);
        var specularColor = hexToRgb(document.getElementById("specularColor").value);
     
        materialAmbient = vec4(ambientColor.r, ambientColor.g, ambientColor.b, 1.0);
        materialDiffuse = vec4(diffuseColor.r, diffuseColor.g, diffuseColor.b, 1.0);
        materialSpecular = vec4(specularColor.r, specularColor.g, specularColor.b, 1.0);
     
        var ambientProduct = mult(lightAmbient, materialAmbient);
        var diffuseProduct = mult(lightDiffuse, materialDiffuse);
        var specularProduct = mult(lightSpecular, materialSpecular);
     
        gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
        gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);
     }
    
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : null;
    }
    
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        if (flag) theta[axis] += 2.0;
    
        if (isMoving) {
            elapsedTime += 0.016;  // Approximately 60 FPS
            let velocity = initialVelocity + (acceleration * elapsedTime);  // Vt = V0 + a * t
            position += velocity * 0.016;

            if (isParabolic) {
                velocityY = initialVerticalVelocity - gravity * elapsedTime;    // Vt = V0 - g * t
                yPosition += velocityY * 0.016;
            }
            
            //Tadi 0.0
            if (position > 3.0) {
                position = -3.0;
            } else if (position < -3.0) {
                position = 3.0;
            }

            if (yPosition > 1.5) {
                yPosition = -1.5;
            } else if (yPosition < -1.5) {
                yPosition = 1.5;
            }
    
            document.getElementById("velocity").innerText = velocity.toFixed(2);
            document.getElementById("velocityY").innerText = velocityY.toFixed(2);
            document.getElementById("acceleration").innerText = acceleration.toFixed(2); // X Axis acceleration
            document.getElementById("accelerationY").innerText = gravity.toFixed(2); // Y Axis acceleration

            document.getElementById("PositionX").value = position.toFixed(1);
            document.getElementById("PositionY").value = yPosition.toFixed(1);
    
            if (elapsedTime >= time) {
                isMoving = false;
                isParabolic = false;
            }
        }

        if (!isMoving) {
            position = parseFloat(document.getElementById("PositionX").value); 
            yPosition = parseFloat(document.getElementById("PositionY").value);

            document.getElementById("positionDisplay").innerHTML = "Initial X Position: " + position + " | Initial Y Position: " + yPosition;
        }
    
        modelViewMatrix = lookAt(eye, at, up);
        modelViewMatrix = mult(modelViewMatrix, translate(position, yPosition, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[xAxis], vec3(1, 0, 0)));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[yAxis], vec3(0, 1, 0)));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[zAxis], vec3(0, 0, 1)));
    
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniform3fv(thetaLoc, theta);
    
        gl.drawArrays(gl.TRIANGLES, 0, numPositions);
        requestAnimationFrame(render);
    }    

    init();
}

shadedCube();
