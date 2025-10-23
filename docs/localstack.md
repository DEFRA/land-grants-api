## Working with Localstack

#### list all buckets

```
aws --endpoint-url=http://localhost:4566 s3 ls
```

#### list all files in the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://land-data
```

#### upload a file to the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 cp parcels.csv s3://land-data/
aws --endpoint-url=http://localhost:4566 s3 cp covers.csv s3://land-data/
```

#### delete a file from the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 rm s3://land-data/parcels.csv
```

#### delete a folder from the land-data bucket

```
aws --endpoint-url=http://localhost:4566 s3 rm s3://land-data/land-data --recursive
```
