const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        filename: 'main.js'
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.(glsl|vs|fs)$/,
                use: ['shader-loader'],
                options: {
                    glsl: {
                        chunkPath: path.resolve("/glsl/chunks")
                    }
                }
            }
        ]
    }
};
