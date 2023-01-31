const HtmlWebPackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const deps = require("./package.json").dependencies;

module.exports = (env) => {
    return {
        entry: "./src/index.ts",
        devtool: "inline-source-map",
        output: {
            publicPath: env.publicPath ? `${env.publicPath}` : "http://localhost:3000/",
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
                {
                    test: /\.svg$/,
                    use: [
                        {
                            loader: "babel-loader",
                        },
                        {
                            loader: "@svgr/webpack",
                            options: { babel: false, icon: true },
                        },
                    ],
                },
                { test: /\.json$/, type: "json" },
            ],
        },

        plugins: [
            new ModuleFederationPlugin({
                name: "estela_web",
                filename: "remoteEntry.js",
                remotes: {
                    BillingModule: `user_dropdown_module@${env.remoteURL}remoteEntry.js`,
                },
                exposes: {
                    "./header": "./src/shared/header/index.tsx",
                    "./authService": "./src/services/auth.service.ts",
                    "./constants": "./src/constants.ts",
                    "./notifications": "./src/shared/notifications/index.tsx",
                },
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
            new Dotenv({
                path: env.production ? ".env.production" : ".env.development",
            }),
            new ESLintPlugin({
                extensions: ["js", "jsx", "ts", "tsx"],
            }),
        ],
    };
};
