import { tryFunction } from './helpers';
import MapItem from './map-item';

const point = require('./shader/fragment/point.glsl');
const defaultGlsl = require('./shader/vertex/default.glsl');

export default class Points extends MapItem {
    get defaultSettings() {
        return {
            map: null,
            data: [],
            vertexShaderSource: function () {
                return defaultGlsl;
            },
            fragmentShaderSource: function () {
                return point;
            },
            eachVertex: null,
            click: null,
            color: 'randomColor',
            opacity: 0.8,
            size: null,
            className: '',
            sensitivity: 2,
            shaderVars: {
                color: {
                    type: 'FLOAT',
                    start: 2,
                    size: 3
                }
            }
        };
    }

    /**
     *
     * @returns {Points}
     */
    render() {
        this.latLngLookup = null;
        this.vertexShader = null;
        this.fragmentShader = null;
        this.resetVertices();

        //look up the locations for the inputs to our shaders.
        let gl = this.gl,
            settings = this.settings,
            canvas = this.canvas,
            program = this.program,
            glLayer = this.glLayer,
            matrix = this.matrix = gl.getUniformLocation(program, 'matrix'),
            opacity = gl.getUniformLocation(program, 'opacity'),
            vertex = gl.getAttribLocation(program, 'vertex'),
            vertexBuffer = gl.createBuffer(),
            vertexArray = new Float32Array(this.verts),
            size = vertexArray.BYTES_PER_ELEMENT;

        gl.pointSize = gl.getAttribLocation(program, 'pointSize');

        //set the matrix to some that makes 1 unit 1 pixel.
        this.pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniformMatrix4fv(matrix, false, this.pixelsToWebGLMatrix);
        gl.uniform1f(opacity, this.settings.opacity);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
        gl.vertexAttribPointer(vertex, 2, gl.FLOAT, false, size * 5, 0);
        gl.enableVertexAttribArray(vertex);

        if (settings.shaderVars !== null) {
            this.attachShaderVars(size, gl, program, settings.shaderVars);
        }

        glLayer.redraw();

        return this;
    }

    resetVertices() {
        //empty verts and repopulate
        this.latLngLookup = {};
        this.verts = [];

        // -- data
        let verts = this.verts,
            settings = this.settings,
            data = settings.data,
            colorFn,
            color = tryFunction(settings.color, this),
            i = 0,
            max = data.length,
            latLngLookup = this.latLngLookup,
            latitudeKey = this.latitudeKey,
            longitudeKey = this.longitudeKey,
            latLng,
            pixel,
            lookup,
            key;

        if (color === null) {
            throw new Error('color is not properly defined');
        } else if (typeof color === 'function') {
            colorFn = color;
            color = undefined;
        }

        for (; i < max; i++) {
            latLng = data[i];
            key = latLng[latitudeKey].toFixed(2) + 'x' + latLng[longitudeKey].toFixed(2);
            lookup = latLngLookup[key];
            pixel = this.latLonToPixel(latLng[latitudeKey], latLng[longitudeKey]);

            if (lookup === undefined) {
                lookup = latLngLookup[key] = [];
            }

            lookup.push(latLng);

            if (colorFn) {
                color = colorFn();
            }

            //-- 2 coord, 3 rgb colors interleaved buffer
            verts.push(pixel.x, pixel.y, color.r, color.g, color.b);
            if (settings.eachVertex !== null) {
                settings.eachVertex.call(this, latLng, pixel, color);
            }
        }

        return this;
    }

    /**
     *
     * @param data
     * @returns {Points}
     */
    setData(data) {
        this.settings.data = data;
        return this;
    }

    pointSize() {
        let settings = this.settings,
            map = settings.map,
            pointSize = settings.size,
            // -- Scale to current zoom
            zoom = map.getZoom();

        return pointSize === null ? Math.max(zoom - 4.0, 1.0) : pointSize;
    }

    /**
     *
     * @returns {Points}
     */
    drawOnCanvas() {
        if (this.gl == null) {
            return this;
        }

        let gl = this.gl,
            canvas = this.canvas,
            settings = this.settings,
            map = settings.map,
            bounds = map.getBounds(),
            topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest()),
            offset = this.latLonToPixel(topLeft.lat, topLeft.lng),
            zoom = map.getZoom(),
            scale = Math.pow(2, zoom),
            mapMatrix = this.mapMatrix,
            pixelsToWebGLMatrix = this.pixelsToWebGLMatrix;

        pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);

        //set base matrix to translate canvas pixel coordinates -> webgl coordinates
        mapMatrix
            .set(pixelsToWebGLMatrix)
            .scaleMatrix(scale)
            .translateMatrix(-offset.x, -offset.y);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.vertexAttrib1f(gl.pointSize, this.pointSize());
        // -- attach matrix value to 'mapMatrix' uniform in shader
        gl.uniformMatrix4fv(this.matrix, false, mapMatrix.matrix);
        gl.drawArrays(gl.POINTS, 0, settings.data.length);

        return this;
    }

    /**
     * Iterates through a small area around the
     * @param {L.LatLng} coords
     * @returns {*}
     */
    lookup(coords) {
        let x = coords.lat - 0.03,
            y,

            xMax = coords.lat + 0.03,
            yMax = coords.lng + 0.03,

            foundI,
            foundMax,

            matches = [],
            found,
            key;

        for (; x <= xMax; x += 0.01) {
            y = coords.lng - 0.03;
            for (; y <= yMax; y += 0.01) {
                key = x.toFixed(2) + 'x' + y.toFixed(2);
                found = this.latLngLookup[key];
                if (found) {
                    foundI = 0;
                    foundMax = found.length;
                    for (; foundI < foundMax; foundI++) {
                        matches.push(found[foundI]);
                    }
                }
            }
        }

        //try matches first, if it is empty, try the data, and hope it isn't too big
        return this.closest(coords, matches.length === 0 ? this.settings.data.slice(0) : matches, this.settings.map);
    }

    tryClick(e, map) {
        let result,
            settings,
            instance,
            closestFromEach = [],
            instancesLookup = {},
            point,
            xy,
            found,
            latLng;

        this.instances.forEach(instance => {
            settings = instance.settings;
            if (!instance.active) return;
            if (settings.map !== map) return;
            if (!settings.click) return;

            point = instance.lookup(e.latlng);
            instancesLookup[point] = instance;
            closestFromEach.push(point);
        });

        if (closestFromEach.length < 1) return;

        found = this.closest(e.latlng, closestFromEach, map);

        if (found === null) return;

        instance = instancesLookup[found];
        if (!instance) return;

        latLng = L.latLng(found[this.latitudeKey], found[this.longitudeKey]);
        xy = map.latLngToLayerPoint(latLng);

        if (this.pointInCircle(xy, e.layerPoint, instance.pointSize() * instance.settings.sensitivity)) {
            result = instance.settings.click(e, found, xy);
            return result !== undefined ? result : true;
        }
    }
}
