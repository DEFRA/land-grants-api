/**
 * @type {Config}
 */
export default {
  rootDir: '.',
  verbose: true,
  resetModules: true,
  clearMocks: true,
  silent: false,
  watchPathIgnorePatterns: ['globalConfig'],
  testMatch: [
    '**/src/api/**/*.test.js',
    '**/src/rules-engine/**/*.test.js',
    '**/src/available-area/**/*.test.js'
  ],
  reporters: ['default', ['github-actions', { silent: false }], 'summary'],
  setupFiles: ['<rootDir>/.jest/setup.js'],
  collectCoverageFrom: ['src/api/**/*.js', 'src/rules-engine/**/*.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    'index.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testIgnorePatterns: ['<rootDir>/.server'],
  transformIgnorePatterns: [
    `node_modules/(?!${[
      '@defra/hapi-tracing', // Supports ESM only
      'node-fetch' // Supports ESM only
    ].join('|')}/)`
  ]
}

/**
 * @import { Config } from 'jest'
 */
