import parentConfig from '../../jest.config.js'

const currentPath = 'src/db-tests'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'database',
  rootDir: '../../../',
  testMatch: [`<rootDir>${currentPath}/**/?(*.)+(spec|test).[jt]s?(x)`],
  testEnvironment: 'node',
  // setupFilesAfterEnv: [`<rootDir>${currentPath}/jestSetup.ts`],
  globalSetup: `<rootDir>${currentPath}/jestDbSetup.ts`,
  globalTeardown: `<rootDir>${currentPath}/jestDbTeardown.ts`
}
