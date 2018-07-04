import './canvasoverlay.js';
import PointFunction from './points';
import ShapeFunction from './shapes';

export default class GLMap {
    constructor() {
        this.maps = [];
        this._points;
        this._shapes;
    }

    points(settings) {
        this._points = new PointFunction(settings);
        return this._points;
    }

    shapes(settings) {
        this._shapes = new ShapeFunction(settings);
        return this._shapes;
    }

    setupClick(map) {
        if (this.maps.indexOf(map) < 0) {
            this.maps.push(map);
            map.on('click', e => {
                let hit;
                hit = this._points.tryClick(e, map);
                if (hit !== undefined) {
                    return hit;
                }

                hit = this._shapes.tryClick(e, map);
                if (hit !== undefined) {
                    return hit;
                }
            });
        }
    }
}
