import HapiCron from 'hapi-cron'

const cron = {
  plugin: HapiCron,
  options: {
    jobs: [
      {
        name: 'land-grants-statistics',
        time: '*/30 * * * *', // Every 30 minutes
        timezone: 'Europe/London',
        request: {
          method: 'GET',
          url: '/statistics'
        }
      }
    ]
  }
}

export { cron }
