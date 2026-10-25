import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura'],
      include: [
        'src/cache/**/*.ts',
        'src/discovery/**/*.ts',
        'src/domain/**/*.ts',
        'src/export/export-row.ts',
        'src/export/to-csv.ts',
        'src/export/to-json.ts',
        'src/fetching/**/*.ts',
        'src/settings/settings.ts',
        'src/ui/use-review-panel.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
});
