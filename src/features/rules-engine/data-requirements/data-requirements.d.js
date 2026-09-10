/**
 * @import { RequirementDescriptor, RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 */

/**
 * Context passed to a provider's fetch. Carries the identifiers and handles a
 * query needs. Farm-level requirements (added later) also read `sbi`.
 * @typedef {object} RequirementContext
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {object} db - Postgres pool
 * @property {object} logger
 * @property {string} [sbi]
 */

/**
 * A provider knows how to dedupe, fetch and apply one requirement type.
 * @typedef {object} RequirementProvider
 * @property {(req: RequirementDescriptor) => string} dedupeKey - Stable key so the same data is fetched once
 * @property {(req: RequirementDescriptor, ctx: RequirementContext) => Promise<*>} fetch - Fetches the data
 * @property {(application: RuleEngineApplication, req: RequirementDescriptor, value: *) => void} apply - Writes the fetched value into the application
 */

export {}
