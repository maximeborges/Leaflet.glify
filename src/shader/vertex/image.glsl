uniform mat4 matrix;
attribute vec4 vertex;
attribute float pointSize;
attribute vec4 color;
varying vec4 _color;
varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;
varying highp vec2 _vTextureCoord;
uniform sampler2D _uSampler;

void main() {
  //set the size of the point
  gl_PointSize = pointSize;

  //multiply each vertex by a matrix.
  gl_Position = matrix * vertex;

  //pass the color to the fragment shader
  _color = color;
  _vTextureCoord = vTextureCoord;
  _uSampler = uSampler;
}
