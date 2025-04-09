import { createCoin } from "@zoralabs/coins-sdk";
import { useAccount } from "wagmi";

const mintQuoteAsCoin = async (quoteText) => {
  const { address } = useAccount();
  if (!address) {
    alert("Please connect your wallet first.");
    return;
  }
  try {
    const coin = await createCoin({
      metadata: { name: "Quote", description: quoteText, image: "[invalid url, do not cite]" },
      owner: address,
    });
    console.log("Coin minted:", coin);
  } catch (error) {
    console.error("Failed to mint Coin:", error);
  }
};