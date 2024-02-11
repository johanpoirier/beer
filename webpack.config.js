const path = require('path');
const WebpackConcatPlugin = require('webpack-concat-files-plugin');

const destDir = path.resolve(__dirname, 'dist');
const swDest = path.join(destDir, 'beer-service-worker.js');
const zipLib = path.join(path.resolve(__dirname, 'node_modules'), '@zip.js', 'zip.js', 'dist', 'zip-fs.min.js')
const epubSw = path.join(path.resolve(__dirname, 'app'), 'sw', 'beer-service-worker.js');
const cryptSw = path.join(path.resolve(__dirname, 'app'), 'sw', 'file-decryptor.js');

module.exports = {
  mode: 'production',
  entry: {
    main: './app/main.js',
    beer: './app/beer.js'
  },
  output: {
    filename: '[name].js',
    path: destDir
  },
  plugins: [
    new WebpackConcatPlugin({
      bundles: [{
        src: [ zipLib, cryptSw, epubSw],
        dest: swDest
      }]
    })
  ],
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
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  devServer: {
    static: {
      directory: destDir,
    },
    compress: true,
    https: true,
  },
};
