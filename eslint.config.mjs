import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.ts'],
    ignores: [
      '**/*.test.ts',
      '**/*.spec.ts',
      'test-workspace/**/*',
      'out/**',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.vscode-test/**',
      '*.log',
    ],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // General rules
      'prefer-const': 'error',
      'no-var': 'error',
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'warn',

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },
  // Configuration for test files with relaxed rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      // Relaxed rules for test files
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'prettier/prettier': 'error',
    },
  },
  // Configuration for test-workspace files (without TypeScript project parsing to avoid conflicts)
  {
    files: ['test-workspace/**/*.ts', 'test-workspace/**/*.js'],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      // Basic linting without TypeScript project analysis
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-unused-vars': 'warn',
      eqeqeq: 'warn',
      'no-console': 'warn',
      'prettier/prettier': 'error',
    },
  },
  // Apply prettier config to disable conflicting rules
  prettierConfig,
];
