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
    '**/src/available-area/**/*.test.js',
    '**/src/payment-calculation/**/*.test.js'
  ],
  reporters: ['default', ['github-actions', { silent: false }], 'summary'],
  setupFiles: ['<rootDir>/.jest/setup.js'],
  collectCoverageFrom: [
    'src/api/**/*.js',
    'src/rules-engine/**/*.js',
    '!src/**/*.test.js',
    '!**/__tests__/**',
    '!**/__snapshots__/**'
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    'index.js',
    'index.js',
    '/__tests__/',
    '/__snapshots__/',
    '\\.test\\.js$',
    'src/db-tests/testLogger.js',
    'src/db-tests/setup/',
    'src/db-tests/fixtures/'
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testPathIgnorePatterns: ['<rootDir>/.server'],
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
