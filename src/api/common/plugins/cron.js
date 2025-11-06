import HapiCron from 'hapi-cron'

const cron = {
  plugin: HapiCron,
  options: {
    jobs: [
      {
        name: 'ingest-land-data',
        time: '*/30 * * * *', // Every 30 minutes
        timezone: 'Europe/London',
        request: {
          method: 'GET',
          url: '/ingest-land-data-schedule'
        }
      }
    ]
  }
}

export { cron }
