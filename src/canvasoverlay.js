/*
originally taken from: http://www.sumbera.com/gist/js/leaflet/canvas/L.CanvasOverlay.js, added and customized as part of this lib because of need from library
 Generic  Canvas Overlay for leaflet,
 Stanislav Sumbera, April , 2014

 - added userDrawFunc that is called when Canvas need to be redrawn
 - added few useful params fro userDrawFunc callback
 - fixed resize map bug
 inspired & portions taken from  :   https://github.com/Leaflet/Leaflet.heat
 */

L.CanvasOverlay = L.Layer.extend({
    initialize: function (userDrawFunc, options) {
        this._userDrawFunc = userDrawFunc;
        this._frame = null;
        this._redrawCallbacks = [];
        L.setOptions(this, options);
    },

    drawing: function (userDrawFunc) {
        this._userDrawFunc = userDrawFunc;
        return this;
    },

    params: function (options) {
        L.setOptions(this, options);
        return this;
    },

    redraw: function (callback) {
        if (typeof callback === 'function') {
            this._redrawCallbacks.push(callback);
        }
        if (this._frame === null) {
            this._frame = L.Util.requestAnimFrame(this._redraw, this);
        }
        return this;
    },

    onAdd: function (map) {
        this._map = map;
        this.canvas = this.canvas || document.createElement('canvas');

        var size = this._map.getSize()
            , animated = this._map.options.zoomAnimation && L.Browser.any3d
        ;

        this.canvas.width = size.x;
        this.canvas.height = size.y;

        this.canvas.className = 'leaflet-zoom-' + (animated ? 'animated' : 'hide');

        map._panes.overlayPane.appendChild(this.canvas);

        map.on('moveend', this._reset, this);
        map.on('resize', this._resize, this);

        if (map.options.zoomAnimation && L.Browser.any3d) {
            map.on('zoomanim', this._animateZoom, this);
        }

        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this.canvas);

        map.off('moveend', this._reset, this);
        map.off('resize', this._resize, this);

        if (map.options.zoomAnimation) {
            map.off('zoomanim', this._animateZoom, this);
        }
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    _resize: function (resizeEvent) {
        this.canvas.width = resizeEvent.newSize.x;
        this.canvas.height = resizeEvent.newSize.y;
    },

    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);
        this._redraw();
    },

    _redraw: function () {
        var size = this._map.getSize()
            , bounds = this._map.getBounds()
            , zoomScale = (size.x * 180) / (20037508.34 * (bounds.getEast() - bounds.getWest())) // resolution = 1/zoomScale
            , zoom = this._map.getZoom()
        ;

        if (this._userDrawFunc) {
            this._userDrawFunc(this, {
                canvas: this.canvas,
                bounds: bounds,
                size: size,
                zoomScale: zoomScale,
                zoom: zoom,
                options: this.options
            });
        }

        while (this._redrawCallbacks.length > 0) {
            this._redrawCallbacks.shift()(this);
        }

        this._frame = null;
    },

    _getTranslationString: function(point) {
        var is3d = L.Browser.webkit3d,
            open = 'translate' + (is3d ? '3d' : '') + '(',
            close = (is3d ? ',0' : '') + ')';

        return open + point.x + 'px,' + point.y + 'px' + close;
    },

    _animateZoom: function (e) {
        var scale = this._map.getZoomScale(e.zoom)
            , offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos())
        ;

        L.DomUtil.setTransform(this.canvas, offset, scale);
    }
});

L.canvasOverlay = function (userDrawFunc, options) {
    return new L.CanvasOverlay(userDrawFunc, options);
};
