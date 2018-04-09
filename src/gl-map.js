import './canvasoverlay.js';
import PointFunction from './points';
import ShapeFunction from './shapes';
import MapMatrix from './map-matrix';

const dot = require('./shader/fragment/dot.glsl');
const point = require('./shader/fragment/point.glsl');
const puck = require('./shader/fragment/puck.glsl');
const simpleCircle = require('./shader/fragment/simple-circle.glsl');
const square = require('./shader/fragment/square.glsl');
const polygon = require('./shader/fragment/polygon.glsl');
const defaultGlsl = require('./shader/vertex/default.glsl');

export default class GLMap {
    maps = [];
    longitudeKey = 1;
    latitudeKey = 0;
    points;
    shapes;

    getPoints(settings) {
        this.points = new PointFunction(settings);
        return this.points;
    }

    getShapes(settings) {
        this.shapes = new ShapeFunction(settings);
        return this.shapes;
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

    setupClick(map) {
        if (this.maps.indexOf(map) < 0) {
            this.maps.push(map);
            map.on('click', e => {
                let hit;
                hit = this.points.tryClick(e, map);
                if (hit !== undefined) {
                    return hit;
                }

                hit = this.shapes.tryClick(e, map);
                if (hit !== undefined) {
                    return hit;
                }
            });
        }
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

    get instances() {
        return []
            .concat(this.Points.instances)
            .concat(this.Shapes.instances);
    }

    get Points() {
        return PointFunction;
    }

    get Shapes() {
        return ShapeFunction;
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

    get mapMatrix() {
        return MapMatrix;
    }

    get shader() {
        return {
            vertex: defaultGlsl,
            fragment: {
                dot: dot,
                point: point,
                puck: puck,
                simpleCircle: simpleCircle,
                square: square,
                polygon: polygon
            }
        };
    }
}
