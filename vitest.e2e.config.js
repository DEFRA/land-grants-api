import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import unitConfig from './vitest.unit.config.js'

export default defineConfig({
  ...unitConfig,
  resolve: {
    ...unitConfig.resolve,
    alias: {
      '~': resolve(__dirname, '.')
    }
  },
  test: {
    ...unitConfig.test,
    name: 'e2e',
    include: ['src/tests/e2e-tests/**/?(*.)+(spec|test).[jt]s?(x)'],
    globalSetup: [resolve(__dirname, 'src/tests/e2e-tests/setup/startup.js')],
    globalTeardown: [
      resolve(__dirname, 'src/tests/e2e-tests/setup/teardown.js')
    ],
    testTimeout: 30000,
    coverage: {
      ...unitConfig.test.coverage,
      reporter: ['text', ['json', { file: 'coverage-final.json' }], 'html'],
      include: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!**/__tests__/**',
        '!**/__snapshots__/**'
      ],
      reportsDirectory: 'coverage/e2e'
    }
  }
})
