// Copies the schemas that live beside the rules into dist/ so the package is
// self-contained. Runs on `npm pack` / `npm publish` via prepack.
import { cpSync, rmSync, statSync } from 'node:fs'

const rules = new URL(
  '../../../src/features/rules-engine/rules/',
  import.meta.url
)
const dist = new URL('../dist/', import.meta.url)

rmSync(dist, { recursive: true, force: true })
cpSync(rules, dist, {
  recursive: true,
  filter: (src) =>
    statSync(src).isDirectory() ||
    /(^|\/)(schemas|rule-key)\.js$|\.schema\.js$/.test(src)
})
