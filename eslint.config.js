import js from '@eslint/js';
import { gitignoreToMinimatch } from '@humanwhocodes/gitignore-to-minimatch';
import { defineConfig } from 'eslint/config';
import { readFileSync } from 'node:fs';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

const gitignore = readFileSync(new URL('.gitignore', import.meta.url), 'utf8')
  .split(/\r?\n/u)
  .filter((line) => line.trim() !== '' && !line.startsWith('#'))
  .map((line) => gitignoreToMinimatch(line));

export default defineConfig(
  {
    ignores: [...gitignore, '.public', 'src/__fixtures__']
  },
  {
    files: ['**/*.{cjs,js}'],
    extends: [
      js.configs.recommended,
      jsdoc.configs['flat/recommended-typescript-flavor'],
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      jsdoc
    },
    rules: {
      'no-console': 'error',

      // Turn off strict type checking rules
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Allow unused catch parameters (matches typescript-eslint v7 default)
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],

      // The codebase is loosely typed JavaScript, so disable the stricter
      // type-aware rules introduced in typescript-eslint v8 that surface
      // pre-existing intentional patterns
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',

      // JSDoc blocks are optional by default
      'jsdoc/require-jsdoc': 'off',

      // JSDoc @param types are mandatory for JavaScript
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-param': 'off',

      // JSDoc @property description is optional
      'jsdoc/require-property-description': 'off',

      // JSDoc @returns is optional
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-returns': 'off',

      // JSDoc types may use generic types (matches jsdoc v48 typescript-flavor)
      'jsdoc/reject-any-type': 'off',
      'jsdoc/reject-function-type': 'off'
    }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'module'
    }
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: [
      '**/*.test.{cjs,js}',
      '**/__mocks__/**',
      '**/db-tests/**',
      '**/import-tests/**'
    ],
    languageOptions: {
      globals: {
        ...globals.vitest,
        fetchMock: 'readonly'
      }
    },
    rules: {
      // Allow Vitest to assert on mocked unbound methods
      '@typescript-eslint/unbound-method': 'off',

      // Allow console in tests
      'no-console': 'off'
    }
  }
);
