import { cron } from '~/src/features/common/plugins/cron.js'
import { vi } from 'vitest'

vi.mock('hapi-cron', () => ({
  default: 'mock-hapi-cron'
}))

describe('#cron', () => {
  test('Should have the correct plugin', () => {
    expect(cron.plugin).toBe('mock-hapi-cron')
  })

  test('Should have the correct options structure', () => {
    expect(cron.options).toBeDefined()
    expect(cron.options.jobs).toBeDefined()
    expect(Array.isArray(cron.options.jobs)).toBe(true)
  })

  test('Should configure land-grants-statistics job', () => {
    const statisticsJob = cron.options.jobs.find(
      (job) => job.name === 'land-grants-statistics'
    )

    expect(statisticsJob).toBeDefined()
    expect(statisticsJob.name).toBe('land-grants-statistics')
    expect(statisticsJob.time).toBe('*/30 * * * *')
    expect(statisticsJob.timezone).toBe('Europe/London')
  })

  test('Should configure correct request for land-grants-statistics job', () => {
    const statisticsJob = cron.options.jobs.find(
      (job) => job.name === 'land-grants-statistics'
    )

    expect(statisticsJob.request).toBeDefined()
    expect(statisticsJob.request.method).toBe('GET')
    expect(statisticsJob.request.url).toBe('/statistics')
  })
})
