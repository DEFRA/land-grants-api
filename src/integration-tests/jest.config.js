import parentConfig from '../../jest.config.js'

const currentPath = 'src/integration-tests'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'database',
  rootDir: '../../',
  testMatch: [`<rootDir>${currentPath}/**/?(*.)+(spec|test).[jt]s?(x)`],
  testEnvironment: 'node',
  // setupFilesAfterEnv: [`<rootDir>${currentPath}/jestSetup.ts`],
  globalSetup: `<rootDir>${currentPath}/setup/jestDbSetup.js`
  // globalTeardown: `<rootDir>${currentPath}/setup/jestDbTeardown.js`
}
