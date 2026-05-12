#!/bin/sh
set -eu

REPO_URL="https://github.com/DEFRA/grant-config-woodland.git"
TARGET_DIR="./scripts/infra/floci-config"
TMP_DIR=$(mktemp -d)

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

echo "Fetching latest grant config from ${REPO_URL}"
git clone --depth 1 --branch main "${REPO_URL}" "${TMP_DIR}/grant-config-woodland"

mkdir -p "${TARGET_DIR}"
rm -rf "${TARGET_DIR:?}/"*
cp -R "${TMP_DIR}/grant-config-woodland/woodland/land-grants-api/." "${TARGET_DIR}/"

echo "Config files refreshed in ${TARGET_DIR}"
