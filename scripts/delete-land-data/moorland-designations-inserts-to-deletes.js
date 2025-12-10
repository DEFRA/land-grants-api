import { readFileSync, writeFileSync } from 'fs'

const inputFile = 'changelog/moorland-designations-data.sql'
const outputFile = 'changelog/delete-moorland-designations-data.sql'

const content = readFileSync(inputFile, 'utf8')
const lines = content.trim().split('\n')

const deleteStatements = []

for (const line of lines) {
  if (!line.startsWith('INSERT INTO moorland_designations')) continue
  const valuesStart = line.indexOf('VALUES (') + 8
  const valuesEnd = line.lastIndexOf(');')
  const valuesStr = line.slice(valuesStart, valuesEnd)
  const parts = valuesStr.split(', ')

  const lfaMoorId = parts[0]
  const name = parts[1].replace(/'/g, '')
  const refCode = parts[2].replace(/'/g, '')

  const deleteStatement = `DELETE FROM moorland_designations WHERE lfa_moor_id = ${lfaMoorId} AND name = '${name}' AND ref_code = '${refCode}';`
  deleteStatements.push(deleteStatement)
}

const output = deleteStatements.join('\n')

if (outputFile) {
  writeFileSync(outputFile, output)
  console.log(
    `Generated ${deleteStatements.length} DELETE statements in ${outputFile}`
  )
} else {
  console.log(output)
}
