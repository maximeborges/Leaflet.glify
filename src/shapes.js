import { tryFunction } from './helpers';
import PolygonLookup from 'polygon-lookup';
import earcut from 'earcut';
import MapItem from './map-item';

import polygon from './shader/fragment/polygon.glsl';
import defaultGlsl from './shader/vertex/default.glsl';

export default class Shapes extends MapItem {
    get defaultSettings() {
            return {
            map: null,
            data: [],
            vertexShaderSource: function () {
                return defaultGlsl;
            },
            fragmentShaderSource: function () {
                return polygon;
            },
            click: null,
            color: 'randomColor',
            className: '',
            opacity: 0.5,
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
     * @returns {Shapes}
     */
    render() {
        this._polygonLookup = null;
        this.resetVertices();
        // triangles or point count

        let pixelsToWebGLMatrix = this.pixelsToWebGLMatrix,
            settings = this.settings,
            canvas = this.canvas,
            gl = this.gl,
            glLayer = this.glLayer,
            verts = this.verts,
            vertexBuffer = gl.createBuffer(),
            vertArray = new Float32Array(verts),
            size = vertArray.BYTES_PER_ELEMENT,
            program = this.program,
            vertex = gl.getAttribLocation(program, 'vertex'),
            opacity = gl.getUniformLocation(program, 'opacity');

        gl.uniform1f(opacity, this.settings.opacity);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);
        gl.vertexAttribPointer(vertex, 2, gl.FLOAT, false, size * 5, 0);
        gl.enableVertexAttribArray(vertex);

        // ----------------------------
        // look up the locations for the inputs to our shaders.
        this.matrix = gl.getUniformLocation(program, 'matrix');
        gl.aPointSize = gl.getAttribLocation(program, 'pointSize');

        // Set the matrix to some that makes 1 unit 1 pixel.
        pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.uniformMatrix4fv(this.matrix, false, pixelsToWebGLMatrix);

        if (settings.shaderVars !== null) {
            this.attachShaderVars(size, gl, program, settings.shaderVars);
        }

        glLayer.redraw();

        return this;
    }

    /**
     *
     * @returns {Shapes}
     */
    resetVertices() {
        this.verts = [];
        this._polygonLookup = new PolygonLookup();

        let pixel,
            verts = this.verts,
            polygonLookup = this._polygonLookup,
            index,
            settings = this.settings,
            data = settings.data,
            features = data.features,
            feature,
            colorFn,
            color = tryFunction(settings.color, this),
            featureIndex = 0,
            featureMax = features.length,
            triangles,
            indices,
            flat,
            dim,
            iMax,
            i;

        polygonLookup.loadFeatureCollection(data);

        if (color === null) {
            throw new Error('color is not properly defined');
        } else if (typeof color === 'function') {
            colorFn = color;
            color = undefined;
        }

        // -- data
        for (; featureIndex < featureMax; featureIndex++) {
            feature = features[featureIndex];
            //***
            triangles = [];

            //use colorFn function here if it exists
            if (colorFn) {
                color = colorFn();
            }

            flat = this.flattenData(feature.geometry.coordinates);

            indices = earcut(flat.vertices, flat.holes, flat.dimensions);

            dim = feature.geometry.coordinates[0][0].length;
            for (i = 0, iMax = indices.length; i < iMax; i++) {
                index = indices[i];
                triangles.push(flat.vertices[index * dim + this.longitudeKey], flat.vertices[index * dim + this.latitudeKey]);
            }

            for (i = 0, iMax = triangles.length; i < iMax; i) {
                pixel = this.latLonToPixel(triangles[i++], triangles[i++]);
                verts.push(pixel.x, pixel.y, color.r, color.g, color.b);
            }
        }

        return this;
    }

    /**
     *
     * @return Shapes
     */
    drawOnCanvas() {
        if (this.gl == null) {
            return this;
        }

        let gl = this.gl,
            settings = this.settings,
            canvas = this.canvas,
            map = settings.map,
            pointSize = Math.max(map.getZoom() - 4.0, 1.0),
            bounds = map.getBounds(),
            topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest()),
            // -- Scale to current zoom
            scale = Math.pow(2, map.getZoom()),
            offset = this.latLonToPixel(topLeft.lat, topLeft.lng),
            mapMatrix = this.mapMatrix,
            pixelsToWebGLMatrix = this.pixelsToWebGLMatrix;

        pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);

        // -- set base matrix to translate canvas pixel coordinates -> webgl coordinates
        mapMatrix
            .set(pixelsToWebGLMatrix)
            .scaleMatrix(scale)
            .translateMatrix(-offset.x, -offset.y);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.vertexAttrib1f(gl.aPointSize, pointSize);
        // -- attach matrix value to 'mapMatrix' uniform in shader
        gl.uniformMatrix4fv(this.matrix, false, mapMatrix.matrix);
        gl.drawArrays(gl.TRIANGLES, 0, this.verts.length / 5);

        return this;
    }

    tryClick(e, map) {
        let result,
            settings,
            feature;

        this.instances.forEach(instance => {
            settings = instance.settings;
            if (!instance.active) return;
            if (settings.map !== map) return;
            if (!settings.click) return;

            feature = instance._polygonLookup.search(e.latlng.lng, e.latlng.lat);
            if (feature !== undefined) {
                result = settings.click(e, feature);
            }
        });

        return result !== undefined ? result : true;
    }
}
