/**
 * @type {Config}
 */
export default {
  rootDir: '.',
  testEnvironment: 'node',
  verbose: true,
  resetModules: true,
  clearMocks: true,
  silent: false,
  watchPathIgnorePatterns: ['globalConfig'],
  testMatch: ['**/src/**/*.test.js'],
  reporters: ['default', ['github-actions', { silent: false }], 'summary'],
  setupFiles: ['<rootDir>/.jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/.jest/setup-after-env.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    '<rootDir>/src/__fixtures__',
    '<rootDir>/src/api/example',
    '<rootDir>/src/api/router.js',
    '<rootDir>/src/api/server.js',
    '<rootDir>/src/helpers/start-server.js',
    '<rootDir>/src/helpers/pulse.js',
    '<rootDir>/src/helpers/seed-db/',
    '<rootDir>/src/index.js',
    '<rootDir>/src/config/'
  ],
  coverageDirectory: '<rootDir>/coverage'
}

/**
 * @import { Config } from 'jest'
 */
