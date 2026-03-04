#!/usr/bin/env bash
#
# Fast extraction of parcel and cover entries from land-data-full.
# Requires bash (process substitution, arrays). Re-exec with bash if run via sh.
#
[ -z "$BASH_VERSION" ] && exec bash "$0" "$@"
# Uses grep for speed - avoids loading huge CSVs into memory.
#
# Usage: ./extract-test-parcels-and-covers.sh [JSON array]
# Example: ./extract-test-parcels-and-covers.sh '[{"parcelId":"6898","sheetId":"NT8109"}]'
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="${SOURCE_DIR:-$PROJECT_ROOT/src/land-data-full}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/src/land-data}"

PARCELS_SRC="$SOURCE_DIR/land_parcels"
COVERS_SRC="$SOURCE_DIR/land_covers"
PARCELS_OUT="$OUTPUT_DIR/land_parcels/test_parcels.csv"
COVERS_OUT="$OUTPUT_DIR/land_covers/test_covers.csv"

# Default pairs if no JSON provided
DEFAULT_PAIRS='[
  {"parcelId":"6898","sheetId":"NT8109"},
  {"parcelId":"1023","sheetId":"NT9009"},
  {"parcelId":"9412","sheetId":"NT8701"},
  {"parcelId":"1755","sheetId":"NU0002"},
  {"parcelId":"8111","sheetId":"NT8506"},
  {"parcelId":"7349","sheetId":"ST1437"},
  {"parcelId":"0972","sheetId":"ST1335"},
  {"parcelId":"5025","sheetId":"ST1236"},
  {"parcelId":"9525","sheetId":"ST1237"}
]'

PAIRS_JSON="${1:-$DEFAULT_PAIRS}"

# Build grep pattern: ,SHEET_ID,0*PARCEL_NUM, matches with/without leading zeros
normalize_parcel() {
  local p="$1"
  # Strip leading zeros for regex: 0972 -> 972, 6898 -> 6898
  echo "$((10#$p))"
}

build_pattern() {
  local sheet="$1" parcel="$2"
  local pnorm
  pnorm=$(normalize_parcel "$parcel")
  # Match ,SHEET,PARCEL, or ,SHEET,0PARCEL, etc (handles leading zeros)
  echo ",${sheet},0*${pnorm},"
}

# Get header from first parcel/cover file (exclude _head files)
get_parcel_header() {
  local f
  for f in "$PARCELS_SRC"/parcel_[0-9]*.csv; do
    [[ -f "$f" ]] && head -1 "$f" && return
  done
}

get_cover_header() {
  local f
  for f in "$COVERS_SRC"/land-covers_[0-9]*.csv; do
    [[ -f "$f" ]] && head -1 "$f" && return
  done
}

# Extract parcels and covers using grep (fast, streams, no full load)
main() {
  local patterns=() pattern
  local sheet parcel
  local parcel_count=0 cover_count=0

  # Parse JSON and build grep -E pattern (pattern1|pattern2|...)
  while read -r line; do
    sheet=$(echo "$line" | jq -r '.sheetId')
    parcel=$(echo "$line" | jq -r '.parcelId')
    [[ "$sheet" == "null" || "$parcel" == "null" ]] && continue
    pattern=$(build_pattern "$sheet" "$parcel")
    patterns+=("$pattern")
  done < <(echo "$PAIRS_JSON" | jq -c '.[]')

  if [[ ${#patterns[@]} -eq 0 ]]; then
    echo "No valid parcel/sheet pairs found"
    exit 1
  fi

  # Join patterns for grep -E: (pat1|pat2|pat3)
  local combined="${patterns[0]}"
  for ((i=1; i<${#patterns[@]}; i++)); do
    combined="${combined}|${patterns[i]}"
  done
  local grep_pat="(${combined})"

  # Use LC_ALL=C for faster grep; parallel xargs for multi-core
  export LC_ALL=C

  # Use ripgrep (rg) if available - much faster on huge files; else parallel grep
  run_search() {
    local dir="$1" glob="$2"
    if command -v rg &>/dev/null; then
      rg -I --no-messages -e "$grep_pat" "$dir" -g "$glob" 2>/dev/null || true
    else
      find "$dir" -maxdepth 1 -name "$glob" -print0 2>/dev/null | \
        xargs -0 -P 8 grep -h -E "$grep_pat" 2>/dev/null || true
    fi
  }

  # Append new rows only if key not already in file. Parcels: (PARCEL_ID,SHEET_ID). Covers: ID.
  # Strips carriage returns so PostgreSQL COPY works (avoids "unquoted carriage return" error).
  append_new_only() {
    local out="$1" key_type="$2"
    python3 -c '
import csv,sys
from pathlib import Path
def strip_cr(row): return [c.replace("\r","") for c in row]
out,key_type=sys.argv[1],sys.argv[2]
all_rows=[]
headers=None
p=Path(out)
if p.exists() and p.stat().st_size>0:
  with open(out,newline="",encoding="utf-8") as f:
    r=csv.reader(f)
    headers=strip_cr(next(r))
    idx={n:i for i,n in enumerate(headers)}
    for row in r:
      row=strip_cr(row)
      if len(row)>max(idx.get("PARCEL_ID",0),idx.get("SHEET_ID",0),idx.get("ID",0)):
        all_rows.append(row[:len(headers)])
r=csv.reader(sys.stdin)
new_headers=strip_cr(next(r))
if headers is None: headers=new_headers
for row in r:
  row=strip_cr(row)
  if len(row)>=len(headers): all_rows.append(row[:len(headers)])
seen=set()
unique=[]
for row in all_rows:
  key=(row[headers.index("PARCEL_ID")],row[headers.index("SHEET_ID")]) if key_type=="parcels" else row[headers.index("ID")]
  if key not in seen:
    seen.add(key)
    unique.append(row)
with open(out,"w",newline="",encoding="utf-8") as f:
  w=csv.writer(f,lineterminator="\n")
  w.writerow(headers)
  w.writerows(unique)
' "$out" "$key_type"
  }

  echo "Searching parcels..."
  tmp_p=$(mktemp)
  run_search "$PARCELS_SRC" "parcel_[0-9]*.csv" | sort -u > "$tmp_p"
  parcel_count=$(wc -l < "$tmp_p")
  {
    get_parcel_header
    cat "$tmp_p"
  } | append_new_only "$PARCELS_OUT" parcels
  rm -f "$tmp_p"

  echo "Searching covers..."
  tmp_c=$(mktemp)
  run_search "$COVERS_SRC" "land-covers_[0-9]*.csv" | sort -u > "$tmp_c"
  cover_count=$(wc -l < "$tmp_c")
  {
    get_cover_header
    cat "$tmp_c"
  } | append_new_only "$COVERS_OUT" covers
  rm -f "$tmp_c"

  echo "Parcels written: $parcel_count"
  echo "Covers written: $cover_count"
}

main
