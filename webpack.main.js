const path = require('path');

module.exports = {
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js',
  },
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  externals: {
    'child_process': 'commonjs child_process',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'os': 'commonjs os',
  },
};
