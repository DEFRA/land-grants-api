// Copies the schemas, and the files they import, from src/ into dist/ at the
// same paths so their relative imports still resolve. Runs on `npm pack` /
// `npm publish` via prepack.
import { cpSync, globSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('../../../src/', import.meta.url))
const dist = fileURLToPath(new URL('../dist/', import.meta.url))

const ACTION_CONFIG_SCHEMA =
  'features/grants-config/schema/action-config.schema.js'

const sources = [
  ACTION_CONFIG_SCHEMA,
  'features/common/constants/action_availability.js',
  'features/common/constants/unit_type.js',
  'features/rules-engine/rules/rule-key.js',
  'features/rules-engine/rules/**/schemas.js',
  'features/rules-engine/rules/**/*.schema.js'
]

rmSync(dist, { recursive: true, force: true })

for (const file of globSync(sources, { cwd: src })) {
  cpSync(`${src}${file}`, `${dist}${file}`)
}

writeFileSync(
  `${dist}index.js`,
  `export { validateActionConfig } from './${ACTION_CONFIG_SCHEMA}'\n`
)
