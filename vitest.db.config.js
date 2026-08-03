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
    name: 'database',
    include: ['src/tests/db-tests/**/?(*.)+(spec|test).[jt]s?(x)'],
    globalSetup: [resolve(__dirname, 'vitest.db.setup.js')],
    globalTeardown: [resolve(__dirname, 'vitest.db.teardown.js')],
    coverage: {
      ...unitConfig.test.coverage,
      reporter: ['text', ['json', { file: 'coverage-final.json' }], 'html'],
      include: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!**/__tests__/**',
        '!**/__snapshots__/**'
      ],
      reportsDirectory: 'coverage/db'
    }
  }
})
