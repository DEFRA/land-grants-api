import { defineConfig } from 'eslint/config'
import neostandard from 'neostandard'
import jsdoc from 'eslint-plugin-jsdoc'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

export default defineConfig(
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [
      ...neostandard.resolveIgnoresFromGitignore(),
      '.public/**',
      'src/__fixtures__/**',
      '.server/**',
      'coverage/**'
    ],
    noJsx: true,
    noStyle: true
  }),
  {
    name: 'land-grants-api/js',
    files: ['**/*.{cjs,js}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      jsdoc.configs['flat/recommended-typescript-flavor'],
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.cjs', '.js']
      },
      'import/resolver': {
        node: true,
        typescript: true
      }
    },
    rules: {
      'no-console': 'error',

      // Turn off strict type checking rules
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // The codebase deliberately uses `||` to default falsy values (e.g. empty
      // strings and `0`), which `??` does not cover
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // JSDoc blocks are optional by default
      'jsdoc/require-jsdoc': 'off',

      // JSDoc @param types are mandatory for JavaScript
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-param': 'off',
      'jsdoc/require-property-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-returns': 'off',

      // JSDoc types are gradually typed and use `any`, `*` and `Function`
      'jsdoc/reject-any-type': 'off',
      'jsdoc/reject-function-type': 'off',

      // Check for mandatory file extensions
      // https://nodejs.org/api/esm.html#mandatory-file-extensions
      'import/extensions': ['error', 'always', { ignorePackages: true }],

      // Skip rules handled by TypeScript compiler
      'import/no-named-as-default-member': 'off'
    }
  },
  {
    name: 'land-grants-api/cjs',
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    },
    rules: {
      // Allow require devDependencies
      'n/no-unpublished-require': ['error', { allowModules: [] }]
    }
  },
  {
    name: 'land-grants-api/scripts',
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
      'n/no-process-exit': 'off'
    }
  },
  {
    name: 'land-grants-api/tests',
    files: [
      '**/*.test.{cjs,js}',
      '**/__mocks__/**',
      '**/db-tests/**',
      '**/import-tests/**'
    ],
    rules: {
      // Allow Vitest to assert on mocked unbound methods
      '@typescript-eslint/unbound-method': 'off',

      // Allow console in tests
      'no-console': 'off',

      // Allow import devDependencies
      'n/no-unpublished-import': [
        'error',
        { allowModules: ['testcontainers', 'archiver'] }
      ]
    }
  },
  {
    name: 'land-grants-api/load-tests',
    files: ['src/tests/load-tests/**'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^k6'] }],
      'n/no-unpublished-import': ['error', { allowModules: ['k6'] }]
    }
  }
)
