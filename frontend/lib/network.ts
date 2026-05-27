export type ConfiguredCluster = {
  label: string;
  explorerCluster?: "devnet" | "testnet" | "mainnet-beta";
};

export function getConfiguredCluster(
  rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
): ConfiguredCluster {
  const normalized = rpcUrl?.toLowerCase() ?? "";

  if (!normalized || normalized.includes("devnet")) {
    return { label: "Devnet", explorerCluster: "devnet" };
  }

  if (normalized.includes("testnet")) {
    return { label: "Testnet", explorerCluster: "testnet" };
  }

  if (normalized.includes("mainnet")) {
    return { label: "Mainnet", explorerCluster: "mainnet-beta" };
  }

  return { label: "Custom RPC" };
}

export function getExplorerTxUrl(
  signature: string,
  rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
): string {
  const cluster = getConfiguredCluster(rpcUrl);
  const url = new URL(`https://explorer.solana.com/tx/${signature}`);

  if (cluster.explorerCluster) {
    url.searchParams.set("cluster", cluster.explorerCluster);
  }

  return url.toString();
}

export function getExplorerAddressUrl(
  address: string,
  rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
): string {
  const cluster = getConfiguredCluster(rpcUrl);
  const url = new URL(`https://explorer.solana.com/address/${address}`);

  if (cluster.explorerCluster) {
    url.searchParams.set("cluster", cluster.explorerCluster);
  }

  return url.toString();
}
