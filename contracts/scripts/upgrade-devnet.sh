#!/usr/bin/env bash
set -euo pipefail

CLUSTER="${ANCHOR_PROVIDER_URL:-devnet}"
WALLET="${ANCHOR_WALLET:-./mancer-deployer.json}"
PROGRAM_KEYPAIR="${PROGRAM_KEYPAIR:-target/deploy/token_distribution_protocol-keypair.json}"
PROGRAM_SO="${PROGRAM_SO:-target/deploy/token_distribution_protocol.so}"

if [ -z "${WALLET}" ] || [ ! -f "${WALLET}" ]; then
  echo "Wallet not found at ${WALLET}. Run from contracts/ or set ANCHOR_WALLET=/path/to/keypair.json."
  exit 1
fi

if [ ! -f "${PROGRAM_KEYPAIR}" ]; then
  echo "Program keypair not found at ${PROGRAM_KEYPAIR}. Run from contracts/ or set PROGRAM_KEYPAIR."
  exit 1
fi

PROGRAM_ID="$(solana address -k "${PROGRAM_KEYPAIR}")"

echo "Cluster: ${CLUSTER}"
echo "Wallet: ${WALLET}"
echo "Program: ${PROGRAM_ID}"
echo

solana config set --url "${CLUSTER}" --keypair "${WALLET}"
solana balance

anchor build
solana program deploy "${PROGRAM_SO}" \
  --program-id "${PROGRAM_KEYPAIR}" \
  --url "${CLUSTER}" \
  --keypair "${WALLET}"

bash scripts/sync-idl-to-frontend.sh
solana program show "${PROGRAM_ID}" --url "${CLUSTER}"
