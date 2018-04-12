uniform mat4 matrix;

attribute vec4 vertex;
attribute float pointSize;
attribute vec4 color;
uniform sampler2D texture;

varying vec4 _color;
varying vec4 _vertex;
varying sampler2D _texture;

void main() {
  //set the size of the point
  gl_PointSize = pointSize;

  //multiply each vertex by a matrix.
  gl_Position = matrix * vertex;

  //pass the color to the fragment shader
  _color = color;
  _texture = texture;
  _vertex = vertex;
}
