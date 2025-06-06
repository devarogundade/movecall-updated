import { holesky } from "viem/chains";
import { walletConnect } from "@wagmi/connectors";
import { defaultWagmiConfig } from "@web3modal/wagmi";

const metadata = {
  name: "ZK Bridge | MoveCall.",
  description: "ZK Bridge | MoveCall.",
  url: "https://movecall_bridge.deeplayr.xyz",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const chains = [holesky];

export const config = defaultWagmiConfig({
  // @ts-ignore
  chains,
  projectId: import.meta.env.VITE_PROJECT_ID,
  metadata,
  connectors: [
    walletConnect({
      projectId: import.meta.env.VITE_PROJECT_ID,
    }),
  ],
});
