"use client";

import { useFarcaster } from "./FarcasterFrameProvider";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useProfile } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/frame-sdk";
import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useDisconnect,
} from "wagmi";
import { createZoraCoin } from "@/lib/createZoraCoin";

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
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
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

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // ← full "data:image/png;base64,xx..."
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

  const sendQuote = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setMessage("");

    try {
      // 1) validation
      if (!title.trim()) throw new Error("Please enter a title");
      if (!quote.trim()) throw new Error("Quote cannot be empty");
      if (!userData) throw new Error("User data missing");

      // 2) generate OG image
      const ogUrl =
        `/api/og?quote=${encodeURIComponent(quote)}` +
        `&username=${encodeURIComponent(userData.username)}` +
        `&displayName=${encodeURIComponent(userData.displayName)}` +
        `&pfpUrl=${encodeURIComponent(userData.pfpUrl)}`;
      const ogRes = await fetch(ogUrl);
      if (!ogRes.ok) throw new Error("Failed to generate OG image");
      const blob = await ogRes.blob();

      // 2a) UPLOAD to Pinata
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: blob, // raw PNG blob
      });
      const { url: imageUrl, error: uploadError } = await uploadRes.json();
      if (!uploadRes.ok || !imageUrl) {
        throw new Error(uploadError || "Image upload failed");
      }

      // 3) save quote to your backend
      setMessage("Saving quote…");
      const dateKey = `${address}_${new Date().toISOString().slice(0, 10)}`;
      const createRes = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          text: quote,
          creatorAddress: address,
          fid: userData.fid,
          username: userData.username,
          displayName: userData.displayName,
          pfpUrl: userData.pfpUrl,
          verifiedAddresses: userData.verifiedAddresses,
          dateKey,
          image: imageUrl, // ← use the Pinata URL here
        }),
      });
      const { quote: saved, error } = await createRes.json();
      if (!createRes.ok || !saved)
        throw new Error(error || "Failed to save quote");

      // 4) mint Zora coin
      setMessage("Minting token…");
      const { address: tokenAddress } = await createZoraCoin({
        walletClient,
        publicClient,
        title: saved.title,
        imageUrl: saved.image, // your metadata API will use this Pinata URL
        creatorAddress: address,
      });

      // 5) persist token address
      setMessage("Finalizing token…");
      await fetch(`/api/quote/${saved._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoraTokenAddress: tokenAddress }),
      });

      setMessage(`🎉 Token minted at ${tokenAddress}`);
      fetchQuotes();
      setTitle("");
      setQuote("");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Something went wrong");
    } finally {
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

    const originalText = quote;
    setQuote(editedText);

    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
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
      const base64Image = await blobToDataUrl(blob);

      setQuote(originalText);

      const res = await fetch(`/api/quote/${quotes[editIndex]._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editedText, image: base64Image }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Quote updated successfully!");
        setEditIndex(null);
        fetchQuotes();
      } else {
        setMessage(data.error || "Failed to update quote.");
      }
    } catch (error) {
      setMessage("Something went wrong. Try again.");
    } finally {
      setIsUpdating(false);
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
                      disabled={isSaving || !isConnected || !walletClient}
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
            <ConnectButton label="sign in" />
          </div>
        )
      )}
    </div>
  );
}
