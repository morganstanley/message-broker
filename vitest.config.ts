import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['specs/**/**.spec.ts'],
        reporters: ['verbose'],
        coverage: {
            enabled: true,
            provider: 'v8',
            thresholds: {
                branches: 90,
                functions: 90,
                lines: 90,
                statements: 90,
            },
        },
        setupFiles: ['specs/test-setup.ts'],
    },
});
