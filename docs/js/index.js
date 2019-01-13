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
uniform mat4 uModelview;
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

const vertexShader = vertexShaderInput.value;
const fragmentShader = fragmentShaderInput.value;

console.log('vertexes:', vertexes);
console.log('colors:', colors);
console.log('vertexShader:', vertexShader);
console.log('fragmentShader:', fragmentShader);
