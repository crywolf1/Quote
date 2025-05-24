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
import Notification from "./Notification";
import "../styles/style.css";
import { FaEdit, FaTrashAlt, FaSpinner } from "react-icons/fa";

export default function Card() {
  const { userData, loading, error, connectWallet } = useFarcaster();
  const { isConnected, isDisconnected, status, address } = useAccount();
  const {
    data: walletClient,
    isLoading: isWalletLoading,
    isError: isWalletError,
  } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { profile, isLoading: isProfileLoading } = useProfile();
  // Use fallback values if userData is not loaded yet
  const username = userData?.username || userData?.displayName || "Guest";
  const pfpUrl = userData?.pfpUrl || "/QuoteIcon.png";
  const displayName = userData?.displayName || username;

  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [ready, setReady] = useState(false);
  const [quoteOfTheDay, setQuoteOfTheDay] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [title, setTitle] = useState("");
  const [creatingTokens, setCreatingTokens] = useState([]);
  const [checkingTokens, setCheckingTokens] = useState([]);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [notificationType, setNotificationType] = useState("info");
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("dark");
  const [editedStyle, setEditedStyle] = useState("dark");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch quotes from API
  const fetchQuoteOfTheDay = async () => {
    if (!address) return;

    try {
      const res = await fetch(`/api/quote-of-the-day?userAddress=${address}`);
      const data = await res.json();
      if (res.ok) {
        console.log("Quote fetched with like status:", data.quote.isLiked); // Add this debug line
        setQuoteOfTheDay(data.quote);
      } else {
        showNotification(data.error || "Failed to fetch quote of the day.");
      }
    } catch (error) {
      showNotification("Error fetching quote of the day.");
    }
  };

  const showNotification = (message, type = "info") => {
    setNotification(message);
    setNotificationType(type);

    // Auto-hide after 5 seconds unless it's an error
    if (type !== "error") {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Replace your existing useEffect for SDK initialization
  // Add this after successful miniApp addition in src/components/Card.js
  useEffect(() => {
    if (!isHydrated) return;

    // Run immediately without checking session storage to ensure it's fast
    console.log("Initializing Farcaster SDK immediately...");

    try {
      // Initialize SDK right away without setTimeout
      (async () => {
        try {
          // Initialize SDK
          await sdk.actions.ready();
          console.log("SDK ready status confirmed");

          // This properly handles both adding the app and requesting notification permissions
          const result = await sdk.actions.addMiniApp();
          console.log("Successfully added app to Warpcast!", result);

          // Check if notifications were granted
          if (result?.notificationDetails) {
            console.log("✅ Notification permissions granted automatically");
            console.log("Notification URL:", result.notificationDetails.url);
            console.log("Token available:", !!result.notificationDetails.token);
          } else {
            console.log("ℹ️ No notification details returned");
          }
        } catch (error) {
          console.error("Error in Warpcast initialization:", error);
        }
      })();
    } catch (error) {
      console.error("Error setting up SDK initialization:", error);
    }
  }, [isHydrated]); // Only run when app is hydrated
  // Function to close the notification
  const closeNotification = () => {
    setNotification(null);
  };

  useEffect(() => {
    if (creatingTokens.length === 0) return;

    const checkAllPending = async () => {
      for (let id of creatingTokens) {
        const q = quotes.find((q) => q._id === id);
        if (q?.zoraTokenTxHash) {
          await checkTokenStatus(id, q.zoraTokenTxHash);
        }
      }
    };

    checkAllPending();
    const iv = setInterval(checkAllPending, 15000);
    return () => clearInterval(iv);
  }, [creatingTokens, quotes]);

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

    setIsRefreshing(true); // Set to true when starting

    try {
      const res = await fetch(`/api/quote?creatorAddress=${address}`);
      const data = await res.json();
      if (res.ok) {
        // Ensure quotes are sorted newest-first
        const sorted = [...data.quotes].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // newest first
        });
        setQuotes(sorted);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setIsRefreshing(false); // Always set to false when done
    }
  };

  // Updated fetchNewQuote function in Card.js
  const fetchNewQuote = async () => {
    if (!address) return;

    try {
      // Show loading state
      setIsLoading(true);

      // Fetch a new quote from your API with refresh=true
      const response = await fetch(
        `/api/refresh-quote?refresh=true&address=${address}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setQuoteOfTheDay(data.quote);
        showNotification("Found a fresh quote for you!", "success");
      } else {
        showNotification(
          data.message || "Failed to fetch a new quote",
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching new quote:", error);
      showNotification("An error occurred while fetching a new quote", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // In your client-side code
  // Updated likeQuote function
  const likeQuote = async (quoteId) => {
    if (!quoteId || !address) return;

    // Store the current state before toggling
    const currentLikeState = quoteOfTheDay?.isLiked;
    const currentLikeCount = quoteOfTheDay?.likeCount || 0;

    try {
      // Optimistically update UI for both isLiked and likeCount
      setQuoteOfTheDay((prev) => ({
        ...prev,
        isLiked: !currentLikeState,
        likeCount: currentLikeState
          ? Math.max(0, currentLikeCount - 1) // Decrease count when unliking
          : currentLikeCount + 1, // Increase count when liking
      }));

      // Add a CSS animation class to the like count
      const likeCountElement = document.querySelector(".like-count");
      if (likeCountElement) {
        likeCountElement.classList.add("updated");
        setTimeout(() => {
          likeCountElement.classList.remove("updated");
        }, 300);
      }

      // Send like/unlike request to your API using PUT method
      const response = await fetch("/api/like-quote", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId,
          action: currentLikeState ? "unlike" : "like",
          address,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Revert optimistic update if there was an error (both isLiked and likeCount)
        setQuoteOfTheDay((prev) => ({
          ...prev,
          isLiked: currentLikeState,
          likeCount: currentLikeCount,
        }));
        showNotification("Failed to update like status", "error");
      } else {
        // Show subtle feedback (optional)
        showNotification(
          currentLikeState ? "Quote unliked" : "Quote liked!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error liking/unliking quote:", error);
      // Revert optimistic update (both isLiked and likeCount)
      setQuoteOfTheDay((prev) => ({
        ...prev,
        isLiked: currentLikeState,
        likeCount: currentLikeCount,
      }));
      showNotification("An error occurred", "error");
    }
  };

  useEffect(() => {
    // Only add the listener if we're in edit mode
    if (editIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);

      // Cleanup function to remove the event listener
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [editIndex]);

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
          const explorerUrl = `https://explorer.zora.energy/api/v2/tx/${txHash}`;
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
                showNotification("Quote removed - transaction was canceled");
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

  // Add this function in your component
  const getQuoteLengthClass = (text) => {
    if (!text) return "";
    const length = text.length;

    if (length < 100) {
      return ""; // Default large font for short quotes
    } else if (length < 180) {
      return "medium-length";
    } else {
      return "long-length";
    }
  };

  const sendQuote = async () => {
    if (isSaving) return; // Prevent multiple simultaneous submissions
    setIsSaving(true);

    // Log wallet client status for debugging
    if (isWalletLoading) {
      showNotification("Please wait while connecting to wallet...");
      setIsSaving(false);
      return;
    }

    if (isWalletError || !walletClient) {
      showNotification(
        "Wallet connection error. Please reconnect your wallet."
      );
      console.error("Wallet client error:", isWalletError);
      setIsSaving(false);
      return;
    }

    // Validate basic inputs before proceeding
    if (!isConnected || !address) {
      showNotification("Please connect your wallet");
      setIsSaving(false);
      return;
    }
    if (!title.trim()) {
      showNotification("Please enter a title");
      setIsSaving(false);
      return;
    }
    if (!quote.trim()) {
      showNotification("Quote cannot be empty!");
      setIsSaving(false);
      return;
    }

    // Store temporary quote data to use if transaction succeeds
    let savedQuoteData = null;
    let cloudinaryImageUrl = null;

    try {
      // STEP 1: Generate the quote image using the OG endpoint
      showNotification("Generating quote image...");
      const ogUrl =
        `/api/og?quote=${encodeURIComponent(quote)}` +
        `&username=${encodeURIComponent(username || "")}` +
        `&displayName=${encodeURIComponent(displayName || "")}` +
        `&pfpUrl=${encodeURIComponent(pfpUrl || "")}` +
        `&title=${encodeURIComponent(title || "")}` +
        `&style=${selectedStyle}`; // Add the style parameter

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
      showNotification("Preparing your quote...");
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
          style: selectedStyle, // Include the style parameter
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
      const draft = {
        ...saved.quote,
        isPending: true,
        zoraTokenTxHash: null,
        zoraTokenAddress: null,
      };
      // show it instantly (newest first)
      setQuotes((prev) => [draft, ...prev]);
      // start polling it
      setCreatingTokens((prev) => [...prev, saved.quote._id]);
      savedQuoteData = saved.quote;

      // Extract the Cloudinary URL from the response to avoid duplicate uploads
      cloudinaryImageUrl = saved.quote.imageUrl || null;
      console.log("Quote prepared, image URL:", cloudinaryImageUrl);

      // Add the quote to local state with a pending status

      // Verify wallet client availability before token creation
      if (!walletClient) {
        console.error("Wallet client is not available");
        showNotification(
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
        showNotification("Creating token for your quote...");
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
          text: quote,
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
          showNotification("Quote creation canceled.");

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
            showNotification(
              `Quote saved! Your token is being created. You can track progress at: ${result.explorerUrl}`
            );
          } else {
            showNotification("Quote saved! Token transaction is processing.");
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
                      showNotification(
                        "Quote removed - transaction was canceled"
                      );
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

            showNotification("Quote creation canceled by user.");

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
          showNotification("Quote and token created successfully!");

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
          showNotification(
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

          showNotification("Quote creation canceled.");
        } else {
          // Still saved the quote, just failed token creation for other reasons
          showNotification(
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

      showNotification(`Failed to save quote: ${err.message}`);
    } finally {
      // Ensure isSaving is reset regardless of success/failure
      setIsSaving(false);
    }
  };

  // Edit quote
  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedText(quotes[index].text);
    // Initialize with the quote's current style or default to "dark"
    setEditedStyle(quotes[index].style || "dark");
  };

  const handleClickOutside = (e) => {
    // If we're in edit mode and the click is outside the edit container
    if (editIndex !== null) {
      // Check if the click was outside the edit container
      const isClickOutside = !e.target.closest(".vibes-edit-container");

      // Ignore clicks on action buttons that would trigger edit/delete
      const isActionButton = e.target.closest(".vibes-action-buttons");

      if (isClickOutside && !isActionButton) {
        setEditIndex(null);
      }
    }
  };

  const handleUpdateQuote = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    if (!editedText.trim()) {
      showNotification("Quote cannot be empty!");
      setIsUpdating(false);
      return;
    }

    const quoteToUpdate = quotes[editIndex];
    const originalText = quote;
    // Declare newImageUrl at the outer scope so it's accessible throughout
    let newImageUrl = null;

    try {
      showNotification("Updating quote...");

      // STEP 1: Generate new image with updated text
      const ogUrl =
        `/api/og?quote=${encodeURIComponent(editedText)}` +
        `&username=${encodeURIComponent(username)}` +
        `&displayName=${encodeURIComponent(displayName)}` +
        `&pfpUrl=${encodeURIComponent(pfpUrl)}` +
        `&title=${encodeURIComponent(quoteToUpdate.title || "")}` +
        `&style=${editedStyle}`; // Include the edited style

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
          style: editedStyle, // Include the style in the update
          image: base64Image,
          existingImageUrl: quoteToUpdate.imageUrl || quoteToUpdate.image,
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
        showNotification("Updating token metadata...");

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
          showNotification(
            `Quote updated! Note: Token metadata update failed: ${tokenUpdateResult.error}`
          );
        } else if (tokenUpdateResult.status === "pending") {
          showNotification(
            `Quote updated! Token metadata update in progress. Track it here: ${tokenUpdateResult.explorerUrl}`
          );
        } else {
          showNotification("Quote and token metadata updated successfully!");
        }
      } else {
        // No token to update
        showNotification("Quote updated successfully!");
      }

      setEditIndex(null);
      fetchQuotes();
    } catch (error) {
      console.error("Update error:", error);
      showNotification(`Update failed: ${error.message}`);
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
        showNotification("Quote deleted successfully!");
        fetchQuotes();
      } else {
        showNotification(data.error || "Failed to delete quote.");
      }
    } catch (error) {
      showNotification("Something went wrong. Try again.");
    }
  };

  // Section navigation
  const handleSectionChange = (section) => {
    if (editIndex !== null) {
      setEditIndex(null);
    }
    setActiveSection(section);
  };

  const QuotedLoader = ({ message = "Loading..." }) => (
    <div className="quoted-loader-container">
      <div className="bokeh-background">
        {/* Generate bokeh circles dynamically */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="bokeh-circle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              width: `${30 + Math.random() * 70}px`,
              height: `${30 + Math.random() * 70}px`,
              opacity: 0.1 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>
      <div className="quoted-loader">
        <div className="quote-mark-loader opening">"</div>
        <div className="loading-animation">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <div className="quote-mark-loader closing">"</div>
      </div>
      <p className="loader-message">{message}</p>
    </div>
  );
  // Then use it in your component:
  if (loading) return <QuotedLoader message="Loading user app..." />;
  if (!ready || status === "loading") {
    return <QuotedLoader message="Loading user data..." />;
  }
  if (!isHydrated) {
    return <QuotedLoader message="Loading app..." />;
  }

  return (
    <div className={isConnected ? "card" : ""} data-state={activeSection}>
      {isConnected ? (
        <>
          <div className="card-main">
            <AnimatePresence>
              {notification && (
                <Notification
                  message={notification}
                  type={notificationType}
                  onClose={closeNotification}
                />
              )}
            </AnimatePresence>
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
                        quoteOfTheDay?.pfpUrl || "/QuoteIcon.png"
                      })`,
                    }}
                  ></div>
                  <img
                    src={quoteOfTheDay?.pfpUrl || "/QuoteIcon.png"}
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

                <div className="quote-display-content">
                  {quoteOfTheDay ? (
                    <div className="quote-wrapper">
                      <p
                        className={`quote-text ${getQuoteLengthClass(
                          quoteOfTheDay.text
                        )}`}
                      >
                        {quoteOfTheDay.text}
                      </p>
                      {quoteOfTheDay?.title && (
                        <div
                          className="quote-title"
                          onClick={() => {
                            if (quoteOfTheDay?.zoraTokenAddress) {
                              navigator.clipboard.writeText(
                                quoteOfTheDay.zoraTokenAddress
                              );
                              showNotification(
                                "Contract address copied to clipboard!",
                                "success"
                              );
                            }
                          }}
                          style={{
                            cursor: quoteOfTheDay?.zoraTokenAddress
                              ? "pointer"
                              : "default",
                          }}
                          title={
                            quoteOfTheDay?.zoraTokenAddress
                              ? "Click to copy contract address"
                              : ""
                          }
                        >
                          <span className="dollar-sign">$</span>
                          <span className="title-text">
                            {quoteOfTheDay.title.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-quote-container">
                      {message ? (
                        <>
                          <div className="empty-quote-icon">📭</div>
                          <p className="empty-quote-message">{message}</p>
                          <p className="empty-quote-suggestion">
                            Be the first to share your thoughts and create a
                            token!
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="loading-quote-animation">
                            <div className="quote-pulse"></div>
                            <div className="quote-mark-left">"</div>
                            <div className="quote-mark-right">"</div>
                          </div>
                          <p className="loading-quote-message">
                            Finding today's inspiration...
                          </p>
                        </>
                      )}
                    </div>
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
                <div className="card-subtitle" style={{ marginBottom: "15px" }}>
                  All Quotes
                </div>

                <div className="vibes-quotes-container">
                  <AnimatePresence>
                    {quotes.length > 0 ? (
                      quotes.map((quote, index) => (
                        <motion.div
                          key={quote._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className={`vibes-quote-card ${
                            quote.isPending ||
                            creatingTokens.includes(quote._id)
                              ? "vibes-quote-pending"
                              : ""
                          }`}
                        >
                          {editIndex === index ? (
                            <div className="vibes-edit-container">
                              <textarea
                                value={editedText}
                                className="vibes-edit-textarea"
                                onChange={(e) => {
                                  if (e.target.value.length <= 240) {
                                    setEditedText(e.target.value);
                                  }
                                }}
                                maxLength={240}
                              />

                              {/* Action row with style selector and save button side by side */}
                              <div className="edit-action-row">
                                <div className="edit-style-compact">
                                  <span className="style-label">Style:</span>
                                  <div className="style-options-row">
                                    <div
                                      className={`style-option ${
                                        editedStyle === "dark" ? "selected" : ""
                                      }`}
                                      onClick={() => setEditedStyle("dark")}
                                      title="Dark Style"
                                    >
                                      <div className="dark-style"></div>
                                    </div>
                                    <div
                                      className={`style-option ${
                                        editedStyle === "blue" ? "selected" : ""
                                      }`}
                                      onClick={() => setEditedStyle("blue")}
                                      title="Blue Style"
                                    >
                                      <div className="blue-style"></div>
                                    </div>
                                    <div
                                      className={`style-option ${
                                        editedStyle === "purple"
                                          ? "selected"
                                          : ""
                                      }`}
                                      onClick={() => setEditedStyle("purple")}
                                      title="Purple Style"
                                    >
                                      <div className="purple-style"></div>
                                    </div>
                                    <div
                                      className={`style-option ${
                                        editedStyle === "harvey"
                                          ? "selected"
                                          : ""
                                      }`}
                                      onClick={() => setEditedStyle("harvey")}
                                      title="harvey Style"
                                    >
                                      <div className="harvey-style"></div>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={handleUpdateQuote}
                                  disabled={isUpdating}
                                  className="vibes-save-btn"
                                >
                                  {isUpdating ? (
                                    <FaSpinner className="vibes-spinner" />
                                  ) : (
                                    "Save"
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="vibes-quote-header">
                                {quote.zoraTokenAddress ? (
                                  <div className="vibes-token-tag">
                                    <span className="vibes-token-symbol">
                                      $
                                    </span>
                                    {quote.title?.toUpperCase() || "TOKEN"}
                                  </div>
                                ) : quote.isPending ||
                                  creatingTokens.includes(quote._id) ? (
                                  <>
                                    <div className="vibes-pending-tag">
                                      <FaSpinner className="vibes-spinner" />{" "}
                                      PENDING
                                    </div>

                                    {quote.zoraTokenTxHash && (
                                      <div className="vibes-transaction-links">
                                        <a
                                          href={`https://explorer.zora.energy/tx/${quote.zoraTokenTxHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="vibes-explorer-link"
                                        >
                                          View Transaction
                                        </a>
                                        <button
                                          className="vibes-check-btn"
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
                                              <FaSpinner className="vibes-spinner" />{" "}
                                              Checking...
                                            </>
                                          ) : (
                                            "Check Status"
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="vibes-title-container">
                                    <span className="vibes-quote-title">
                                      {quote.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="vibes-quote-bubble">
                                <p className="vibes-quote-text">{quote.text}</p>
                                <div className="vibes-action-buttons">
                                  <button
                                    className="vibes-edit-btn"
                                    onClick={() => handleEdit(index)}
                                    disabled={
                                      quote.isPending ||
                                      creatingTokens.includes(quote._id)
                                    }
                                    aria-label="Edit quote"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    className="vibes-delete-btn"
                                    onClick={() => handleDelete(index)}
                                    disabled={
                                      quote.isPending ||
                                      creatingTokens.includes(quote._id) ||
                                      quote.zoraTokenAddress
                                    }
                                    aria-label="Delete quote"
                                  >
                                    <FaTrashAlt />
                                  </button>
                                </div>
                              </div>
                              {quote.zoraTokenAddress && (
                                <div className="vibes-token-container">
                                  <div className="vibes-token-buttons">
                                    <button
                                      className="vibes-copy-btn"
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          quote.zoraTokenAddress
                                        );
                                        showNotification(
                                          "Contract address copied to clipboard!",
                                          "success"
                                        );
                                      }}
                                      title="Copy Contract"
                                    >
                                      <svg
                                        className="vibes-copy-icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M16 3H4C3.45 3 3 3.45 3 4V16C3 16.55 3.45 17 4 17H16C16.55 17 17 16.55 17 16V4C17 3.45 16.55 3 16 3Z"
                                          stroke="white"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M17 8H20C20.55 8 21 8.45 21 9V20C21 20.55 20.55 21 20 21H9C8.45 21 8 20.55 8 20V17"
                                          stroke="white"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                    <a
                                      href={`https://zora.co/coin/base:${quote.zoraTokenAddress}?referrer=${address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="vibes-zora-btn"
                                      title="Trade on Zora"
                                    >
                                      <img
                                        src="/Zorb.png"
                                        alt="Zora"
                                        className="vibes-btn-icon"
                                      />
                                    </a>
                                    <a
                                      href={`https://dexscreener.com/base/${quote.zoraTokenAddress}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="vibes-dex-btn"
                                      title="View Chart"
                                    >
                                      <img
                                        src="/dex.jpeg"
                                        alt="DEXScreener"
                                        className="vibes-btn-icon"
                                      />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <div className="vibes-empty-state">
                        <p>No quotes available yet.</p>
                        <p className="vibes-empty-prompt">
                          Click "Drop One" to create your first quote!
                        </p>
                      </div>
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
                <div className="drop-quote-container">
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
                      <div className="input-stylebtn-container">
                        <input
                          type="text"
                          placeholder="Title / Token Symbol"
                          className="title-input"
                          maxLength={24}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                        <div className="style-selector">
                          <div className="style-selector-row">
                            <div
                              className={`style-btn ${
                                selectedStyle === "dark" ? "selected" : ""
                              }`}
                              onClick={() => setSelectedStyle("dark")}
                              title="Dark Style"
                            >
                              <div className="dark-style"></div>
                            </div>
                            <div
                              className={`style-btn ${
                                selectedStyle === "blue" ? "selected" : ""
                              }`}
                              onClick={() => setSelectedStyle("blue")}
                              title="blue Style"
                            >
                              <div className="blue-style"></div>
                            </div>
                          </div>
                          <div className="style-selector-row">
                            <div
                              className={`style-btn ${
                                selectedStyle === "purple" ? "selected" : ""
                              }`}
                              onClick={() => setSelectedStyle("purple")}
                              title="purple Style"
                            >
                              <div className="purple-style"></div>
                            </div>
                            <div
                              className={`style-btn ${
                                selectedStyle === "harvey" ? "selected" : ""
                              }`}
                              onClick={() => setSelectedStyle("harvey")}
                              title="Nature Style"
                            >
                              <div className="harvey-style"></div>
                            </div>
                          </div>
                        </div>
                      </div>
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
                      {isSaving ? (
                        <FaSpinner className="spin" />
                      ) : (
                        <>
                          Let It Fly
                          <span className="fly-icon">🕊️</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Navigation */}
            <div className="card-container2">
              {activeSection === "#about" && (
                <div className="card-buttons1">
                  {quoteOfTheDay?.zoraTokenAddress && (
                    <div className="token-actions">
                      <a
                        href={`https://zora.co/coin/base:${quoteOfTheDay.zoraTokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="qod-action-btn zora-btn"
                        title="Trade on Zora"
                      >
                        <img
                          src="/Zorb.png"
                          alt="Zora"
                          className="qod-btn-icon"
                        />
                      </a>
                      <a
                        href={`https://dexscreener.com/base/${quoteOfTheDay.zoraTokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="qod-action-btn dex-btn"
                        title="View Chart"
                      >
                        <img
                          src="/dex.jpeg"
                          alt="DEXScreener"
                          className="qod-btn-icon"
                        />
                      </a>

                      {/* Spacer div to push the new icons to the right */}
                      <div className="action-spacer"></div>

                      {/* Refresh button */}
                      {/* Refresh button that spins while loading */}
                      <button
                        className={`qod-action-btn refresh-btn ${
                          isLoading ? "spinning-button" : ""
                        }`}
                        onClick={fetchNewQuote}
                        disabled={isLoading}
                        title="Fetch new quote"
                        aria-label="Refresh quote"
                      >
                        <svg
                          className="qod-btn-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4 4V9H9"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M20 20V15H15"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16.5 7.5C15.7492 6.75 14.8408 6.1672 13.8346 5.79447C12.8283 5.42175 11.7535 5.26664 10.6834 5.34091C9.61329 5.41519 8.57741 5.71695 7.64922 6.22512C6.72104 6.7333 5.92208 7.43382 5.3 8.275"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7.5 16.5C8.25076 17.25 9.15925 17.8328 10.1654 18.2055C11.1717 18.5783 12.2465 18.7334 13.3166 18.6591C14.3867 18.5848 15.4226 18.283 16.3508 17.7749C17.279 17.2667 18.0779 16.5662 18.7 15.725"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {/* Like button */}
                      <div className="qod-action-btn-container">
                        <button
                          className={`qod-action-btn like-btn ${
                            quoteOfTheDay?.isLiked ? "liked" : ""
                          }`}
                          onClick={() => likeQuote(quoteOfTheDay?._id)}
                          title={
                            quoteOfTheDay?.isLiked
                              ? "Unlike quote"
                              : "Like quote"
                          }
                          aria-label={
                            quoteOfTheDay?.isLiked
                              ? "Unlike quote"
                              : "Like quote"
                          }
                        >
                          <svg
                            className="qod-btn-icon"
                            viewBox="0 0 24 24"
                            fill={quoteOfTheDay?.isLiked ? "white" : "none"}
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <span className="like-count">
                          {quoteOfTheDay?.likeCount || 0}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="profile-info">
                    <button
                      className="cast-btn custom-btn"
                      disabled={!quoteOfTheDay || isProfileLoading}
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
