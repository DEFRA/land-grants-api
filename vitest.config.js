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
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'json'],
      reportsDirectory: 'coverage/merged'
    }
  }
})
