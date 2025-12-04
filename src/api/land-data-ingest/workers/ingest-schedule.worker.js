import { workerData } from 'node:worker_threads'
import { ingestLandData } from './ingest-schedule.module.js'

// eslint-disable-next-line
ingestLandData(workerData)
