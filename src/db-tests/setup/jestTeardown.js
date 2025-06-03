import { containers } from './jestSetup.js'

export default async () => {
  await Promise.all(
    containers.map((container) => container.stop({ timeout: 10000 }))
  )
}
