const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [
    {
        name: 'App',
        entry: './src/App/app.ts',
        mode: 'development',
        devtool: 'inline-source-map',
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
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: 'bundle_[contenthash].js',
            path: path.resolve(__dirname, 'dist/App'),
            clean: true,
        },
    },
    {
        name: 'Renderer',
        entry: './src/Renderer/Renderer.ts',
        mode: 'development',
        devtool: 'inline-source-map',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        // Creates `style` nodes from JS strings
                        'style-loader',
                        // Translates CSS into CommonJS
                        'css-loader',
                        // Compiles Sass to CSS
                        'sass-loader',
                    ],
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: 'bundle_[contenthash].js',
            path: path.resolve(__dirname, 'dist/Renderer'),
            clean: true,
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/Renderer/index.html',
            }),
            // new CopyPlugin({
            //     patterns: [{ from: './src/Renderer/assets', to: 'assets' }],
            // }),
        ],
    },
];
