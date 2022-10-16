const HtmlWebPackPlugin = require("html-webpack-plugin");
const { DefinePlugin } = require('webpack');
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const deps = require("./package.json").dependencies;

module.exports = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  output: {
    publicPath: "http://localhost:3000/",
  },

  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },

  devServer: {
    port: 3000,
    historyApiFallback: true,
  },

  module: {
    rules: [
      {
        test: /\.m?js/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(css|s[ac]ss)$/i,
        use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },

  plugins: [
    new ModuleFederationPlugin({
      name: "estela-web",
      filename: "remoteEntry.js",
      remotes: {
        testModule: "testModule@http://localhost:3005/remoteEntry.js",
      },
      exposes: {},
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),
    new HtmlWebPackPlugin({
      template: "./public/index.html",
      favicon: "./public/favicon.ico",
    }),
    new DefinePlugin({
      'process.env': {
        REACT_APP_API_BASE_URL: JSON.stringify('http://10.106.164.188'),
      },
    }),
    new ESLintPlugin({
        extensions: ["js", "jsx", "ts", "tsx"],
      }),
  ],
};