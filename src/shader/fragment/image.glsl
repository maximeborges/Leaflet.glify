precision mediump float;
varying vec4 _color;
uniform float opacity;

varying highp vec4 _vertex;
uniform sampler2D _texture;

void main() {
    vec2 m = gl_PointCoord.xy - vec2(0.0, 0.0);

  gl_FragColor = texture2D(_texture, m);
}
