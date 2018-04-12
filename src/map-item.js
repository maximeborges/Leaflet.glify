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
    longitudeKey = 1;
    latitudeKey = 0;

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

        let glLayer = this.glLayer = L.canvasOverlay(() => this.drawOnCanvas()).addTo(settings.map),
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

    /**
     *
     * @param targetLocation
     * @param points
     * @param map
     * @returns {*}
     */
    closest(targetLocation, points, map) {
        if (points.length < 1) {
            return null;
        }

        return points.reduce((prev, curr) => {
            let prevDistance = this.locationDistance(targetLocation, prev, map),
                currDistance = this.locationDistance(targetLocation, curr, map);
            return (prevDistance < currDistance) ? prev : curr;
        });
    }

    vectorDistance(dx, dy) {
        return Math.sqrt(dx * dx + dy * dy);
    }

    locationDistance(location1, location2, map) {
        let point1 = map.latLngToLayerPoint(location1),
            point2 = map.latLngToLayerPoint(location2),

            dx = point1.x - point2.x,
            dy = point1.y - point2.y;

        return this.vectorDistance(dx, dy);
    }

    /**
     * Converts latlon to pixels at zoom level 0 (for 256x256 tile size) , inverts y coord
     *
     * @link http://build-failed.blogspot.cz/2013/02/displaying-webgl-data-on-google-maps.html
     * @param latitude
     * @param longitude
     * @returns {{x: number, y: number}}
     */
    latLonToPixel(latitude, longitude) {
        let pi180 = Math.PI / 180.0,
            pi4 = Math.PI * 4,
            sinLatitude = Math.sin(latitude * pi180),
            pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (pi4)) * 256,
            pixelX = ((longitude + 180) / 360) * 256;

        return {x: pixelX, y: pixelY};
    }

    pointInCircle(centerPoint, checkPoint, radius) {
        let distanceSquared = (centerPoint.x - checkPoint.x) * (centerPoint.x - checkPoint.x) + (centerPoint.y - checkPoint.y) * (centerPoint.y - checkPoint.y);
        return distanceSquared <= radius * radius;
    }

    attachShaderVars(size, gl, program, attributes) {
        let name,
            loc,
            attribute,
            bytes = 5;

        for (name in attributes) if (attributes.hasOwnProperty(name)) {
            attribute = attributes[name];
            loc = gl.getAttribLocation(program, name);
            if (loc < 0) {
                console.log(name, attribute);
                throw new Error('shader variable ' + name + ' not found');
            }
            gl.vertexAttribPointer(loc, attribute.size, gl[attribute.type], false, size * (attribute.bytes || bytes), size * attribute.start);
            gl.enableVertexAttribArray(loc);
        }

        return this;
    }

    flattenData(data) {
        let dim = data[0][0].length,
            result = {vertices: [], holes: [], dimensions: dim},
            holeIndex = 0;

        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                for (let d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
            }
            if (i > 0) {
                holeIndex += data[i - 1].length;
                result.holes.push(holeIndex);
            }
        }

        return result;
    }

    get randomColor() {
        return () => {
            return {
                r: Math.random(),
                g: Math.random(),
                b: Math.random()
            };
        };
    }
}
