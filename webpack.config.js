const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: './app/main.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'node_modules/jszip/dist/jszip.min.js',
        to: 'jszip.js'
      },
      {
        from: 'node_modules/node-forge/dist/forge.min.js',
        to: 'forge.js'
      },
      {
        from: 'node_modules/node-forge/dist/forge.min.js.map',
        to: 'forge.min.js.map'
      },
      {
        from: 'epubs/',
        to: 'epubs'
      }
    ])
  ]
};
