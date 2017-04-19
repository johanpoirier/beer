const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    next: './app/next.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'app/sw/service-worker.js',
        to: 'service-worker.js'
      },
      {
        from: 'node_modules/jszip/dist/jszip.min.js',
        to: 'jszip.js'
      },
      {
        from: 'epubs/',
        to: 'epubs'
      }
    ])
  ]
};
