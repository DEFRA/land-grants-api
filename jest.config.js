/**
 * @type {Config}
 */
export default {
  projects: [
    {
      displayName: 'unit',
      ...(await import('./jest.unit.config.js')).default,
      coverageDirectory: '<rootDir>/coverage/unit'
    },
    {
      displayName: 'db-tests',
      ...(await import('./jest.db.config.js')).default,
      coverageDirectory: '<rootDir>/coverage/db'
    }
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/merged'
}

/**
 * @import { Config } from 'jest'
 */
