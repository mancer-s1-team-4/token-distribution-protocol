#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IDL_SOURCE="${ROOT_DIR}/contracts/target/idl/token_distribution_protocol.json"
IDL_TARGET="${ROOT_DIR}/frontend/lib/idl/token_distribution_protocol.json"

if [ ! -f "${IDL_SOURCE}" ]; then
  echo "IDL not found at ${IDL_SOURCE}. Run anchor build first."
  exit 1
fi

cp "${IDL_SOURCE}" "${IDL_TARGET}"
echo "Synced IDL to ${IDL_TARGET}"
