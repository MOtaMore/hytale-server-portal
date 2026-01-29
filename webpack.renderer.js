const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: '[name].js',
  },
  target: 'electron-renderer',
  node: false,
  devServer: {
    port: 3000,
    hot: false,
    liveReload: false,
    client: false,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      meta: {
        // Note: CSP is fully defined in src/renderer/index.html meta tag
        // HtmlWebpackPlugin meta is intentionally empty to avoid conflicts
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'resources', to: 'resources' }
      ]
    })
  ],
};
