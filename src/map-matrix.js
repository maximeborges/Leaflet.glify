export default class MapMatrix {
    _mapMatrix = new Float32Array(16);

    constructor() {
        let self = this;
        this._mapMatrix._set = this._mapMatrix.set;
        this._mapMatrix.set = function() {
            self._mapMatrix._set.apply(this, arguments);
            return self;
        };
    }

    set (value) {
        this._mapMatrix.set(value);
        return this;
    }

    translateMatrix(tx, ty) {
        // translation is in last column of matrix
        this._mapMatrix[12] += this._mapMatrix[0] * tx + this._mapMatrix[4] * ty;
        this._mapMatrix[13] += this._mapMatrix[1] * tx + this._mapMatrix[5] * ty;
        this._mapMatrix[14] += this._mapMatrix[2] * tx + this._mapMatrix[6] * ty;
        this._mapMatrix[15] += this._mapMatrix[3] * tx + this._mapMatrix[7] * ty;

        return this;
    }

    scaleMatrix(scale) {
        // scaling x and y, which is just scaling first two columns of matrix
        this._mapMatrix[0] *= scale;
        this._mapMatrix[1] *= scale;
        this._mapMatrix[2] *= scale;
        this._mapMatrix[3] *= scale;

        this._mapMatrix[4] *= scale;
        this._mapMatrix[5] *= scale;
        this._mapMatrix[6] *= scale;
        this._mapMatrix[7] *= scale;

        return this;
    }

    get matrix() {
        return this._mapMatrix;
    }
}
