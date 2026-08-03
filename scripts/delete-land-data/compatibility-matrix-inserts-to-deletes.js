import { readFileSync, writeFileSync } from 'fs'

const inputFile = 'changelog/compatibility-matrix.sql'
const outputFile = 'changelog/delete-compatibility-matrix-data.sql'

const content = readFileSync(inputFile, 'utf8')
const lines = content.trim().split('\n')

const deleteStatements = []

for (const line of lines) {
  if (!line.startsWith('(')) continue
  const valuesStr = line.replace(/^\(/, '').replace(/\)[,;]?\s*$/, '')
  const parts = valuesStr.split(', ')
  const optionCode = parts[0].replace(/'/g, '')
  const optionCodeCompat = parts[1].replace(/'/g, '')
  const year = parts[2]

  const deleteStatement = `DELETE FROM compatibility_matrix WHERE option_code = '${optionCode}' AND option_code_compat = '${optionCodeCompat}' AND year = ${year};`
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
