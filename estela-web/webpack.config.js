const HtmlWebPackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const path = require('path');

module.exports = (env) => {
    return {
        entry: './src/index.ts',
        devtool: 'inline-source-map',
        output: {
            publicPath: "http://localhost:3000/",
        },

        resolve: {
            alias: {
            DropdownComponent: path.resolve(__dirname, 'src/defaultComponents'),
            },
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
            {
                test: /\.svg$/,
                use: [
                {
                loader: 'babel-loader',
                },
                {
                loader: '@svgr/webpack',
                options: { babel: false, icon: true},
                }
            ],
            },
            { test: /\.json$/, type: 'json' }
            ],
        },

        plugins: [
            new HtmlWebPackPlugin({
            template: "./public/index.html",
            favicon: "./public/favicon.ico",
            }),
            new Dotenv(
            {
                path: env.production ?'.env.production' : '.env.development',
            }
            ),
            new ESLintPlugin({
                extensions: ["js", "jsx", "ts", "tsx"],
            }),
        ],
    };
};