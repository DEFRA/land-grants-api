import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import unitConfig from './vitest.unit.config.js'

export default defineConfig({
  ...unitConfig,
  resolve: {
    ...unitConfig.resolve,
    alias: {
      '~': resolve(__dirname, '.')
    }
  },
  test: {
    ...unitConfig.test,
    name: 'database',
    include: [
      // Controllers
      // 'src/db-tests/1.0.0/controllers/cdpUploaderCallback.db.test.js',
      // 'src/db-tests/1.0.0/controllers/applicationValidationController.db.test.js',
      // 'src/db-tests/1.0.0/controllers/paymentController.db.test.js'
      // 'src/db-tests/1.0.0/controllers/getParcels.db.test.js'
      // 'src/db-tests/1.0.0/controllers/parcelsController.db.test.js'
      // // Mutations
      // 'src/db-tests/1.0.0/mutations/saveApplicationValidationRun.db.test.js',
      // 'src/db-tests/1.0.0/mutations/saveApplication.db.test.js',
      // // Queries
      // 'src/db-tests/1.0.0/queries/getActions.db.test.js',
      // 'src/db-tests/1.0.0/queries/getAgreementsForParcel.query.test.js',
      // 'src/db-tests/1.0.0/queries/getApplicationValidationRun.db.test.js',
      // 'src/db-tests/1.0.0/queries/getApplicationValidationRuns.db.test.js',
      // 'src/db-tests/1.0.0/queries/getCompatibilityMatrix.db.test.js',
      // 'src/db-tests/1.0.0/queries/getLandCoverDefinitions.db.test.js',
      // 'src/db-tests/1.0.0/queries/getLandCoversForAction.db.test.js',
      // 'src/db-tests/1.0.0/queries/getParcelAvailableArea.db.test.js'
      // 'src/db-tests/1.0.0/queries/getMoorlandInterceptPercentage.db.test.js'
      // 'src/db-tests/1.0.0/queries/getDataLayerInterceptPercentage.db.test.js'
      // Services
      // 'src/db-tests/1.0.0/services/getPaymentCalculation.scenarios.db.test.js'
      // todo:
      'src/db-tests/1.0.0/services/getAvailableAreaForAction.scenarios.db.test.js'
    ],
    globalSetup: [resolve(__dirname, 'vitest.db.setup.js')],
    globalTeardown: [resolve(__dirname, 'vitest.db.teardown.js')],
    coverage: {
      ...unitConfig.test.coverage,
      reporter: ['text', ['json', { file: 'coverage-final.json' }], 'html'],
      include: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!**/__tests__/**',
        '!**/__snapshots__/**'
      ],
      reportsDirectory: 'coverage/db'
    }
  }
})
