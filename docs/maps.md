## Maps

The api has 2 endpoints for integration with [defra interactive-map component](https://github.com/DEFRA/interactive-map)
within grants-ui

### Endpoints

### Locate Parcels

```
curl --request POST \
  --url http://localhost:3021/api/v1/parcel-tiles/locate \
  --header 'Authorization: Bearer <token>'
  --header 'Content-Type: application/json' \
  --data '{
  "parcelIds": ["SD2396-0165"]
}'
```

returns a bounding box around the parcels

```
{
  "message": "success",
  "bbox": {
    "minLng": -3.18932033922672,
    "minLat": 54.35804557753914,
    "maxLng": -3.1837251000271234,
    "maxLat": 54.361184070320945
  }
}
```

### Parcel tile

```
curl --request POST \
  --url http://localhost:3021/api/v1/parcel-tiles/14/8093/5203 \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "parcelIds": ["NY8936-3581"]
}'
```

returns the parcel tile as a protobuf encoded response

### Convert MVT to geojson

retrieve the mvt tile and save to a file

```
curl -o 14-8093-5203.mvt --request POST \
  --url http://localhost:3021/api/v1/parcel-tiles/14/8093/5203 \
  --header 'Authorization: Bearer <token> \
  --header 'Content-Type: application/json' \
  --data '{
  "parcelIds": ["NY8936-3581"]
}'
```

convert the mvt tile to geojson using [vt2geojson](https://github.com/mapbox/vt2geojson)

```
vt2geojson -z 14 -x 8093 -y 5203 14-8093-5203.mvt > mvt.geojson
```
