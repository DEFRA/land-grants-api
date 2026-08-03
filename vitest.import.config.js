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
    name: 'import',
    include: ['src/tests/import-tests/**/?(*.)+(spec|test).[jt]s?(x)'],
    coverage: {
      ...unitConfig.test.coverage,
      reporter: ['text', ['json', { file: 'coverage-final.json' }], 'html'],
      reportsDirectory: 'coverage/import'
    }
  }
})
