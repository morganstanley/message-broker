import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['spec/**/**.spec.ts'],
        reporters: ['verbose'],
        coverage: {
            provider: 'v8',
        },
        setupFiles: ['spec/test-setup.ts'],
    },
});
