import timeSpan from 'time-span'

export default async (config) => {
  const { watch, watchAll } = config

  // do not run teardown in watch mode
  if (watch || watchAll) return

  const end = timeSpan()
  console.log('teardown started')

  await Promise.all(
    global.containers.map((container) => container.stop({ timeout: 10000 }))
  )

  console.log(`teardown done in: ${end.seconds()} seconds`)
}

export {}
