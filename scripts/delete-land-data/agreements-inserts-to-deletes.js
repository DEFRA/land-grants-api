import { readFileSync, writeFileSync } from 'fs'

const inputFile = 'changelog/agreements-data.sql'
const outputFile = 'changelog/delete-agreements-data.sql'

const content = readFileSync(inputFile, 'utf8')
const lines = content.trim().split('\n')

const deleteStatements = []

for (const line of lines) {
  if (!line.startsWith('VALUES')) continue
  const valuesStr = line.replace(/^VALUES \(/, '').replace(/\);?\s*$/, '')
  const parts = valuesStr.split(', ')

  const parcelId = parts[0].replace(/'/g, '')
  const sheetId = parts[1].replace(/'/g, '')

  const deleteStatement = `DELETE FROM agreements WHERE parcel_id = '${parcelId}' AND sheet_id = '${sheetId}';`
  deleteStatements.push(deleteStatement)
}

const output = deleteStatements.join('\n')

if (outputFile) {
  writeFileSync(outputFile, output)
  console.log(`Generated ${deleteStatements.length} DELETE statements in ${outputFile}`)
} else {
  console.log(output)
}

