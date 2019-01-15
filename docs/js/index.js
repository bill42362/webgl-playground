// index.js
'use strict';

const defaultPositions = `function() {
  return [
    [
      [0, 0, 0], [1, 0, 0, 1], [1, 1, 0],
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
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
varying lowp vec4 vColor;

void main(void) {
  gl_Position = uProjection * uModel * uView * aPosition;
  vColor = aColor;
}
`;
const defaultFragmentShader = `varying lowp vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
}
`;

const positionsInput = document.getElementById('positions');
positionsInput.value = defaultPositions;
const colorsInput = document.getElementById('colors');
colorsInput.value = defaultColors;
const vertexShaderInput = document.getElementById('vertexShader');
vertexShaderInput.value = defaultVertexShader;
const fragmentShaderInput = document.getElementById('fragmentShader');
fragmentShaderInput.value = defaultFragmentShader;

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

// Program:
function createProgram (gl, shaders) {
  const program = gl.createProgram();
  gl.attachShader(program, shaders.vertex);
  gl.attachShader(program, shaders.fragment);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw 'Could not compile WebGL program. \n\n' + info;
  }
  return program;
}
function getLocations (gl, program) {
  return {
    attributes: {
      aPosition: gl.getAttribLocation(program, 'aPosition'),
      aColor: gl.getAttribLocation(program, 'aColor'),
    },
    uniforms: {
      uProjection: gl.getUniformLocation(program, 'uProjection'),
      uView: gl.getUniformLocation(program, 'uView'),
      uModel: gl.getUniformLocation(program, 'uModel'),
    },
  };
}
function dockUniform (gl, locations, uniforms) {
  gl.uniformMatrix4fv(locations.uProjection, false, uniforms.uProjection);
  gl.uniformMatrix4fv(locations.uView, false, uniforms.uView);
  gl.uniformMatrix4fv(locations.uModel, false, uniforms.uModel);
}

// Buffers:
function createBuffer (gl, source) {
  const arraysFunction = Function('"use strict"; return (' + source + ')')();
  const arrays = arraysFunction();
  const numComponents = arrays[0][0].length;
  // trim by first array length
  const array = arrays.flatMap(a => a.flatMap(a => a.slice(0, numComponents)));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
  return {
    buffer: buffer,
    numComponents: numComponents,
    count: Math.floor(array.length/numComponents),
    type: gl.FLOAT,
    normalize: false,
    offset: 0,
    // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    stride: 0,
  };
}
function dockBuffer (gl, location, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
  gl.vertexAttribPointer(
    location,
    buffer.numComponents,
    buffer.type,
    buffer.normalize,
    buffer.stride,
    buffer.offset
  );
  gl.enableVertexAttribArray(location);
}

// Projection Matrix:
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
const eye = [0.5, 0.5, 1];
const lookAt = [0.5, 0.5, 0];
const up = [0, 1, 0];
const uView = createView(eye, lookAt, up);

// Model Matrix:
const uModel = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const glState = {
  sources: {
    attributes: {
      position: null,
      color: null,
    },
    shaders: {
      vertex: null,
      fragment: null,
    },
  },
  program: null,
  shaders: { vertex: null, fragment: null },
  locations: {
    attributes: { aPosition: null, aColor: null },
    uniforms: { uProjection: null, uView: null, uModel: null },
  },
  buffers: { aPosition: null, aColor: null },
  uniforms: { uProjection: uProjection, uView: uView, uModel: uModel },
};

function nextFrame () {
  let isPositionBufferChanged = false;
  if (positionsInput.value !== glState.sources.attributes.position) {
    try {
      glState.sources.attributes.position = positionsInput.value;
      glState.buffers.aPosition = createBuffer(gl, glState.sources.attributes.position);
      isPositionBufferChanged = true;
    } catch (error) {
      console.log('Create position buffer fail. error:', error);
    }
  }

  let isColorBufferChanged = false;
  if (colorsInput.value !== glState.sources.attributes.color) {
    try {
      glState.sources.attributes.color = colorsInput.value;
      glState.buffers.aColor = createBuffer(gl, glState.sources.attributes.color);
      isColorBufferChanged = true;
    } catch (error) {
      console.log('Create color buffer fail. error:', error);
    }
  }

  let isShaderChanged = false;
  if (vertexShaderInput.value !== glState.sources.shaders.vertex) {
    try {
      glState.sources.shaders.vertex = vertexShaderInput.value;
      const vertexShader = createShader(gl, glState.sources.shaders.vertex, gl.VERTEX_SHADER);
      glState.shaders.vertex = vertexShader;
      isShaderChanged = true;
    } catch (error) {
      console.log('Compile vertex shader fail. error:', error);
    }
  }
  if (fragmentShaderInput.value !== glState.sources.shaders.fragment) {
    try {
      glState.sources.shaders.fragment = fragmentShaderInput.value;
      const fragmentShader = createShader(gl, glState.sources.shaders.fragment, gl.FRAGMENT_SHADER);
      glState.shaders.fragment = fragmentShader;
      isShaderChanged = true;
    } catch (error) {
      console.log('Compile fragment shader fail. error:', error);
    }
  }

  if (isShaderChanged) {
    glState.program = createProgram(gl, glState.shaders);
    glState.locations = getLocations(gl, glState.program);
  }

  if (isShaderChanged || isPositionBufferChanged) {
    dockBuffer(
      gl,
      glState.locations.attributes.aPosition,
      glState.buffers.aPosition
    );
  }

  if (isShaderChanged || isColorBufferChanged) {
    dockBuffer(
      gl,
      glState.locations.attributes.aColor,
      glState.buffers.aColor
    );
  }

  // clear:
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // draw:
  gl.useProgram(glState.program);
  dockUniform(gl, glState.locations.uniforms, glState.uniforms);

  const offset = 0;
  const vertexCount = glState.buffers.aPosition.count;
  gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
}

nextFrame();

// Matrix:
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
