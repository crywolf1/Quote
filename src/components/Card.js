"use client";

import { useFarcaster } from "./FarcasterFrameProvider";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NeynarAuthButton } from "@neynar/react";

import "../styles/style.css";
import {
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaWallet,
  FaShareSquare,
} from "react-icons/fa";

export default function Card() {
  const { userData, loading, error, connectWallet } = useFarcaster();
  const { isConnected, isDisconnected, status, address } = useAccount();
  const { disconnect } = useDisconnect();

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [signerUuid, setSignerUuid] = useState(null);

  // Fetch quotes from API
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

  // Load signer UUID from localStorage on mount
  useEffect(() => {
    const storedSignerUuid = localStorage.getItem("signerUuid");
    if (storedSignerUuid) {
      setSignerUuid(storedSignerUuid);
    }
  }, []);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
      setMessage("Wallet connected. Retrieving Farcaster data...");
    } catch (err) {
      setMessage("Failed to connect wallet: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Neynar auth success
  const handleNeynarAuthSuccess = (response) => {
    const { signer_uuid } = response;
    localStorage.setItem("signerUuid", signer_uuid);
    setSignerUuid(signer_uuid);
    setMessage("Successfully authenticated with Farcaster!");
  };

  // Handle casting a quote to Farcaster
  const handleCast = async (quoteText) => {
    if (!quoteText) {
      setMessage("No quote to cast.");
      return;
    }

    if (!signerUuid || !userData?.fid) {
      setMessage("Please sign in with Neynar to cast.");
      return;
    }

    setIsCasting(true);
    setMessage("Casting your quote to Farcaster...");

    try {
      const res = await fetch("/api/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: quoteText,
          fid: userData.fid,
          signerUuid,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Quote successfully casted to Farcaster!");
      } else {
        setMessage(data.error || "Failed to cast quote.");
      }
    } catch (err) {
      setMessage("Error casting quote: " + err.message);
    } finally {
      setIsCasting(false);
    }
  };

  // Navigation for quote carousel
  const handleLeftClick = () => {
    if (quotes.length === 0) return;
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + quotes.length) % quotes.length
    );
  };

  const handleRightClick = () => {
    if (quotes.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
  };

  // Save quote to API
  const sendQuote = async () => {
    if (!quote.trim()) {
      setMessage("Quote cannot be empty!");
      return;
    }

    if (!userData) {
      setMessage("User data not available");
      return;
    }

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: quote,
          creatorAddress: address,
          fid: userData.fid,
          username: userData.username,
          displayName: userData.displayName,
          pfpUrl: userData.pfpUrl,
          verifiedAddresses: userData.verifiedAddresses, // optional if you're tracking it
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Quote saved successfully!");
        setQuote("");
        fetchQuotes(); // refresh
      } else {
        setMessage(data.error || "Failed to save quote.");
      }
    } catch (error) {
      setMessage("Something went wrong. Try again.");
    }
  };

  // Edit quote
  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedText(quotes[index].text);
  };

  const handleUpdateQuote = async () => {
    if (!editedText.trim()) {
      setMessage("Quote cannot be empty!");
      return;
    }
    try {
      const res = await fetch(`/api/quote/${quotes[editIndex]._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editedText }),
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
    setMessage(""); // Clear message when changing sections
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
              <div className="card-content">
                <div className="card-subtitle">Quote</div>
                <p className="card-desc">
                  {quotes[currentIndex]?.text || "No quotes yet."}
                </p>
                {message && activeSection === "#about" && (
                  <p className="message">{message}</p>
                )}
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
                            <button onClick={handleUpdateQuote}>Save</button>
                          </div>
                        ) : (
                          <p>{quote.text}</p>
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
                          <button
                            className="cast-btn-small"
                            onClick={() => handleCast(quote.text)}
                            disabled={isCasting || !signerUuid}
                          >
                            <FaShareSquare /> Cast
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No quotes available.</p>
                  )}
                </div>
                {message && activeSection === "#experience" && (
                  <p className="message">{message}</p>
                )}
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

                <div className="profile-wrapper-logout">
                  <div>
                    <div className="card-subtitle">Write Your Quote</div>
                    <p className="char-count">
                      {240 - quote.length} characters remaining
                    </p>
                  </div>
                  <div className="auth-buttons">
                    <button
                      onClick={() => disconnect()}
                      className="disconnect-btn"
                    >
                      Sign Out
                    </button>
                    <NeynarAuthButton
                      onSuccess={handleNeynarAuthSuccess}
                      onError={(err) =>
                        setMessage("Neynar Auth error: " + err.message)
                      }
                      appId={process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID}
                    />
                  </div>
                </div>

                <div className="card-contact-wrapper">
                  <div className="card-contact">
                    <textarea
                      placeholder="Write your quote here..."
                      className="text-area"
                      maxLength={240}
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                    />
                  </div>
                  <button className="contact-me" onClick={sendQuote}>
                    Save Quote
                  </button>
                </div>
                {message && activeSection === "#contact" && (
                  <p className="message">{message}</p>
                )}

                {!signerUuid && (
                  <div className="farcaster-auth-notice">
                    <p>Sign in with Neynar to enable casting to Farcaster</p>
                  </div>
                )}
              </div>
            </div>
            {/* Navigation */}
            <div className="card-container2">
              {activeSection === "#about" && (
                <div className="card-buttons1">
                  <button
                    className="nav-btn left"
                    onClick={handleLeftClick}
                    disabled={quotes.length === 0}
                  >
                    <FaArrowLeft size={30} />
                  </button>
                  <button
                    className="cast-btn"
                    onClick={() => handleCast(quotes[currentIndex]?.text)}
                    disabled={isCasting || !signerUuid || !quotes[currentIndex]}
                  >
                    {isCasting ? (
                      "Casting..."
                    ) : (
                      <>
                        <FaShareSquare /> Cast This
                      </>
                    )}
                  </button>
                  <button
                    className="nav-btn right"
                    onClick={handleRightClick}
                    disabled={quotes.length === 0}
                  >
                    <FaArrowRight size={30} />
                  </button>
                </div>
              )}
              <div className="card-buttons">
                <button
                  className={activeSection === "#about" ? "is-active" : ""}
                  onClick={() => handleSectionChange("#about")}
                >
                  Quote
                </button>
                <button
                  className={activeSection === "#experience" ? "is-active" : ""}
                  onClick={() => handleSectionChange("#experience")}
                >
                  All Quotes
                </button>
                <button
                  className={activeSection === "#contact" ? "is-active" : ""}
                  onClick={() => handleSectionChange("#contact")}
                >
                  Add
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
