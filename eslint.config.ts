import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

const prettierConfig = {
    trailingComma: 'all',
    tabWidth: 4,
    singleQuote: true,
    printWidth: 120,
};

export default defineConfig(
    {
        ignores: ['**/dist/', '**/reports/', '**/docs/', '**/site/'],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,

    {
        plugins: {
            prettier: prettierPlugin,
            'simple-import-sort': simpleImportSort,
            'unused-imports': unusedImports,
        },

        rules: {
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            'simple-import-sort/imports': 'error',
            'unused-imports/no-unused-imports': 'error',
            'prettier/prettier': ['error', prettierConfig],
        },
    },
);
