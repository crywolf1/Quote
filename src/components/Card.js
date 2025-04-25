"use client";

import { useFarcaster } from "./FarcasterFrameProvider";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SignInButton } from "@farcaster/auth-kit";
import { useProfile } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/frame-sdk";
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

  const handleCast = async () => {
    if (!profile) {
      alert("Please sign in to Farcaster first");
      return;
    }

    await sdk.actions.composeCast({
      text: quotes[currentIndex]?.text,
    });
  };
  // Handle wallet connection

  // Get signer UUID from localStorage on component mount

  // Navigation for quote carousel
  const handleLeftClick = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + quotes.length) % quotes.length
    );
  };

  const handleRightClick = () => {
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
        verifiedAddresses: userData.verifiedAddresses,
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

                <div className="profile-wrapper-logout ">
                  <div>
                    <div className="card-subtitle">Write Your Quote</div>
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
              </div>
            </div>
            {/* Navigation */}
            <div className="card-container2">
              {activeSection === "#about" && (
                <div className="card-buttons1">
                  <button className="nav-btn left" onClick={handleLeftClick}>
                    <FaArrowLeft size={30} />
                  </button>

                  {/* <button
                    className={`cast-btn ${isCasting ? "is-casting" : ""}`}
                    onClick={() => handleCast(quotes[currentIndex]?.text)}
                    disabled={isCasting || !signerUuid || !quotes[currentIndex]}
                  >
                    {isCasting ? (
                      <>
                        Casting... <FaSpinner className="spinner" />
                      </>
                    ) : (
                      <>
                        <FaShareSquare /> Cast This
                      </>
                    )}
                  </button> */}

                  {profile ? (
                    <div className="profile-info">
                      <button
                        onClick={() => handleCast(quotes[currentIndex]?.text)}
                      >
                        sign in
                      </button>
                    </div>
                  ) : (
                    <div className="connect-btn">
                      <SignInButton />
                    </div>
                  )}

                  <button className="nav-btn right" onClick={handleRightClick}>
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

          {/* Debugging info - remove in production */}
          {/* {message && activeSection === "#about" && (
            <p className="message">{message}</p>
          )} */}
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
