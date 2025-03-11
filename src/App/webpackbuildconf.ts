const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
import { Configuration } from 'webpack';

export const WebpackBuildConfig = (
    projectDir: string,
    env: 'development' | 'none' | 'production' = 'development'
): Configuration => {
    let projectSrc = path.join(projectDir, 'src');
    let projectDist = path.join(projectDir, 'dist');

    return {
        name: 'Project',
        entry: path.join(projectSrc, './main.ts'),
        mode: env,
        devtool: env == 'development' ? 'inline-source-map' : 'none',
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
            path: projectDist,
            filename: 'bundle_[contenthash].js',
            clean: true,
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.join(projectSrc, 'index.html'),
            }),
            new CopyPlugin({
                patterns: [{ from: path.join(projectSrc, 'assets'), to: 'assets' }],
            }),
        ],
    };
};
