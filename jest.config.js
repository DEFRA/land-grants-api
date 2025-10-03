/**
 * @type {Config}
 */
export default {
  projects: [
    {
      ...(await import('./jest.unit.config.js')).default,
      coverageDirectory: '<rootDir>/coverage/unit'
    },
    {
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
