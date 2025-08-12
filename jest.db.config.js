import parentConfig from './jest.unit.config.js'

const currentPath = 'src/db-tests'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'database',
  testMatch: [`<rootDir>${currentPath}/**/?(*.)+(spec|test).[jt]s?(x)`],
  testEnvironment: 'node',
  globalSetup: `<rootDir>${currentPath}/setup/jestSetup.js`,
  globalTeardown: `<rootDir>${currentPath}/setup/jestTeardown.js`,
  coverageDirectory: '<rootDir>/coverage/db'
}
