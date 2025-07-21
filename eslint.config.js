// ESLint configuration for Golf League Management Platform (migrated for ESLint v9+)
import jsConfig from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/', 'build/', 'node_modules/', '*.js'],
  },
  jsConfig.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // React recommended rules
      ...react.configs.flat.recommended.rules,
      // React hooks recommended rules
      ...reactHooks.configs.recommended.rules,
      // Custom overrides
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  prettier,
];
