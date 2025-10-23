## ETL Land data ingestion

- [Back home](../README.md)

The process will work as follows:

- land data csv files are upload to an s3 bucket via [cdp uploader](https://github.com/DEFRA/cdp-uploader)
- the cdp uploader will post a new file to land grants api
- as a backup we also run a cron job which polls the bucket for new files
- the file is imported to postgres

### Testing locally

In order to tests data ingestion locally, we have configured localstack to creates an s3 bucket `s3://land-data/`.

The import process runs on a schedule but can also be started via:

```
GET localhost:3001/ingest-land-data-schedule
```

### Working with S3 bucket

Here are a series of aws cli commands to work with files and buckets

#### Upload a file to the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 cp parcels.csv s3://land-data/
aws --endpoint-url=http://localhost:4566 s3 cp covers.csv s3://land-data/
```

#### List all buckets

```
aws --endpoint-url=http://localhost:4566 s3 ls
```

#### List all files in the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://land-data
```

#### Delete a file from the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 rm s3://land-data/parcels.csv
```

#### Delete a folder from the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 rm s3://land-data/land-data --recursive
```
