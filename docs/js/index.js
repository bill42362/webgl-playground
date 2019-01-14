// index.js
'use strict';

const defaultVertexes = `function() {
  return [
    [
      [0, 0, 0], [1, 0, 0], [1, 1, 0],
      [0, 0, 0], [1, 1, 0], [0, 1, 0],
    ],
  ];
}`;
const defaultColors = `function() {
  return [
    [
      [0.5, 0, 0, 1], [0, 0.5, 0, 1], [1, 1, 1, 1],
      [0.5, 0, 0, 1], [1, 1, 1, 1], [0, 0, 0.5, 1],
    ],
  ];
}`;
const defaultVertexShader = `attribute vec4 aPosition;
attribute vec4 aColor;
uniform mat4 uModelView;
uniform mat4 uProjection;
varying lowp vec4 vColor;

void main(void) {
  gl_Position = uProjection * uModelView * aPosition;
  vColor = aColor;
}
`;
const defaultFragmentShader = `varying lowp vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
}
`;

const vertexesInput = document.getElementById('vertexes');
vertexesInput.value = defaultVertexes;
const colorsInput = document.getElementById('colors');
colorsInput.value = defaultColors;
const vertexShaderInput = document.getElementById('vertexShader');
vertexShaderInput.value = defaultVertexShader;
const fragmentShaderInput = document.getElementById('fragmentShader');
fragmentShaderInput.value = defaultFragmentShader;

const vertexesFunction = Function('"use strict"; return (' + vertexesInput.value + ')')();
const vertexes = vertexesFunction();
const colorsFunction = Function('"use strict"; return (' + colorsInput.value + ')')();
const colors = colorsFunction();
const vertexShaderSource = vertexShaderInput.value;
const fragmentShaderSource = fragmentShaderInput.value;

const canvas = document.getElementById('canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext('webgl', { antialias: true });

// Shaders:
function createShader (gl, sourceCode, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    throw 'Could not compile WebGL shader. \n\n' + info;
  }
  return shader;
}

const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
const fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

// Program:
function createProgram (gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw 'Could not compile WebGL program. \n\n' + info;
  }
  return program;
}

const program = createProgram(gl, vertexShader, fragmentShader);
const programInfo = {
  program: program,
  attributeLocations: {
    aPosition: gl.getAttribLocation(program, 'aPosition'),
    aColor: gl.getAttribLocation(program, 'aColor'),
  },
  uniformLocations: {
    uModelView: gl.getUniformLocation(program, 'uModelView'),
    uProjection: gl.getUniformLocation(program, 'uProjection'),
  },
};

// Bind buffers:
function createBuffer (gl, array) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
  return buffer;
}
const aPositionArray = vertexes.flatMap(a => a.flatMap(a => a));
const aPositionBuffer = createBuffer(gl, aPositionArray);
const aColorArray = colors.flatMap(a => a.flatMap(a => a));
const aColorBuffer = createBuffer(gl, aColorArray);

// Projection Matrix:
function createProjection (fieldOfViewInRadians, aspectRatio, near, far) {
  const f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
  const rangeInv = 1 / (near - far);
 
  return [
    f / aspectRatio, 0,                         0,   0,
                  0, f,                         0,   0,
                  0, 0,   (near + far) * rangeInv,  -1,
                  0, 0, near * far * rangeInv * 2,   0,
  ];
}
const fieldOfViewInRadians = Math.PI * 0.5; // 45°
const aspectRatio = canvas.clientWidth / canvas.clientHeight;
const nearClippingPlaneDistance = 1;
const farClippingPlaneDistance = 50;
const uProjection = createProjection(
  fieldOfViewInRadians,
  aspectRatio,
  nearClippingPlaneDistance,
  farClippingPlaneDistance
);

// View Matrix:
function getVectorSub (a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3], 1];
}
function getVectorCross (a, b) {
  return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0], 1];
}
function getVectorLength (a) {
  return Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
}
function getVectorVersor (a) {
  const invLength = 1.0 / getVectorLength(a);
  return [a[0]*invLength, a[1]*invLength, a[2]*invLength, 1];
}
function getMatrixFastInverse (a) {
  return [
    a[ 0], a[ 4], a[ 8], 0.0,
    a[ 1], a[ 5], a[ 9], 0.0,
    a[ 2], a[ 6], a[10], 0.0,
    -(a[12]*a[ 0] + a[13]*a[ 1] + a[14]*a[ 2]),
    -(a[12]*a[ 4] + a[13]*a[ 5] + a[14]*a[ 6]),
    -(a[12]*a[ 8] + a[13]*a[ 9] + a[14]*a[10]),
    1.0
  ];
}
function createView (eye, lookAt, up) {
  const z = getVectorVersor(getVectorSub(eye, lookAt));
  const x = getVectorVersor(getVectorCross(getVectorVersor(up), z));
  const y = getVectorVersor(getVectorCross(getVectorVersor(z), x));
  return getMatrixFastInverse([
    x[0], x[1], x[2], 0,
    y[0], y[1], y[2], 0,
    z[0], z[1], z[2], 0,
    eye[0], eye[1], eye[2], 1,
  ]);
}
const uModelView = createView([0.5, 0.5, 1], [0.5, 0.5, 0], [0, 1, 0]);

// clear:
gl.clearColor(0, 0, 0, 1);
gl.clearDepth(1);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// vertex:
{ 
  const numComponents = 3;  // pull out 3 values per iteration
  const type = gl.FLOAT;    // the data in the buffer is 32bit floats
  const normalize = false;  // don't normalize
  const stride = 0;         // how many bytes to get from one set of values to the next
                            // 0 = use type and numComponents above
  const offset = 0;         // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, aPositionBuffer);
  gl.vertexAttribPointer(
    programInfo.attributeLocations.aPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(programInfo.attributeLocations.aPosition);
}

// color:
{ 
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, aColorBuffer);
  gl.vertexAttribPointer(
    programInfo.attributeLocations.aColor,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(programInfo.attributeLocations.aColor);
}

gl.useProgram(programInfo.program);
gl.uniformMatrix4fv(
  programInfo.uniformLocations.uProjection,
  false,
  uProjection
);
gl.uniformMatrix4fv(
  programInfo.uniformLocations.uModelView,
  false,
  uModelView
);

// draw:
{
  const offset = 0;
  const vertexCount = 6;
  gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
}
