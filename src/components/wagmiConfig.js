// wagmiConfig.js
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import { base } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Quote",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [base],
  ssr: true,
});
