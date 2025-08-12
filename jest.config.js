/**
 * @type {Config}
 */
export default {
  projects: [
    {
      displayName: 'unit',
      ...(await import('./jest.unit.config.js')).default,
      coverageDirectory: '<rootDir>/coverage/unit',
      coveragePathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.server',
        'index.js',
        '/__tests__/',
        '/__snapshots__/',
        '\\.test\\.js$'
      ]
    },
    {
      displayName: 'db-tests',
      ...(await import('./jest.db.config.js')).default,
      coverageDirectory: '<rootDir>/coverage/integration',
      coveragePathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.server',
        'index.js',
        '/__tests__/',
        '/__snapshots__/',
        '\\.test\\.js$'
      ]
    }
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/merged'
}

/**
 * @import { Config } from 'jest'
 */
