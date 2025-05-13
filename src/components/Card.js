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

    // Log wallet client for debugging
    console.log("Wallet client status:", {
      isConnected: !!walletClient,
      walletAddress: walletClient?.account?.address || "Not available",
    });

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

      // STEP 2: Save quote to database
      setMessage("Saving your quote...");
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
          image: base64Image, // Base64 image is sent to API
        }),
      });

      // Handle errors from quote creation API
      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || "Failed to save quote");
      }

      // Get the saved quote data from response
      const saved = await createRes.json();

      // Extract the Cloudinary URL from the response to avoid duplicate uploads
      const cloudinaryImageUrl = saved.quote.imageUrl || null;
      console.log("Quote saved successfully, image URL:", cloudinaryImageUrl);

      // STEP 3: Verify wallet client availability before token creation
      if (!walletClient) {
        console.error("Wallet client is not available");
        setMessage(
          "Quote saved! Token creation failed: Wallet client not available."
        );
        // Reset form state and return early
        setQuote("");
        setTitle("");
        setImagePreview(null);
        fetchQuotes();
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

        // Call the createZoraCoin function with necessary parameters
        const result = await createZoraCoin({
          walletClient: walletClient, // Use the walletClient from the hook
          publicClient,
          title: title.trim(),
          imageUrl: cloudinaryImageUrl,
          creatorAddress: address,
        });

        console.log("Token creation result:", result);

        // Check if result indicates a pending transaction
        if (result.status === "pending" && result.txHash) {
          // Update the quote record with the transaction hash
          const updateRes = await fetch(`/api/quote/${saved.quote._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              zoraTokenTxHash: result.txHash,
              zoraTokenPending: true, // Flag to indicate we're waiting for confirmation
            }),
          });

          if (updateRes.ok) {
            setMessage(
              `Quote saved! Your token is being created. You can track progress at: ${result.explorerUrl}`
            );
          } else {
            setMessage("Quote saved! Token transaction is processing.");
          }

          // Reset form state
          setQuote("");
          setTitle("");
          setImagePreview(null);
          fetchQuotes();
          return;
        }

        // Check if result contains an error message
        if (result.error) {
          throw new Error(result.error);
        }

        // STEP 5: Update the quote record with token information
        const updateRes = await fetch(`/api/quote/${saved.quote._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zoraTokenAddress: result.address,
            zoraTokenTxHash: result.txHash,
          }),
        });

        if (updateRes.ok) {
          setMessage("Quote and token created successfully!");
        } else {
          // Token created but failed to update DB record
          setMessage(
            "Quote saved and token created! (Token info update failed)"
          );
        }
      } catch (tokenError) {
        console.error("Token creation failed:", tokenError);
        // Still saved the quote, just failed token creation
        setMessage(
          `Quote saved successfully! (Token creation failed: ${tokenError.message})`
        );
      }

      // STEP 6: Reset the form state
      setQuote("");
      setTitle("");
      setImagePreview(null);

      // STEP 7: Refresh quotes list to show the new quote
      fetchQuotes();
    } catch (err) {
      console.error("Send quote error:", err);
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
                  {quotes.length > 0 ? (
                    quotes.map((quote, index) => (
                      <div key={quote._id} className="quote-item">
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
                              <strong className="quote-title">
                                {quote.title}
                              </strong>
                              {quote.zoraTokenAddress && (
                                <span className="token-badge">
                                  $
                                  {quote.title?.toUpperCase().substring(0, 5) ||
                                    "TOKEN"}
                                </span>
                              )}
                            </div>
                            <p className="quote-text">{quote.text}</p>
                            {quote.zoraTokenAddress && (
                              <div className="token-info">
                                <a
                                  href={`https://basescan.org/address/${quote.zoraTokenAddress}`}
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
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(index)}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No quotes available.</p>
                  )}
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
