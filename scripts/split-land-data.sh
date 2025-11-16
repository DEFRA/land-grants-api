
#!/bin/bash

set -e

root_dir="/Users/airasoul/projects/defra/land-grants-api/ingestion-data"
CSV_FILE="${root_dir}/parcels_1.csv"
CHUNK_SIZE="90m"
TEMP_DIR="${root_dir}/data"

echo "\n----------------------------------------"
echo "Root directory: $root_dir"
echo "CSV file: $CSV_FILE"
echo "Chunk size: $CHUNK_SIZE"
echo "Temp directory: $TEMP_DIR"
echo "----------------------------------------"

# if folder does not exist, create it
if [ ! -d "$TEMP_DIR" ]; then
    mkdir -p "$TEMP_DIR"
fi

# if folder is not empty, delete contents
echo "Deleting contents of $TEMP_DIR"
rm -rf "${TEMP_DIR:?}"/*

echo "Splitting CSV into 100MB chunks..."
echo "Writing files to: $TEMP_DIR"
echo "----------------------------------------"

# split the csv file into chunks
HEADER=$(head -n 1 "$CSV_FILE")
tail -n +2 "$CSV_FILE" | split -b ${CHUNK_SIZE} - "${TEMP_DIR}/land_data_"

# add header to each chunk
for land_datafile in "${TEMP_DIR}"/land_data*; do
    temp_with_header="${land_datafile}.csv"
    echo "$HEADER" > "$temp_with_header"
    cat "$land_datafile" >> "$temp_with_header"
    rm "$land_datafile"
    mv "$temp_with_header" "${land_datafile}.csv"
done

echo "Split complete"
echo "Files written to: $TEMP_DIR"
echo "Total files: $(ls -1 ${TEMP_DIR}/land_data_*.csv | wc -l)"
echo "Total size: $(du -sh ${TEMP_DIR} | awk '{print $1}')"
echo "----------------------------------------"
