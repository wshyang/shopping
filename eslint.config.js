import eslint from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.output/**', '.wxt/**', 'coverage/**', 'node_modules/**', 'tests/fixtures/**'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      ...tseslint.configs.recommendedTypeChecked.at(-1).rules,
      'no-undef': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'import-x/no-cycle': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        sessionStorage: 'readonly',
      },
    },
  },
];
