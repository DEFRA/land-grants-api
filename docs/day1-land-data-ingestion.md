# Day 1 land data ingestion

- [Back home](../README.md)

This service requires land data in its DB. This data will come from an - [ETL process](etl-land-data-ingestion.md).

For day 1 we need to do this manually. The Geospatial Data team in the RPA
(Paul.Dutton@rpa.gov.uk, Brian.O'Toole@rpa.gov.uk) can provide us with GeoPackage files with a cut
of the production data from the spatial data mart. We need to get this data on to our test and
prod DBs.

The process works like this:

- Request gpkg files for parcels, land covers and moorland/LFA
- Unzip gpkg files
- Use [ogr2ogr](https://gdal.org/en/stable/programs/ogr2ogr.html) to produce csv
- Use [Miller](https://miller.readthedocs.io/en/latest/installing-miller/) to split into sub 1 GB files
- Upload to the CDP web console for the right environment
- Use `psql` cli tool to copy to db

## Copy land data files

The land data are GeoPackage files that have been processed and put into sharepoint.

### Data files

They have been converted to csv files < 1gb in size for importing using the following:

```
Output geopackage to csv:
`ogr2ogr -f "CSV" -lco GEOMETRY=AS_WKT -progress covers.csv RefLandCoversLive.gpkg`

split csv:
`mlr --csv split -n 400000 covers.csv`
```

and uploaded to [sharepoint](https://defra.sharepoint.com/teams/Team1645/Restricted_FCP%20RPS%20Future/Forms/AllItems.aspx?id=%2Fteams%2FTeam1645%2FRestricted%5FFCP%20RPS%20Future%2FData%20Extracts%2FLMS%20Data&viewid=f5678bbd%2Dae3a%2D4cd4%2D9f4c%2Dab8e79452a94&e=5%3A476e1a591f0d4eccaf68623c67987081&sharingv2=true&fromShare=true&at=9&CID=274e8249%2Dca8a%2D4bd9%2D98c2%2D72693cc19784&FolderCTID=0x0120003E0DBE7EBC40834DB6321029329D6BBB)

## Import land data

The [import-land-data](./import-land-data) batch file can be run on the CDP terminal once all the required files have been uploaded.

List of files to upload:

- [import-land-data](../scripts/import-land-data/import-land-data)
- [create_land_covers_temp_table.sql](../scripts/import-land-data/land_covers/create_land_covers_temp_table.sql)
- [insert_land_covers.sql](../scripts/import-land-data/land_covers/insert_land_covers.sql)
- [create_land_parcels_temp_table.sql](../scripts/import-land-data/land_parcels/create_land_parcels_temp_table.sql)
- [insert_land_parcels.sql](../scripts/import-land-data/land_parcels/insert_land_parcels.sql)
- [create_moorland_designations_temp_table.sql](../scripts/import-land-data/moorland_designations/create_moorland_designations_temp_table.sql)
- [insert_moorland_designations.sql](../scripts/import-land-data/moorland_designations/insert_moorland_designations.sql)
- all the land data csv files

give the batch file permissions

```
chmod +x import-land-data
```

run the batch file for each entity:

```
chmod +x import-land-data
./import-land-data land_covers
./import-land-data land_parcels
./import-land-data moorland_designations
```

## Local dev

You can import the data locally using [import-land-data.js](../scripts//import-land-data/import-land-data.js)

Copy the csv files into the dir [../scripts//import-land-data](../scripts//import-land-data)

run the script `node ./scripts/import-land-data/import-land-data.js`
