import { WalletProvider } from "@/components/WalletProvider";

export default function StreamsLayout({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
