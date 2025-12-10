import parentConfig from './jest.unit.config.js'

const currentPath = 'src/db-tests'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'database',
  testMatch: [
    `<rootDir>${currentPath}/getActions.db.test.js`,
    `<rootDir>${currentPath}/cdpUploaderCallback.integration.test.js`
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/__tests__/**',
    '!**/__snapshots__/**'
  ],
  coverageDirectory: '<rootDir>/coverage/db'
}
