import { defaults } from './helpers';
import MapMatrix from './map-matrix';

export default class MapItem {
    settings = {};
    maps = [];
    instances = [];
    active = true;
    pixelsToWebGLMatrix = new Float32Array(16);
    mapMatrix = new MapMatrix();
    program = null;
    matrix = null;
    verts = null;

    constructor(settings) {
        if (new.target === MapItem) {
            throw new TypeError('Cannot construct MapItem instances directly');
        }

        this.checkAbstractMethods();

        this.instances.push(this);
        this.settings = defaults(settings, this.defaultSettings);

        if (!settings.data) {
            throw new Error('no "data" array setting defined');
        }

        if (!settings.map) {
            throw new Error('no leaflet "map" object setting defined');
        }

        let glLayer = this.glLayer = L.canvasOverlay(() => {
                this.drawOnCanvas();
            })
                .addTo(settings.map),
            canvas = this.canvas = glLayer.canvas;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        canvas.style.position = 'absolute';

        if (settings.className) {
            canvas.className += ' ' + settings.className;
        }

        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        this
            .setup()
            .render();
    }

    checkAbstractMethods() {
        if (typeof this.defaultSettings === 'undefined') {
            throw new TypeError('You must override `defaultSettings`');
        }

        if (typeof this.render !== 'function') {
            throw new TypeError('You must override the `render` method');
        }

        if (typeof this.drawOnCanvas !== 'function') {
            throw new TypeError('You must override the `drawOnCanvas` method');
        }

        if (typeof this.resetVertices !== 'function') {
            throw new TypeError('You must override the `resetVertices` method');
        }
    }

    setup() {
        let settings = this.settings;
        if (settings.click) {
            L.glify.setupClick(settings.map);
        }

        return this
            .setupVertexShader()
            .setupFragmentShader()
            .setupProgram();
    }

    setupVertexShader() {
        let gl = this.gl,
            settings = this.settings,
            vertexShaderSource = typeof settings.vertexShaderSource === 'function' ? settings.vertexShaderSource() : settings.vertexShaderSource,
            vertexShader = gl.createShader(gl.VERTEX_SHADER);

        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        this.vertexShader = vertexShader;

        return this;
    }

    setupFragmentShader() {
        let gl = this.gl,
            settings = this.settings,
            fragmentShaderSource = typeof settings.fragmentShaderSource === 'function' ? settings.fragmentShaderSource() : settings.fragmentShaderSource,
            fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        this.fragmentShader = fragmentShader;

        return this;
    }

    setupProgram() {
        // link shaders to create our program
        let gl = this.gl,
            program = gl.createProgram();

        gl.attachShader(program, this.vertexShader);
        gl.attachShader(program, this.fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        this.program = program;

        return this;
    }

    addTo(map) {
        this.glLayer.addTo(map || this.settings.map);
        this.active = true;
        return this.render();
    }

    remove() {
        this.settings.map.removeLayer(this.glLayer);
        this.active = false;
        return this;
    }
}
