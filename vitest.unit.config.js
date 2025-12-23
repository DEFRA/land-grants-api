import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, '.')
    }
  },
  test: {
    root: '.',
    name: 'unit',
    include: [
      '**/src/api/**/*.test.js',
      '**/src/rules-engine/**/*.test.js',
      '**/src/available-area/**/*.test.js',
      '**/src/payment-calculation/**/*.test.js'
    ],
    exclude: ['.server'],
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, '.vitest/setup.js')],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', ['json', { file: 'coverage-final.json' }], 'html'],
      include: [
        'src/api/**/*.js',
        'src/rules-engine/**/*.js',
        'src/available-area/**/*.js',
        'src/payment-calculation/**/*.js'
      ],
      exclude: [
        'src/**/*.test.js',
        '**/__tests__/**',
        '**/__snapshots__/**',
        'node_modules/',
        '.server',
        'index.js',
        '/__tests__/',
        '/__snapshots__/',
        '\\.test\\.js$',
        'src/db-tests/testLogger.js',
        'src/db-tests/setup/',
        'src/db-tests/fixtures/',
        'scripts/'
      ],
      reportsDirectory: 'coverage/unit'
    }
  }
})
