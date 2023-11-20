const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const baseConfig = require('./karma.base.conf.js');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const testEntryFile = 'spec/test.ts';
const configFile = 'tsconfig.json';

const coverage = process.argv.indexOf('--no-coverage') < 0;

console.log(`testPath: ${testEntryFile}`);
console.log(`configFile: ${configFile}`);
console.log(`coverage: ${coverage}`);

module.exports = function (config) {
    baseConfig(config);

    const reporters = ['progress', 'kjhtml', 'junit'];

    const rules = [
        {
            test: /\.ts$/,
            use: [
                {
                    loader: 'ts-loader',
                    options: {
                        configFile,
                    },
                },
            ],
        },
    ];

    const plugins = [new CircularDependencyPlugin({ exclude: /node_modules/ })];

    if (coverage) {
        reporters.push('coverage-istanbul');

        rules.push({
            test: /\.ts$/,
            use: {
                loader: 'istanbul-instrumenter-loader',
                options: {
                    esModules: true,
                },
            },
            enforce: 'post',
            include: path.resolve('main'),
            exclude: /.spec.ts$/,
        });
    }

    config.set({
        frameworks: ['jasmine'],

        reporters,

        // list of files / patterns to load in the browser
        files: [testEntryFile],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            '**/*.ts': ['webpack'],
        },

        webpack: {
            module: { rules },
            resolve: {
                extensions: ['.ts', '.js'],
                plugins: [new TsconfigPathsPlugin({ configFile })], // Supports non standard base url for absolute imports
            },
            mode: 'development',
            devtool: 'inline-source-map',
            plugins,
        },
    });
};
