// Karma configuration

const path = require('path');

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
    config.set({
        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine'],

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'kjhtml', 'junit'],

        client: {
            clearContext: false, // leave Jasmine Spec Runner output visible in browser
            args: process.argv, //  store command line args so we can modify tests based on passed args
            jasmine: {
                random: false,
                stopSpecOnExpectationFailure: false,
                failFast: false,
                timeout: 30000,
            },
        },

        junitReporter: {
            outputDir: path.join('reports', 'junit'),
            xmlVersion: 1, // use '1' if reporting to be per SonarQube 6.2 XML format
            outputFile: 'TESTS.xml',
        },

        coverageIstanbulReporter: {
            reports: ['html', 'text-summary', 'cobertura', 'lcov'],
            fixWebpackSourcePaths: true,
            dir: path.join('reports', 'coverage'),
            'report-config': {
                // all options available at: https://github.com/istanbuljs/istanbul-reports/blob/590e6b0089f67b723a1fdf57bc7ccc080ff189d7/lib/html/index.js#L135-L137
                html: {
                    // outputs the report in ./coverage/html
                    subdir: 'html',
                },
            },
            thresholds: {
                global: {
                    // thresholds for all files
                    statements: 90,
                    lines: 90,
                    branches: 90,
                    functions: 90,
                },
            },
        },

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome'],

        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
        },

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,

        mime: {
            'text/x-typescript': ['ts', 'tsx'],
        },

        captureTimeout: 210000,
        browserDisconnectTolerance: 3,
        browserDisconnectTimeout: 210000,
        browserNoActivityTimeout: 210000,
        restartOnFileChange: false,
    });
};
