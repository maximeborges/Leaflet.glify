//top-message
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

(function (window, document, L, undefined) {

    L.glify = {
        longitudeKey: 1,
        latitudeKey: 0,
        get instances() {
            return []
                .concat(L.glify.Points.instances)
                .concat(L.glify.Shapes.instances);
        },
        points: function (settings) {
            return new this.Points(settings);
        },
        shapes: function (settings) {
            return new this.Shapes(settings);
        },
        flattenData: function (data) {
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
        },
        // -- converts latlon to pixels at zoom level 0 (for 256x256 tile size) , inverts y coord )
        // -- source : http://build-failed.blogspot.cz/2013/02/displaying-webgl-data-on-google-maps.html
        latLonToPixel: function (latitude, longitude) {
            let pi180 = Math.PI / 180.0,
                pi4 = Math.PI * 4,
                sinLatitude = Math.sin(latitude * pi180),
                pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (pi4)) * 256,
                pixelX = ((longitude + 180) / 360) * 256;

            return {x: pixelX, y: pixelY};
        },
        Points: PointFunction,
        Shapes: ShapeFunction,
        maps: [],
        setupClick: function (map) {
            if (this.maps.indexOf(map) < 0) {
                this.maps.push(map);
                map.on('click', function (e) {
                    let hit;
                    hit = L.glify.Points.tryClick(e, map);
                    if (hit !== undefined) return hit;

                    //todo: handle lines

                    hit = L.glify.Shapes.tryClick(e, map);
                    if (hit !== undefined) return hit;
                });
            }
        },
        pointInCircle: function (centerPoint, checkPoint, radius) {
            let distanceSquared = (centerPoint.x - checkPoint.x) * (centerPoint.x - checkPoint.x) + (centerPoint.y - checkPoint.y) * (centerPoint.y - checkPoint.y);
            return distanceSquared <= radius * radius;
        },
        attachShaderVars: function (size, gl, program, attributes) {
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
        },
        debugPoint: function (containerPoint) {
            let el = document.createElement('div'),
                s = el.style,
                x = containerPoint.x,
                y = containerPoint.y;

            s.left = x + 'px';
            s.top = y + 'px';
            s.width = '10px';
            s.height = '10px';
            s.position = 'absolute';
            s.backgroundColor = '#' + (Math.random() * 0xFFFFFF << 0).toString(16);

            document.body.appendChild(el);

            return this;
        },
        /**
         *
         * @param targetLocation
         * @param points
         * @param map
         * @returns {*}
         */
        closest: function (targetLocation, points, map) {
            let self = this;
            if (points.length < 1) return null;
            return points.reduce(function (prev, curr) {
                let prevDistance = self.locationDistance(targetLocation, prev, map),
                    currDistance = self.locationDistance(targetLocation, curr, map);
                return (prevDistance < currDistance) ? prev : curr;
            });
        },
        vectorDistance: function (dx, dy) {
            return Math.sqrt(dx * dx + dy * dy);
        },
        locationDistance: function (location1, location2, map) {
            let point1 = map.latLngToLayerPoint(location1),
                point2 = map.latLngToLayerPoint(location2),

                dx = point1.x - point2.x,
                dy = point1.y - point2.y;

            return this.vectorDistance(dx, dy);
        },
        color: {
            fromHex: function (hex) {
                if (hex.length < 6) return null;
                hex = hex.toLowerCase();

                if (hex[0] === '#') {
                    hex = hex.substring(1, hex.length);
                }
                let r = parseInt(hex[0] + hex[1], 16),
                    g = parseInt(hex[2] + hex[3], 16),
                    b = parseInt(hex[4] + hex[5], 16);

                return {r: r / 255, g: g / 255, b: b / 255};
            },
            green: {r: 0, g: 1, b: 0},
            red: {r: 1, g: 0, b: 0},
            blue: {r: 0, g: 0, b: 1},
            teal: {r: 0, g: 1, b: 1},
            yellow: {r: 1, g: 1, b: 0},

            white: {r: 1, g: 1, b: 1},
            black: {r: 0, g: 0, b: 0},

            gray: {r: 0.5, g: 0.5, b: 0.5},

            get grey() {
                return L.glify.color.gray;
            },
            random: function () {
                return {
                    r: Math.random(),
                    g: Math.random(),
                    b: Math.random()
                };
            },
            pallet: function () {
                switch (Math.round(Math.random() * 4)) {
                    case 0:
                        return L.glify.color.green;
                    case 1:
                        return L.glify.color.red;
                    case 2:
                        return L.glify.color.blue;
                    case 3:
                        return L.glify.color.teal;
                    case 4:
                        return L.glify.color.yellow;
                }
            }
        },
        mapMatrix: MapMatrix,
        shader: {
            vertex: defaultGlsl,
            fragment: {
                dot: dot,
                point: point,
                puck: puck,
                simpleCircle: simpleCircle,
                square: square,
                polygon: polygon
            }
        }
    };
})(window, document, L);
