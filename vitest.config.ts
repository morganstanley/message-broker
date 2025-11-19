import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['specs/**/**.spec.ts'],
        reporters: ['verbose'],
        coverage: {
            provider: 'v8',
        },
        setupFiles: ['specs/test-setup.ts'],
    },
});
