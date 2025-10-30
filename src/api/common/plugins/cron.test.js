import { cron } from '~/src/api/common/plugins/cron.js'

jest.mock('hapi-cron', () => 'mock-hapi-cron')

describe('#cron', () => {
  test('Should have the correct plugin', () => {
    expect(cron.plugin).toBe('mock-hapi-cron')
  })

  test('Should have the correct options structure', () => {
    expect(cron.options).toBeDefined()
    expect(cron.options.jobs).toBeDefined()
    expect(Array.isArray(cron.options.jobs)).toBe(true)
  })

  test('Should configure ingest-land-data job', () => {
    const ingestJob = cron.options.jobs.find(
      (job) => job.name === 'ingest-land-data'
    )

    expect(ingestJob).toBeDefined()
    expect(ingestJob.name).toBe('ingest-land-data')
    expect(ingestJob.time).toBe('*/30 * * * *')
    expect(ingestJob.timezone).toBe('Europe/London')
  })

  test('Should configure correct request for ingest-land-data job', () => {
    const ingestJob = cron.options.jobs.find(
      (job) => job.name === 'ingest-land-data'
    )

    expect(ingestJob.request).toBeDefined()
    expect(ingestJob.request.method).toBe('GET')
    expect(ingestJob.request.url).toBe('/ingest-land-data-schedule')
  })
})
