const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/preload/preload.ts',
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: /src/,
        use: [{ loader: 'ts-loader' }]
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'preload.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
};
