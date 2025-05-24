/*

import { NextResponse } from "next/server";
import { SplitsClient } from "@0xsplits/splits-sdk";
import { createWalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req) {
  try {
    console.log("CreateSplit API called with Splits SDK v1");

    // Parse the request body
    const { recipients } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length < 2) {
      return NextResponse.json(
        { error: "At least two valid recipients are required" },
        { status: 400 }
      );
    }

    // Get platform private key from environment variables
    const platformPrivateKey = process.env.PLATFORM_PRIVATE_KEY;
    if (!platformPrivateKey) {
      return NextResponse.json(
        { error: "Platform private key not configured" },
        { status: 500 }
      );
    }

    // Format private key
    const formattedPrivateKey = platformPrivateKey.startsWith("0x")
      ? platformPrivateKey
      : `0x${platformPrivateKey}`;

    // Create account from private key
    const account = privateKeyToAccount(formattedPrivateKey);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.RPC_URL || "https://base.llamarpc.com"),
    });

    // Create public client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_URL || "https://base.llamarpc.com"),
    });

    // Format the recipients for the Splits SDK
    // According to docs, percentAllocation should be a number between 0-100
    const formattedRecipients = recipients.map((recipient) => ({
      address: recipient.address,
      percentAllocation: recipient.percentAllocation / 10000, // Convert basis points to percentage
    }));

    // Validate total percentage adds up to 100
    const totalPercentage = formattedRecipients.reduce(
      (sum, recipient) => sum + recipient.percentAllocation,
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      // Allow tiny rounding differences
      return NextResponse.json(
        {
          error: `Total percentage must equal 100%. Current total: ${totalPercentage.toFixed(
            2
          )}%`,
        },
        { status: 400 }
      );
    }

    console.log("Creating split with recipients:", formattedRecipients);

    try {
      // Initialize the Splits SDK client
      const splitsClient = new SplitsClient({
        chainId: 8453, // Base chain ID
        publicClient: publicClient,
        walletClient: walletClient,
      });

      console.log("SplitsClient initialized");

      // According to the v1 docs, we need to use the splitV1 property
      const splitV1 = splitsClient.splitV1;

      if (!splitV1) {
        console.error("splitV1 is undefined, trying alternative approach");
        return NextResponse.json(
          { error: "Failed to initialize Splits SDK properly" },
          { status: 500 }
        );
      }

      // Create the split using the correct method according to documentation
      const createSplitResponse = await splitV1.createSplit({
        recipients: formattedRecipients,
        distributorFeePercent: 0, // No distributor fee
        controller: account.address, // Platform is controller
      });

      console.log("Split creation response:", createSplitResponse);

      const splitAddress = createSplitResponse.splitAddress;
      const event = createSplitResponse.event;

      if (!splitAddress) {
        console.error("Split address is missing from response");
        return NextResponse.json(
          { error: "Failed to create split: Split address not returned" },
          { status: 500 }
        );
      }

      console.log("Split created successfully!");
      console.log("Split address:", splitAddress);
      console.log("Transaction event:", event);

      // Extract transaction hash from the event
      const txHash = event?.transactionHash || null;

      return NextResponse.json({
        success: true,
        splitAddress,
        txHash,
        controller: account.address,
        platformPercentage: 50,
        creatorPercentage: 50,
      });
    } catch (sdkError) {
      console.error("Splits SDK error:", sdkError);
      return NextResponse.json(
        { error: `Failed to create split: ${sdkError.message}` },
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

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

*///This code is for creating a split using the Splits SDK v1.