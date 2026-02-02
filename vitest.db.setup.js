import { ingestLandData } from './scripts/local-ingest-service.js'

let isSeeded = false

export default async () => {
  if (!isSeeded) {
    await ingestLandData()
    isSeeded = true
  }
}
