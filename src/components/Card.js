"use client";

import { useFarcaster } from "./FarcasterFrameProvider";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { createCoin } from "@zoralabs/coins-sdk";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import "../styles/style.css";
import {
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaWallet,
} from "react-icons/fa";
import NeynarLogin from "./NeynarLogin";

export default function Card() {
  const { userData, loading, error, connectWallet } = useFarcaster();
  const { isConnected, isDisconnected, status, address } = useAccount();
  console.log("Card userData:", userData, "loading:", loading, "error:", error);
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

  useEffect(() => {
    // Retrieve and store signer_uuid (you can also fetch it from backend if needed)
    const savedSignerUuid = localStorage.getItem("signer_uuid");
    if (savedSignerUuid) {
      setSignerUuid(savedSignerUuid);
    }
  }, []);

  const castQuote = async () => {
    if (!signerUuid || !address) {
      setMessage("Please log in with your wallet and sign in with Neynar.");
      return;
    }

    if (!quote.trim()) {
      setMessage("Quote cannot be empty.");
      return;
    }

    try {
      setMessage("Casting your quote...");

      // Send the casting request to your backend with signer_uuid and quote
      const res = await fetch("/api/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_uuid: signerUuid, // pass the signer_uuid from localStorage or context
          fid: address, // Use the wallet address as fid (or get fid from SIWN)
          text: quote, // The quote text to be cast
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Quote successfully casted!");
        router.push("/success"); // Optionally redirect to a success page
      } else {
        setMessage(`❌ Failed to cast: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setMessage("❌ Error casting quote");
    }
  };
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
    if (!quote.trim() || quote.trim().length < 4) {
      setMessage("Quote must be at least 4 characters long.");
      return;
    }

    // Assuming `userWalletAddress` contains the current user's wallet address
    const address = address; // Replace with actual user's wallet address

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: quote,
          creatorAddress: address,
        }), // send creatorAddress
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Quote saved successfully!");
        setQuote("");
        fetchQuotes(); // Fetch the updated list of quotes
      } else {
        setMessage(data.error || "Failed to save quote.");
      }
    } catch (error) {
      setMessage("Something went wrong. Try again.");
    }
  };

  // Mint quote as a Zora Coin
  const mintQuote = async () => {
    if (!address) {
      setMessage("Please connect your wallet first.");
      return;
    }
    if (!quote.trim()) {
      setMessage("Quote cannot be empty!");
      return;
    }

    try {
      const coin = await createCoin({
        metadata: {
          name: `Quote by ${username}`,
          description: quote,
          image: pfpUrl,
        },
        owner: address,
      });
      setMessage("Quote minted as a Zora Coin!");
      setQuote("");
      await sendQuote();
    } catch (error) {
      setMessage("Failed to mint quote: " + error.message);
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
                            <button onClick={() => setEditIndex(null)}>
                              Cancel
                            </button>
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
                  <img
                    src={pfpUrl}
                    alt="Avatar"
                    className="card-avatar"
                    loading="lazy"
                  />
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
                    sign out
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

                  {/* <button className="contact-me" onClick={mintQuote}>
                    Mint as Zora Coin
                  </button>   */}
                </div>
                {message && <p className="message">{message}</p>}
              </div>
            </div>

            {/* Navigation */}
            <div className="card-container2">
              {activeSection === "#about" && (
                <div className="card-buttons1">
                  <button className="nav-btn left" onClick={handleLeftClick}>
                    <FaArrowLeft size={30} />
                  </button>
                  <button onClick={castQuote}>Cast Quote</button>
                  {message && <p>{message}</p>}
                  <NeynarLogin />

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
