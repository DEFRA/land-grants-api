export default async (config) => {
  const { watch, watchAll } = config

  // do not run teardown in watch mode
  if (watch || watchAll) return

  await Promise.all(
    global.containers.map((container) => container.stop({ timeout: 10000 }))
  )
}

export {}
