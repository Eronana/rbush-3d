// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['.dist/**'],
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/comma-dangle': ['error', 'only-multiline'],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@stylistic/type-annotation-spacing': 'error',
    },
  },
);
