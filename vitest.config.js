import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, '.')
    }
  },
  test: {
    globals: true,
    include: ['**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: 'coverage/merged',
      include: ['src/**/*.js'],
      exclude: ['**/*.test.js', '**/__tests__/**', 'node_modules/']
    }
  }
})
