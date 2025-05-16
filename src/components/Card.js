"use client";

import { useFarcaster } from "./FarcasterFrameProvider";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useProfile } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/frame-sdk";
import { createZoraCoin } from "@/lib/createZoraCoin";
import { useAccount, useWalletClient, useDisconnect } from "wagmi";
import { publicClient, isWalletReady, getWalletClient } from "@/lib/viemConfig";
import CustomConnectButton from "./CustomConnectButton";
import { updateZoraCoin } from "@/lib/updateZoraCoin";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/style.css";
import {
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaWallet,
  FaShareSquare,
  FaSpinner,
} from "react-icons/fa";

export default function Card() {
  const { userData, loading, error, connectWallet } = useFarcaster();
  const { isConnected, isDisconnected, status, address } = useAccount();
  const {
    data: walletClient,
    isLoading: isWalletLoading,
    isError: isWalletError,
  } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { profile, isLoading } = useProfile();
  // Use fallback values if userData is not loaded yet
  const username = userData?.username || userData?.displayName || "Guest";
  const pfpUrl = userData?.pfpUrl || "/assets/icon.png";
  const displayName = userData?.displayName || username;

  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [quoteOfTheDay, setQuoteOfTheDay] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [title, setTitle] = useState("");
  const [creatingTokens, setCreatingTokens] = useState([]);
  const [checkingTokens, setCheckingTokens] = useState([]);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  // Fetch quotes from API
  const fetchQuoteOfTheDay = async () => {
    if (!address) return;

    try {
      const res = await fetch(`/api/quote-of-the-day?userAddress=${address}`);
      const data = await res.json();
      if (res.ok) {
        setQuoteOfTheDay(data.quote);
      } else {
        setMessage(data.error || "Failed to fetch quote of the day.");
      }
    } catch (error) {
      setMessage("Error fetching quote of the day.");
    }
  };

  useEffect(() => {
    fetchQuoteOfTheDay();
  }, [address]);

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const fetchQuotes = async () => {
    if (!address) return;

    try {
      const res = await fetch(`/api/quote?creatorAddress=${address}`);
      const data = await res.json();
      if (res.ok) {
        setQuotes(data.quotes);
        if (data.quotes.length > 0) {
          setCurrentIndex(Math.floor(Math.random() * data.quotes.length));
        }
      } else {
        setMessage("Failed to fetch quotes.");
      }
    } catch (error) {
      setMessage("Failed to fetch quotes.");
    }
  };

  useEffect(() => {
    if (address) {
      fetchQuotes();
    }
  }, [address]);

  useEffect(() => {
    setReady(true);
  }, []);

  const handleCastQuoteOfTheDay = async () => {
    if (!profile) {
      alert("Please sign in to Farcaster first");
      return;
    }

    if (!quoteOfTheDay) return;

    const owner = quoteOfTheDay.username
      ? `@${quoteOfTheDay.username}`
      : quoteOfTheDay.creatorAddress?.slice(0, 8) || "Unknown";

    await sdk.actions.composeCast({
      text: `"${quoteOfTheDay.text}" — ${owner}`,
    });
  };

  // Modified sendQuote function to add debugging and fix wallet client issues
  // Function to check token status and handle cancellations
  const checkTokenStatus = async (quoteId, txHash) => {
    // Prevent multiple simultaneous checks
    if (checkingTokens.includes(quoteId)) return;

    // Add to checking state
    setCheckingTokens((prev) => [...prev, quoteId]);

    try {
      // First check for transaction status - did user cancel it?
      try {
        const txStatusRes = await fetch(
          `https://explorer.zora.energy/api/v2/tx/${txHash}`
        );
        if (txStatusRes.ok) {
          const txData = await txStatusRes.json();

          // If transaction was rejected/canceled (status 0)
          if (txData && txData.status === "0") {
            console.log("Transaction was canceled or failed:", txHash);

            // Delete the quote since the transaction failed
            const deleteRes = await fetch(`/api/quote/${quoteId}`, {
              method: "DELETE",
            });

            if (deleteRes.ok) {
              console.log("Quote deleted due to canceled transaction");
              // Remove from UI
              setQuotes((prevQuotes) =>
                prevQuotes.filter((q) => q._id !== quoteId)
              );
              // Remove from pending states
              setCreatingTokens((prev) => prev.filter((id) => id !== quoteId));
              setCheckingTokens((prev) => prev.filter((id) => id !== quoteId));
              return;
            }
          }
        }
      } catch (txCheckError) {
        console.error("Error checking transaction status:", txCheckError);
      }

      // Check our database for the most recent status
      const dbRes = await fetch(`/api/quote/${quoteId}`);
      if (dbRes.ok) {
        const data = await dbRes.json();

        // If we already have a token address in the DB, update the UI
        if (data.quote && data.quote.zoraTokenAddress) {
          setQuotes((prevQuotes) => {
            return prevQuotes.map((q) =>
              q._id === quoteId ? { ...q, ...data.quote, isPending: false } : q
            );
          });

          // Remove from pending and checking states
          setCreatingTokens((prev) => prev.filter((id) => id !== quoteId));
          setCheckingTokens((prev) => prev.filter((id) => id !== quoteId));
          return;
        }
      }

      // If we don't have a token address in our DB, check directly on the blockchain
      if (txHash) {
        try {
          const explorerUrl = `https://explorer.zora.energy/api/v2/transactions/${txHash}`;
          const explorerRes = await fetch(explorerUrl);

          if (explorerRes.ok) {
            const txData = await explorerRes.json();

            // Check if transaction was successful
            if (txData.status === "1") {
              // Try to extract token address from transaction
              let tokenAddress = null;

              // Check for creates field in transaction response
              if (txData.creates) {
                tokenAddress = txData.creates;
              }

              // If token address found, update the quote
              if (tokenAddress) {
                const updateRes = await fetch(`/api/quote/${quoteId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    zoraTokenAddress: tokenAddress,
                    zoraTokenPending: false,
                  }),
                });

                if (updateRes.ok) {
                  // Update UI
                  setQuotes((prevQuotes) => {
                    return prevQuotes.map((q) =>
                      q._id === quoteId
                        ? {
                            ...q,
                            zoraTokenAddress: tokenAddress,
                            isPending: false,
                            zoraTokenPending: false,
                          }
                        : q
                    );
                  });

                  // Remove from pending states
                  setCreatingTokens((prev) =>
                    prev.filter((id) => id !== quoteId)
                  );
                }
              }
            } else if (txData.status === "0") {
              // Transaction failed - delete the quote
              const deleteRes = await fetch(`/api/quote/${quoteId}`, {
                method: "DELETE",
              });

              if (deleteRes.ok) {
                // Remove from UI
                setQuotes((prevQuotes) =>
                  prevQuotes.filter((q) => q._id !== quoteId)
                );
                // Show message
                setMessage("Quote removed - transaction was canceled");
              }

              // Remove from pending states
              setCreatingTokens((prev) => prev.filter((id) => id !== quoteId));
            }
          }
        } catch (error) {
          console.error("Error checking explorer:", error);
        }
      }
    } catch (error) {
      console.error("Error in checkTokenStatus:", error);
    } finally {
      // Always remove from checking state when done
      setCheckingTokens((prev) => prev.filter((id) => id !== quoteId));
    }
  };

  // Add this useEffect to automatically check for transaction status periodically
  useEffect(() => {
    if (!autoRefreshEnabled || creatingTokens.length === 0) return;

    const checkAllPendingTokens = async () => {
      console.log("Checking all pending tokens:", creatingTokens);

      for (const quoteId of creatingTokens) {
        const quote = quotes.find((q) => q._id === quoteId);
        if (quote && quote.zoraTokenTxHash) {
          await checkTokenStatus(quoteId, quote.zoraTokenTxHash);
        }
      }
    };

    // Initial check after component mounts
    checkAllPendingTokens();

    // Set up interval to check periodically (every 15 seconds)
    const interval = setInterval(checkAllPendingTokens, 15000);

    return () => clearInterval(interval);
  }, [creatingTokens, quotes, autoRefreshEnabled]);

  const sendQuote = async () => {
    if (isSaving) return; // Prevent multiple simultaneous submissions
    setIsSaving(true);

    // Log wallet client status for debugging
    if (isWalletLoading) {
      setMessage("Please wait while connecting to wallet...");
      setIsSaving(false);
      return;
    }

    if (isWalletError || !walletClient) {
      setMessage("Wallet connection error. Please reconnect your wallet.");
      console.error("Wallet client error:", isWalletError);
      setIsSaving(false);
      return;
    }

    // Validate basic inputs before proceeding
    if (!isConnected || !address) {
      setMessage("Please connect your wallet");
      setIsSaving(false);
      return;
    }
    if (!title.trim()) {
      setMessage("Please enter a title");
      setIsSaving(false);
      return;
    }
    if (!quote.trim()) {
      setMessage("Quote cannot be empty!");
      setIsSaving(false);
      return;
    }

    // Store temporary quote data to use if transaction succeeds
    let savedQuoteData = null;
    let cloudinaryImageUrl = null;

    try {
      // STEP 1: Generate the quote image using the OG endpoint
      setMessage("Generating quote image...");
      const ogUrl =
        `/api/og?quote=${encodeURIComponent(quote)}` +
        `&username=${encodeURIComponent(username)}` +
        `&displayName=${encodeURIComponent(displayName)}` +
        `&pfpUrl=${encodeURIComponent(pfpUrl)}`;

      // Fetch the image from the OG endpoint
      const response = await fetch(ogUrl);
      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      // Convert the image to Base64 format
      const blob = await response.blob();
      const base64Image = await blobToBase64(blob);

      // Set temporary image preview for UI
      setImagePreview(base64Image);

      // Create dateKey for the quote (YYYY-MM-DD format)
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // STEP 2: Save quote to database with a 'draft' status
      setMessage("Preparing your quote...");
      const createRes = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          text: quote,
          creatorAddress: address,
          fid: userData?.fid || null,
          username: userData?.username || null,
          displayName: userData?.displayName || `${address.slice(0, 6)}...`,
          pfpUrl: userData?.pfpUrl || "/assets/default-avatar.png",
          verifiedAddresses: userData?.verifiedAddresses || [address],
          dateKey,
          image: base64Image,
          isDraft: true, // Mark as draft until transaction succeeds
        }),
      });

      // Handle errors from quote creation API
      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || "Failed to save quote");
      }

      // Get the saved quote data from response
      const saved = await createRes.json();
      savedQuoteData = saved.quote;

      // Extract the Cloudinary URL from the response to avoid duplicate uploads
      cloudinaryImageUrl = saved.quote.imageUrl || null;
      console.log("Quote prepared, image URL:", cloudinaryImageUrl);

      // Add the quote to local state with a pending status
      setQuotes((prevQuotes) => {
        const newQuote = {
          ...saved.quote,
          isPending: true, // Mark as pending until token is created
        };
        return [newQuote, ...prevQuotes];
      });

      // Verify wallet client availability before token creation
      if (!walletClient) {
        console.error("Wallet client is not available");
        setMessage(
          "Quote prepared! Token creation failed: Wallet client not available."
        );

        // Delete the draft quote since we can't proceed
        await fetch(`/api/quote/${saved.quote._id}`, {
          method: "DELETE",
        });

        // Remove from UI
        setQuotes((prevQuotes) =>
          prevQuotes.filter((q) => q._id !== saved.quote._id)
        );

        // Reset form state and return early
        setQuote("");
        setTitle("");
        setImagePreview(null);
        setIsSaving(false);
        return;
      }

      // STEP 4: Mint token using Zora if wallet client is available
      try {
        setMessage("Creating token for your quote...");
        console.log("Starting token creation with:", {
          walletAddress: address,
          imageUrl: cloudinaryImageUrl,
          title: title.trim(),
        });

        // Add this quote ID to the creating tokens state
        setCreatingTokens((prev) => [...prev, saved.quote._id]);

        // Call the createZoraCoin function with necessary parameters
        const result = await createZoraCoin({
          walletClient: walletClient,
          publicClient,
          title: title.trim(),
          imageUrl: cloudinaryImageUrl,
          creatorAddress: address,
          quoteId: saved.quote._id,
        });
        console.log("Token creation result:", result);

        // Check if the user rejected/canceled the transaction
        if (
          result.status === "rejected" ||
          result.error?.includes("user rejected")
        ) {
          console.log("Transaction was rejected by user");
          setMessage("Quote creation canceled.");

          // Delete the draft quote since the user canceled the transaction
          await fetch(`/api/quote/${saved.quote._id}`, {
            method: "DELETE",
          });

          // Remove from UI
          setQuotes((prevQuotes) =>
            prevQuotes.filter((q) => q._id !== saved.quote._id)
          );

          // Remove from creating tokens state
          setCreatingTokens((prev) =>
            prev.filter((id) => id !== saved.quote._id)
          );

          // Reset form state
          setQuote("");
          setTitle("");
          setImagePreview(null);
          setIsSaving(false);
          return;
        }

        // Check if result indicates a pending transaction
        if (result.status === "pending" && result.txHash) {
          // Update the quote record with the transaction hash
          const updateRes = await fetch(`/api/quote/${saved.quote._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              zoraTokenTxHash: result.txHash,
              zoraTokenPending: true,
              isDraft: false, // No longer a draft since transaction was submitted
            }),
          });

          if (updateRes.ok) {
            setMessage(
              `Quote saved! Your token is being created. You can track progress at: ${result.explorerUrl}`
            );
          } else {
            setMessage("Quote saved! Token transaction is processing.");
          }

          // Set up a timer to periodically check for token address updates
          let checkCount = 0;
          const maxChecks = 5;

          const checkForTokenUpdates = async () => {
            if (checkCount >= maxChecks) {
              // Remove from creating tokens if we've reached max attempts
              setCreatingTokens((prev) =>
                prev.filter((id) => id !== saved.quote._id)
              );
              return; // Stop checking after max attempts
            }

            try {
              console.log(
                `Checking for token updates (attempt ${
                  checkCount + 1
                }/${maxChecks})...`
              );

              // Check transaction status first - if failed/rejected, delete the quote
              try {
                const txStatusRes = await fetch(
                  `https://explorer.zora.energy/api/v2/tx/${result.txHash}`
                );
                if (txStatusRes.ok) {
                  const txData = await txStatusRes.json();

                  // If transaction was rejected/canceled (status 0)
                  if (txData && txData.status === "0") {
                    console.log(
                      "Transaction was canceled or failed:",
                      result.txHash
                    );

                    // Delete the quote since the transaction failed
                    const deleteRes = await fetch(
                      `/api/quote/${saved.quote._id}`,
                      {
                        method: "DELETE",
                      }
                    );

                    if (deleteRes.ok) {
                      console.log("Quote deleted due to canceled transaction");
                      // Remove from UI
                      setQuotes((prevQuotes) =>
                        prevQuotes.filter((q) => q._id !== saved.quote._id)
                      );
                      setMessage("Quote removed - transaction was canceled");
                    }

                    // Remove from creating tokens state
                    setCreatingTokens((prev) =>
                      prev.filter((id) => id !== saved.quote._id)
                    );
                    return; // Stop checking
                  }
                }
              } catch (txCheckError) {
                console.error(
                  "Error checking transaction status:",
                  txCheckError
                );
              }

              // Fetch the updated quote data
              const checkRes = await fetch(`/api/quote/${saved.quote._id}`);
              if (checkRes.ok) {
                const updatedData = await checkRes.json();

                // If token address has been added, refresh the quotes list
                if (updatedData.quote && updatedData.quote.zoraTokenAddress) {
                  console.log(
                    "Token address updated:",
                    updatedData.quote.zoraTokenAddress
                  );

                  // Update quotes array directly with the updated quote
                  setQuotes((prevQuotes) => {
                    const updatedQuotes = [...prevQuotes];
                    const quoteIndex = updatedQuotes.findIndex(
                      (q) => q._id === saved.quote._id
                    );

                    if (quoteIndex !== -1) {
                      // Replace the existing quote with the updated one (with token address)
                      updatedQuotes[quoteIndex] = {
                        ...updatedData.quote,
                        isPending: false, // Mark as no longer pending
                      };
                    } else {
                      // If not found, add it to the beginning of the array
                      updatedQuotes.unshift({
                        ...updatedData.quote,
                        isPending: false,
                      });
                    }

                    return updatedQuotes;
                  });

                  // Remove from creating tokens state
                  setCreatingTokens((prev) =>
                    prev.filter((id) => id !== saved.quote._id)
                  );

                  // Still call fetchQuotes for good measure, but with a delay
                  setTimeout(fetchQuotes, 1000);
                  return; // Stop checking
                }

                // Increment counter and check again in 10 seconds
                checkCount++;
                if (checkCount < maxChecks) {
                  setTimeout(checkForTokenUpdates, 10000);
                } else {
                  // Remove from creating tokens if we've reached max attempts
                  setCreatingTokens((prev) =>
                    prev.filter((id) => id !== saved.quote._id)
                  );
                }
              }
            } catch (error) {
              console.error("Error checking for token updates:", error);
              // Still remove from creating tokens on error
              if (checkCount >= maxChecks - 1) {
                setCreatingTokens((prev) =>
                  prev.filter((id) => id !== saved.quote._id)
                );
              }
            }
          };

          // Start checking for updates
          setTimeout(checkForTokenUpdates, 10000); // First check after 10 seconds

          // Reset form state
          setQuote("");
          setTitle("");
          setImagePreview(null);
          return;
        }

        // Check if result contains an error message
        if (result.error) {
          // Remove from creating tokens on error
          setCreatingTokens((prev) =>
            prev.filter((id) => id !== saved.quote._id)
          );

          // If the error indicates user rejection, delete the quote
          if (
            result.error.includes("user rejected") ||
            result.error.includes("rejected") ||
            result.error.includes("canceled")
          ) {
            // Delete the quote since user canceled
            await fetch(`/api/quote/${saved.quote._id}`, {
              method: "DELETE",
            });

            // Remove from UI
            setQuotes((prevQuotes) =>
              prevQuotes.filter((q) => q._id !== saved.quote._id)
            );

            setMessage("Quote creation canceled by user.");

            // Reset form state
            setQuote("");
            setTitle("");
            setImagePreview(null);
            setIsSaving(false);
            return;
          }

          throw new Error(result.error);
        }

        // STEP 5: Update the quote record with token information
        const updateRes = await fetch(`/api/quote/${saved.quote._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zoraTokenAddress: result.address,
            zoraTokenTxHash: result.txHash,
            isDraft: false, // No longer a draft
          }),
        });

        // Remove from creating tokens state regardless of update success
        setCreatingTokens((prev) =>
          prev.filter((id) => id !== saved.quote._id)
        );

        if (updateRes.ok) {
          setMessage("Quote and token created successfully!");

          // Update the quote in state with the token address
          setQuotes((prevQuotes) => {
            return prevQuotes.map((q) =>
              q._id === saved.quote._id
                ? { ...q, zoraTokenAddress: result.address, isPending: false }
                : q
            );
          });
        } else {
          // Token created but failed to update DB record
          setMessage(
            "Quote saved and token created! (Token info update failed)"
          );
        }
      } catch (tokenError) {
        console.error("Token creation failed:", tokenError);
        // Remove from creating tokens state on error
        setCreatingTokens((prev) =>
          prev.filter((id) => id !== saved.quote._id)
        );

        // If error indicates user rejection, delete the quote
        if (
          tokenError.message.includes("user rejected") ||
          tokenError.message.includes("canceled")
        ) {
          // Delete the quote since user canceled
          await fetch(`/api/quote/${savedQuoteData._id}`, {
            method: "DELETE",
          });

          // Remove from UI
          setQuotes((prevQuotes) =>
            prevQuotes.filter((q) => q._id !== savedQuoteData._id)
          );

          setMessage("Quote creation canceled.");
        } else {
          // Still saved the quote, just failed token creation for other reasons
          setMessage(
            `Quote saved successfully! (Token creation failed: ${tokenError.message})`
          );
        }
      }

      // Reset the form state
      setQuote("");
      setTitle("");
      setImagePreview(null);

      // Refresh quotes list to show the new quote
      fetchQuotes();
    } catch (err) {
      console.error("Send quote error:", err);

      // If we have a saved quote but something went wrong, clean it up
      if (savedQuoteData && savedQuoteData._id) {
        try {
          await fetch(`/api/quote/${savedQuoteData._id}`, {
            method: "DELETE",
          });

          // Remove from UI
          setQuotes((prevQuotes) =>
            prevQuotes.filter((q) => q._id !== savedQuoteData._id)
          );
        } catch (deleteErr) {
          console.error("Failed to delete draft quote:", deleteErr);
        }
      }

      setMessage(`Failed to save quote: ${err.message}`);
    } finally {
      // Ensure isSaving is reset regardless of success/failure
      setIsSaving(false);
    }
  };

  // Edit quote
  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedText(quotes[index].text);
  };

  const handleUpdateQuote = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    if (!editedText.trim()) {
      setMessage("Quote cannot be empty!");
      setIsUpdating(false);
      return;
    }

    const quoteToUpdate = quotes[editIndex];
    const originalText = quote;
    // Declare newImageUrl at the outer scope so it's accessible throughout
    let newImageUrl = null;

    try {
      setMessage("Updating quote...");

      // STEP 1: Generate new image with updated text
      const ogUrl =
        `/api/og?quote=${encodeURIComponent(editedText)}` +
        `&username=${encodeURIComponent(username)}` +
        `&displayName=${encodeURIComponent(displayName)}` +
        `&pfpUrl=${encodeURIComponent(pfpUrl)}`;

      const response = await fetch(ogUrl);
      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const blob = await response.blob();
      const base64Image = await blobToBase64(blob);

      // STEP 2: Update quote in database (this will also upload the new image to Cloudinary)
      console.log("Sending update request to API...");
      const updateRes = await fetch(`/api/quote/${quoteToUpdate._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editedText,
          image: base64Image,
          existingImageUrl: quoteToUpdate.imageUrl || quoteToUpdate.image, // Try both possible fields
          updateImage: true,
        }),
      });

      // Get the raw response for debugging
      const responseText = await updateRes.text();
      console.log("Raw API response:", responseText);

      // Parse JSON in a safe way
      let updatedData;
      try {
        updatedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "JSON parse error:",
          parseError,
          "Response:",
          responseText
        );
        throw new Error(
          `Invalid JSON response from API: ${responseText.slice(0, 100)}`
        );
      }

      if (!updateRes.ok) {
        console.error("API error response:", updatedData);
        throw new Error(
          updatedData.error || `Failed to update quote: ${updateRes.status}`
        );
      }

      console.log("Parsed response data:", updatedData);

      // Check for expected structure - more forgiving approach
      if (!updatedData) {
        console.error("Invalid API response (empty):", updatedData);
        throw new Error("Empty API response");
      }

      // If we have a quote property, use it, otherwise try to use the response directly
      const updatedQuote = updatedData.quote || updatedData;
      console.log("Using quote data:", updatedQuote);

      if (!updatedQuote || typeof updatedQuote !== "object") {
        console.error("Invalid quote object:", updatedQuote);
        throw new Error("API response missing valid quote object");
      }

      // Check for image URL in various properties and in various places
      // Try updatedQuote first, with multiple possible field names
      if (updatedQuote.imageUrl) {
        newImageUrl = updatedQuote.imageUrl;
        console.log("Found imageUrl property:", newImageUrl);
      } else if (updatedQuote.image) {
        newImageUrl = updatedQuote.image;
        console.log("Found image property:", newImageUrl);
      } else if (quoteToUpdate.imageUrl) {
        // Fall back to the original quote's imageUrl
        newImageUrl = quoteToUpdate.imageUrl;
        console.log("Using original quote's imageUrl as fallback");
      } else if (quoteToUpdate.image) {
        // Try original quote's image property
        newImageUrl = quoteToUpdate.image;
        console.log("Using original quote's image as fallback");
      } else {
        // Last resort: scan all properties for a URL-looking string
        console.error("Looking for any URL-like property in the objects");

        // Check all string properties of updatedQuote for URL patterns
        const possibleImageProps = Object.entries(updatedQuote).filter(
          ([key, value]) =>
            typeof value === "string" &&
            (value.includes("cloudinary.com") ||
              value.includes(".jpg") ||
              value.includes(".png") ||
              value.includes(".jpeg"))
        );

        if (possibleImageProps.length > 0) {
          newImageUrl = possibleImageProps[0][1];
          console.log(
            "Found URL-like property:",
            possibleImageProps[0][0],
            newImageUrl
          );
        } else {
          // Log complete objects for debugging
          console.error("Cannot find any image URL in either object:", {
            updatedQuote,
            quoteToUpdate,
          });

          throw new Error("No valid image URL available for token update");
        }
      }

      // Final validation of the URL
      if (!newImageUrl || typeof newImageUrl !== "string") {
        console.error("Invalid image URL format:", newImageUrl);
        throw new Error("Invalid image URL format for token update");
      }

      console.log("Final image URL for token update:", newImageUrl);

      // STEP 3: If this quote has a Zora token, update the token metadata too
      if (quoteToUpdate.zoraTokenAddress && walletClient) {
        setMessage("Updating token metadata...");

        // Call the updateZoraCoin function
        const tokenUpdateResult = await updateZoraCoin({
          walletClient,
          publicClient,
          coinAddress: quoteToUpdate.zoraTokenAddress,
          title: quoteToUpdate.title, // Keep the original title
          imageUrl: newImageUrl, // Use the new/updated Cloudinary URL
          description: editedText, // Use the updated text
        });

        console.log("Token update result:", tokenUpdateResult);

        if (tokenUpdateResult.error) {
          // Still consider quote update successful, but notify about token update failure
          setMessage(
            `Quote updated! Note: Token metadata update failed: ${tokenUpdateResult.error}`
          );
        } else if (tokenUpdateResult.status === "pending") {
          setMessage(
            `Quote updated! Token metadata update in progress. Track it here: ${tokenUpdateResult.explorerUrl}`
          );
        } else {
          setMessage("Quote and token metadata updated successfully!");
        }
      } else {
        // No token to update
        setMessage("Quote updated successfully!");
      }

      setEditIndex(null);
      fetchQuotes();
    } catch (error) {
      console.error("Update error:", error);
      setMessage(`Update failed: ${error.message}`);
    } finally {
      setIsUpdating(false);
      setQuote(originalText); // Restore original quote state
    }
  };

  // Delete quote
  const handleDelete = async (index) => {
    try {
      const res = await fetch(`/api/quote/${quotes[index]._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Quote deleted successfully!");
        fetchQuotes();
      } else {
        setMessage(data.error || "Failed to delete quote.");
      }
    } catch (error) {
      setMessage("Something went wrong. Try again.");
    }
  };

  // Section navigation
  const handleSectionChange = (section) => {
    if (editIndex !== null) {
      setEditIndex(null);
    }
    setActiveSection(section);
  };

  if (loading)
    return <div className="loading-container">Loading user app...</div>;
  if (!ready || status === "loading") {
    return <div className="loading-container">Loading user data...</div>;
  }

  return (
    <div className={isConnected ? "card" : ""} data-state={activeSection}>
      {isConnected ? (
        <>
          <div className="card-main">
            {/* Quote Display Section */}
            <div
              className={`card-section ${
                activeSection === "#about" ? "is-active" : ""
              }`}
              id="about"
            >
              <div className="quote-display">
                <div className="card-header">
                  <div
                    className="card-cover"
                    style={{
                      backgroundImage: `url(${
                        quoteOfTheDay?.pfpUrl || "/assets/icon.png"
                      })`,
                    }}
                  ></div>
                  <img
                    src={quoteOfTheDay?.pfpUrl || "/assets/icon.png"}
                    alt="Avatar"
                    className="card-avatar"
                    style={{
                      cursor: quoteOfTheDay?.fid ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (quoteOfTheDay?.fid) {
                        sdk.actions.viewProfile({ fid: quoteOfTheDay.fid });
                      }
                    }}
                  />
                  <h1 className="card-fullname">
                    {quoteOfTheDay?.displayName ||
                      quoteOfTheDay?.username ||
                      "Unknown"}
                  </h1>
                </div>

                <div>
                  {quoteOfTheDay ? (
                    <div className="quote-wrapper">
                      <p className="quote-text">{quoteOfTheDay.text}</p>
                      <span
                        style={{
                          cursor: quoteOfTheDay?.fid ? "pointer" : "default",
                          color: quoteOfTheDay?.fid ? "#5b5bff" : "inherit",
                          textDecoration: quoteOfTheDay?.fid
                            ? "underline"
                            : "none",
                        }}
                        onClick={() => {
                          if (quoteOfTheDay?.fid) {
                            sdk.actions.viewProfile({ fid: quoteOfTheDay.fid });
                          }
                        }}
                      >
                        {quoteOfTheDay.username || "Unknown Author"}
                      </span>
                    </div>
                  ) : (
                    <p>{message || "Loading quote of the day..."}</p>
                  )}
                </div>
              </div>
            </div>
            {/* All Quotes Section */}
            <div
              className={`card-section ${
                activeSection === "#experience" ? "is-active" : ""
              }`}
              id="experience"
            >
              <div className="card-content">
                <div className="card-subtitle">All Quotes</div>
                <div className="quotes-list">
                  <AnimatePresence>
                    {quotes.length > 0 ? (
                      quotes.map((quote, index) => (
                        <motion.div
                          key={quote._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className={`quote-item ${
                            quote.isPending ||
                            creatingTokens.includes(quote._id)
                              ? "pending"
                              : ""
                          }`}
                        >
                          {editIndex === index ? (
                            <div>
                              <textarea
                                value={editedText}
                                className="text-area1"
                                onChange={(e) => {
                                  if (e.target.value.length <= 240) {
                                    setEditedText(e.target.value);
                                  }
                                }}
                                maxLength={240}
                              />
                              <button
                                onClick={handleUpdateQuote}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <FaSpinner className="spin" />
                                ) : (
                                  "Save"
                                )}
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="quote-header">
                                {quote.zoraTokenAddress ? (
                                  <span className="token-badge">
                                    ${quote.title?.toUpperCase() || "TOKEN"}
                                  </span>
                                ) : quote.isPending ||
                                  creatingTokens.includes(quote._id) ? (
                                  <>
                                    <span className="token-badge pending">
                                      <FaSpinner className="spin" /> PENDING
                                    </span>

                                    <div className="pending-token-container">
                                      <div className="token-progress-bar">
                                        <div className="token-progress-bar-fill"></div>
                                      </div>
                                      <span className="token-status-text">
                                        {checkingTokens.includes(quote._id)
                                          ? "Checking token status..."
                                          : "Token creation in progress..."}
                                      </span>
                                      {quote.zoraTokenTxHash && (
                                        <>
                                          <a
                                            href={`https://explorer.zora.energy/tx/${quote.zoraTokenTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="view-transaction-link"
                                          >
                                            View Transaction
                                          </a>
                                          <button
                                            className="check-status-button"
                                            onClick={() =>
                                              checkTokenStatus(
                                                quote._id,
                                                quote.zoraTokenTxHash
                                              )
                                            }
                                            disabled={checkingTokens.includes(
                                              quote._id
                                            )}
                                          >
                                            {checkingTokens.includes(
                                              quote._id
                                            ) ? (
                                              <>
                                                <FaSpinner className="spin" />{" "}
                                                Checking...
                                              </>
                                            ) : (
                                              "Check Status Now"
                                            )}
                                          </button>
                                          <span className="auto-refresh-text">
                                            Auto-refreshing every 15 seconds
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <strong className="quote-title">
                                    {quote.title}
                                  </strong>
                                )}
                              </div>
                              <p className="quote-text">{quote.text}</p>
                              {quote.zoraTokenAddress && (
                                <div className="token-info">
                                  <a
                                    href={`https://zora.co/coin/base:${quote.zoraTokenAddress}?referrer=${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="token-link"
                                  >
                                    View Token
                                  </a>
                                </div>
                              )}
                            </>
                          )}
                          <div className="quote-actions">
                            <button
                              className="edit-btn"
                              onClick={() => handleEdit(index)}
                              disabled={
                                quote.isPending ||
                                creatingTokens.includes(quote._id)
                              }
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(index)}
                              disabled={
                                quote.isPending ||
                                creatingTokens.includes(quote._id) ||
                                quote.zoraTokenAddress
                              }
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p>No quotes available.</p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            {/* Write Quote Section */}
            <div
              className={`card-section ${
                activeSection === "#contact" ? "is-active" : ""
              }`}
              id="contact"
            >
              <div className="card-content showProfileHere">
                <div className="card-header">
                  <div
                    className="card-cover"
                    style={{ backgroundImage: `url(${pfpUrl})` }}
                  ></div>
                  <img src={pfpUrl} alt="Avatar" className="card-avatar" />
                  <h1 className="card-fullname">{displayName}</h1>
                </div>
                <div>
                  <div className="profile-wrapper-logout">
                    <div>
                      <div className="card-subtitle">
                        Share your thoughts...
                      </div>
                      <p className="char-count">
                        {240 - quote.length} characters remaining
                      </p>
                    </div>
                    <button
                      onClick={() => disconnect()}
                      className="disconnect-btn"
                    >
                      Sign Out
                    </button>
                  </div>

                  <div className="card-contact-wrapper">
                    <div className="card-contact">
                      <input
                        type="text"
                        placeholder="Title / Token Symbol"
                        className="title-input"
                        maxLength={20}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <textarea
                        placeholder="What's your thought for today?"
                        className="text-area"
                        maxLength={240}
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                      />
                    </div>
                    <button
                      className="send-quote-btn"
                      onClick={sendQuote}
                      disabled={isSaving || !isConnected}
                    >
                      {isSaving ? <FaSpinner className="spin" /> : "Let It Fly"}
                    </button>
                  </div>
                  {message && <p className="message">{message}</p>}
                </div>
              </div>
            </div>
            {/* Navigation */}
            <div className="card-container2">
              {activeSection === "#about" && (
                <div className="card-buttons1">
                  <div className="profile-info">
                    <button
                      className="cast-btn custom-btn"
                      disabled={!quoteOfTheDay || isLoading}
                      onClick={handleCastQuoteOfTheDay}
                    >
                      Cast
                    </button>
                  </div>
                </div>
              )}
              <div className="card-buttons">
                <button
                  className={activeSection === "#about" ? "is-active" : ""}
                  onClick={() => handleSectionChange("#about")}
                >
                  Daily Drip
                </button>
                <button
                  className={activeSection === "#experience" ? "is-active" : ""}
                  onClick={() => handleSectionChange("#experience")}
                >
                  My Vibes
                </button>
                <button
                  className={activeSection === "#contact" ? "is-active" : ""}
                  onClick={() => handleSectionChange("#contact")}
                >
                  Drop One
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        isDisconnected && (
          <div className="connection-error">
            <p>Sign in with your wallet to continue</p>
            <CustomConnectButton />

            {/* Add mobile help text */}
            {typeof window !== "undefined" &&
              /Android|iPhone/i.test(navigator.userAgent) && (
                <p className="mobile-hint">
                  If prompted, open the QR code in your wallet app.
                  <br />
                  <small>
                    Trouble? Install Rainbow or MetaMask wallet first.
                  </small>
                </p>
              )}
          </div>
        )
      )}
    </div>
  );
}
