/*


import { NextResponse } from "next/server";
import { updatePayoutRecipient } from "@zoralabs/coins-sdk";
import { createWalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req) {
  try {
    console.log("UpdatePayoutRecipient API called");

    // Parse request body
    const { coinAddress, quoteId, newPayoutRecipient } = await req.json();

    if (!coinAddress) {
      console.error("Missing coin address");
      return NextResponse.json(
        { error: "Coin address is required" },
        { status: 400 }
      );
    }

    console.log(`Updating payoutRecipient for ${coinAddress}`);

    // Get platform private key from environment variables
    const platformPrivateKey = process.env.PLATFORM_PRIVATE_KEY;
    if (!platformPrivateKey) {
      console.error("Platform private key not found");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const formattedPrivateKey = platformPrivateKey.startsWith("0x")
      ? platformPrivateKey
      : `0x${platformPrivateKey}`;

    const account = privateKeyToAccount(formattedPrivateKey);

    // Get platform address for fallback if newPayoutRecipient isn't provided
    const platformAddress = process.env.PLATFORM_ADDRESS;
    if (!platformAddress && !newPayoutRecipient) {
      console.error(
        "No payoutRecipient specified and platform address not found"
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Use provided newPayoutRecipient or default to platform address
    const finalPayoutRecipient = newPayoutRecipient || platformAddress;

    console.log(`Setting payoutRecipient to: ${finalPayoutRecipient}`);

    // Create clients
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_URL || "https://base.llamarpc.com"),
    });

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.RPC_URL || "https://base.llamarpc.com"),
    });

    // Update the payout recipient
    try {
      const result = await updatePayoutRecipient(
        {
          coin: coinAddress,
          newPayoutRecipient: finalPayoutRecipient,
        },
        walletClient,
        publicClient
      );

      console.log("PayoutRecipient update transaction submitted:", result.hash);

      // Wait for transaction receipt
      let receipt;
      try {
        receipt = await publicClient.waitForTransactionReceipt({
          hash: result.hash,
          timeout: 60000, // 60 second timeout
        });

        console.log("PayoutRecipient update confirmed:", receipt.status);
      } catch (receiptError) {
        console.warn(
          "Couldn't get receipt, but transaction was submitted:",
          receiptError.message
        );
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        hash: result.hash,
        payoutRecipient: finalPayoutRecipient,
        status: receipt ? receipt.status : "pending",
      });
    } catch (txError) {
      console.error("Transaction error:", txError);
      return NextResponse.json(
        { error: `Transaction failed: ${txError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}

// Add options method to support CORS preflight requests
export async function OPTIONS(req) {
  return NextResponse.json({}, { status: 200 });
}

*/ // Export the POST method for handling requests
