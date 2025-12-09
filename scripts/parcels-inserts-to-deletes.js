import { readFileSync, writeFileSync } from 'fs'

const inputFile = 'changelog/land-parcels-data.sql'
const outputFile = 'changelog/delete-land-parcels-data.sql'

const content = readFileSync(inputFile, 'utf8')
const lines = content.trim().split('\n')

const deleteStatements = []

for (const line of lines) {
  if (!line.startsWith('INSERT INTO land_parcels')) continue
  const valuesStart = line.indexOf('VALUES (') + 8
  const valuesEnd = line.lastIndexOf(');')
  const valuesStr = line.slice(valuesStart, valuesEnd)
  const parts = valuesStr.split(', ')
  const sheetId = parts[1].replace(/'/g, '')
  const parcelId = parts[2].replace(/'/g, '')
  const areaSqm = parts[3]

  const deleteStatement = `DELETE FROM land_parcels WHERE sheet_id = '${sheetId}' AND parcel_id = '${parcelId}' AND area_sqm = ${areaSqm};`
  deleteStatements.push(deleteStatement)
}

const output = deleteStatements.join('\n')

if (outputFile) {
  writeFileSync(outputFile, output)
  console.log(`Generated ${deleteStatements.length} DELETE statements in ${outputFile}`)
} else {
  console.log(output)
}
