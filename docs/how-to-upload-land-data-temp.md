# Uploading land data (temporary & WIP process)

This service requires land data in its DB. This will come from an ETL process at some point but
for day 1 we need to do this manually. The Geospatial Data team in the RPA
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

## Use ogr2ogr to produce csv

Do this for each gpkg file:
`ogr2ogr -f "CSV" -lco GEOMETRY=AS_WKT -progress covers.csv RefLandCoversLive.gpkg`

## Split into sub 1 GB files

`mlr --csv split -n 400000 covers.csv`
