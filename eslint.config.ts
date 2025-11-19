import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';

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
        },

        rules: {
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            'prettier/prettier': ['error', prettierConfig],
        },
    },
);
