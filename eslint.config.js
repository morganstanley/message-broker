const { defineConfig, globalIgnores } = require('eslint/config');

const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});
const prettierConfig = require('./prettier.config.js');

module.exports = defineConfig([
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 11,
            sourceType: 'module',
            parserOptions: {},
        },

        extends: compat.extends(
            'eslint:recommended',
            'plugin:@typescript-eslint/eslint-recommended',
            'plugin:@typescript-eslint/recommended',
            'prettier',
            'plugin:prettier/recommended',
        ),

        plugins: {
            '@typescript-eslint': typescriptEslint,
        },

        rules: {
            'prettier/prettier': ['error', prettierConfig],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-this-alias': 'off',
        },
    },
    globalIgnores(['**/dist/', '**/reports/', '**/docs/', '**/site/']),
    {
        files: ['**/*.js'],

        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
]);
