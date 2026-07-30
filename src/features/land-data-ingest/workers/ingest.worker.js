import { workerData } from 'node:worker_threads';
import { ingestLandData } from './ingest.module.js';

await ingestLandData(workerData);
