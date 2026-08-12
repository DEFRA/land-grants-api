import { readFileSync } from 'node:fs'
import { findPackageJSON } from 'node:module'
import semver from 'semver'
import packageJson from '~/package.json' with { type: 'json' }

const readPackageJson = (packageName) => {
  const path = findPackageJSON(packageName, import.meta.url)
  return JSON.parse(readFileSync(path, 'utf8'))
}

describe('#peer dependencies', () => {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }

  test('All non-optional peer dependencies should be satisfied by the installed versions', () => {
    const issues = []

    for (const [packageName] of Object.entries(dependencies)) {
      const packageMeta = readPackageJson(packageName)
      const peerDependencies = packageMeta.peerDependencies ?? {}
      const peerDependenciesMeta = packageMeta.peerDependenciesMeta ?? {}

      for (const [peerName, range] of Object.entries(peerDependencies)) {
        const optional = peerDependenciesMeta[peerName]?.optional === true

        let peerVersion
        try {
          peerVersion = readPackageJson(peerName).version
        } catch {
          if (!optional) {
            issues.push(
              `${packageName} has missing peer dependency ${peerName} (${range})`
            )
          }
          continue
        }

        if (!semver.satisfies(peerVersion, range)) {
          issues.push(
            `${packageName} requires peer dependency ${peerName} ${range}, but ${peerVersion} is installed`
          )
        }
      }
    }

    expect(issues).toEqual([])
  })
})
