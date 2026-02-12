import { workerData } from 'node:worker_threads'
import { ingestLandData } from './ingest.module.js'

// eslint-disable-next-line
ingestLandData(workerData)
