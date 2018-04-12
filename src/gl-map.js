import './canvasoverlay.js';
import PointFunction from './points';
import ShapeFunction from './shapes';
import ImageFunction from './images';

export default class GLMap {
    maps = [];
    items = ['_points', '_shapes', '_images', '_squares', '_dots', '_circles', '_pucks'];

    points(settings) {
        this._points = new PointFunction(settings);
        return this._points;
    }

    shapes(settings) {
        this._shapes = new ShapeFunction(settings);
        return this._shapes;
    }

    images(settings) {
        this._images = new ImageFunction(settings);
        return this._images;
    }

    squares(settings) {
        this._squares = new PointFunction(settings, 'square');
        return this._squares;
    }

    dots(settings) {
        this._dots = new PointFunction(settings, 'dot');
        return this._dots;
    }

    circles(settings) {
        this._circles = new PointFunction(settings, 'circle');
        return this._circles;
    }

    pucks(settings) {
        this._pucks = new PointFunction(settings, 'puck');
        return this._pucks;
    }

    setupClick(map) {
        if (this.maps.indexOf(map) < 0) {
            this.maps.push(map);
            map.on('click', e => {
                let hit;

                this.items.forEach(item => {
                    if (this[item]) {
                        hit = this[item].tryClick(e, map);
                        if (hit !== undefined) {
                            return hit;
                        }
                    }
                });
            });
        }
    }
}
