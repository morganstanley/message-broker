import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['spec/**/**.spec.ts'],
        globals: true,
        reporters: ['verbose'],
        coverage: {
            provider: 'v8',
        },
    },
});
