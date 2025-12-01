## ETL Land data ingestion

- [Back home](../README.md)

### Summary

The process will work using the CDP Uploader (API Upload) process:

- land data csv files are uploaded to an s3 bucket via [cdp uploader](https://portal.cdp-int.defra.cloud/documentation/how-to/file-upload.md?q=cdp-uploader%20will%20scan%20the%20files%20uploaded%20#api-upload)
- the cdp uploader will notify this service of a new file
- as a backup we also run a cron job which polls the bucket for new files
- the file is imported to postgres

Further documentation via github for the [cpp uploader](https://github.com/DEFRA/cdp-uploader/blob/main/README.md)

### Detailed outline of process

The ETL service will call the `land-grants-api` service to initiate an upload `/initiate-upload`.

#### Request:

```
POST /initiate-upload HTTP/1.1
Host: land-grants-api.{env}.cdp-int.defra.cloud

{
  "reference": "1234",
  "customerId": "customer",
  "resource" "parcels|covers|moorland"
}
```

#### Response:

A public url (`note ..grants-ui..`) will be returned to the ETL service. This url will be used to upload the file to the CDP Uploader. Basically the `upload-and-scan` cdp endpoint is made available via our frontend `grants-ui`, this is automatically configured on account of us requesting the cdp uploader service.

```
{
  "uploadUrl": "https://grants-ui.dev.cdp-int.defra.cloud/upload-and-scan/fc730e47-73c6-4219-a3c5-49b6dfce6e71"
}
```

The `land-grants-api` `initiate-upload` endpoint will call the internal `cdp-uploader` service to initiate an upload `/initiate`.

#### Request:

```
POST /initiate HTTP/1.1
Host: cdp-uploader.{env}.cdp-int.defra.cloud
Content-Type: application/json

{
  "redirect": "/health",
  "callback": "https://land-grants-api.dev.cdp-int.defra.cloud/cdp-uploader-callback",
  "s3Bucket": "dev-fcp-farming-sfi-reform-land-grants-data-c63f2",
  "metadata": {
    "reference": "12345"
  }
}
```

#### Response:

The `cdp-uploader` service will return a unique URL for uploading the file. The `land-grants-api` service will return the constructerd `uploadUrl` to the ETL service `frontend-service + uploadUrl`.

e.g. https://grants-ui.dev.cdp-int.defra.cloud/upload-and-scan/fc730e47-73c6-4219-a3c5-49b6dfce6e71

```
{
  "uploadId": "fc730e47-73c6-4219-a3c5-49b6dfce6e71",
  "uploadUrl": "/upload-and-scan/fc730e47-73c6-4219-a3c5-49b6dfce6e71",
  "statusUrl": "https://cdp-uploader.perf-test.cdp-int.defra.cloud/status/fc730e47-73c6-4219-a3c5-49b6dfce6e71"
}
```

The ETL service will upload the file to the public `uploadUrl` using either:

- Multipart form uploads (for browser-style clients)
- Binary uploads (for backend integrations)

For binary uploads, an `x-filename` header can be included to specify the filename to be recorded in metadata.

#### Request

```
POST /upload-and-scan/e2cd56f2-abfc-4d2f-82a4-e2c4cba02a0e HTTP/1.1
Host: https://grants-ui.dev.cdp-int.defra.cloud
Content-Type: image/jpeg
x-filename: parcels-01.csv

(binary data from /path/to/parcels-01.csv)
```

The response, if successful will call an endpoint on our service, which we configured when we called
`/initiate` - `redirect` set to `/status` (currently)

The CDP uploader will on upload of a file call the `callback endpoint` we provided when calling `/initiate` e.g. - `cdp-uploader-callback`

The `cdp-uploader-callback` will trigger the import process for that file

```
{
    "uploadStatus": "ready",
    "metadata": {
        "reference": "12345"
    },
    "form": {
        "file": {
            "fileId": "910ce428-e07c-494d-9017-d6165e729380",
            "filename": "parcels-01.csv",
            "contentType": "text/csv",
            "fileStatus": "complete",
            "contentLength": 21602,
            "checksumSha256": "Y44BR07gRSUXka1XAZm3ZOdtRxo9SmK6RQqZQMjmMyk=",
            "s3Key": "5a75a2ae-aff1-4a55-9371-ba1fbf830dc6/910ce428-e07c-494d-9017-d6165e729380",
            "s3Bucket": "dev-fcp-farming-sfi-reform-land-grants-data-c63f2"
        }
    },
    "numberOfRejectedFiles": 0
}
```

### Testing locally

In order to test data ingestion locally, we have configured localstack to creates an s3 bucket `s3://land-data/`.

The import process runs on a schedule but can also be started via:

```
GET localhost:3001/ingest-land-data-schedule
```

### Working with S3 bucket

Here are a series of aws cli commands to work with files and buckets

#### Upload a file to the land-data bucket

Import parcels:

```
aws --endpoint-url=http://localhost:4566 s3 cp ingestion-data/parcels_head.csv s3://land-data/parcels/85c49b7d-cceb-434c-aa5b-f532ad1b12f9.csv
```

Import compatibility matrix

```
aws --endpoint-url=http://localhost:4566 s3 cp ingestion-data/compatibility-matrix.csv s3://land-data/compatibility-matrix/85c49b7d-cceb-434c-aa5b-f532ad1b12f9.csv
```

Import moorland

```
aws --endpoint-url=http://localhost:4566 s3 cp ingestion-data/moorland.csv s3://land-data/moorland/85c49b7d-cceb-434c-aa5b-f532ad1b12f9.csv
```

#### List all buckets

```
aws --endpoint-url=http://localhost:4566 s3 ls
```

#### List all files in the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://land-data
```

List files in parcels

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://land-data/parcels/
```

List files in compatibility matrix

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://land-data/compatibility-matrix/
```

List files in moorland

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://land-data/moorland/
```

#### Delete a file from the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 rm s3://land-data/parcels.csv
```

#### Delete a folder from the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 rm s3://land-data --recursive
```
