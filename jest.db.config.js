import parentConfig from './jest.unit.config.js'

const currentPath = 'src/db-tests'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'database',
  testMatch: [`<rootDir>${currentPath}/**/?(*.)+(spec|test).[jt]s?(x)`],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/__tests__/**',
    '!**/__snapshots__/**'
  ],
  coverageDirectory: '<rootDir>/coverage/db',
  globalSetup: './jest.db.setup.js',
  globalTeardown: './jest.db.teardown.js'
}
