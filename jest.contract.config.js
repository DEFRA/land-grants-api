import parentConfig from './jest.unit.config.js'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'contract',
  testMatch: ['**/src/contract-tests/**/?(*.)+(spec|test).[jt]s?(x)'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/__tests__/**',
    '!**/__snapshots__/**'
  ],
  coverageDirectory: '<rootDir>/coverage/contract'
}
