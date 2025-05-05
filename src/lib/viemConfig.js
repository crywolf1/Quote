import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// only export a read‐only publicClient here
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});
