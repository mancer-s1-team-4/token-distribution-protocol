#!/usr/bin/env bash
set -euo pipefail

CLUSTER="${ANCHOR_PROVIDER_URL:-devnet}"
WALLET="${ANCHOR_WALLET:-$(solana config get Keypair Path | awk -F': ' '{print $2}')}"
PROGRAM_ID="J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3"

if [ -z "${WALLET}" ] || [ ! -f "${WALLET}" ]; then
  echo "Wallet not found. Set ANCHOR_WALLET=/path/to/keypair.json or configure solana config keypair."
  exit 1
fi

echo "Cluster: ${CLUSTER}"
echo "Wallet: ${WALLET}"
echo "Program: ${PROGRAM_ID}"
echo

solana config set --url "${CLUSTER}" --keypair "${WALLET}"
solana balance

anchor build
anchor deploy --provider.cluster "${CLUSTER}" --provider.wallet "${WALLET}"
solana program show "${PROGRAM_ID}" --url "${CLUSTER}"
