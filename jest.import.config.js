import parentConfig from './jest.unit.config.js'

const currentPath = 'src/import-tests'

export default {
  ...parentConfig,
  projects: undefined,
  displayName: 'import',
  testMatch: [`<rootDir>${currentPath}/**/?(*.)+(spec|test).[jt]s?(x)`],
  testEnvironment: 'node'
}
