"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFarcaster } from "./FarcasterFrameProvider"; // Import the hook
import { useAccount } from "wagmi"; // For wallet address
import { createCoin } from "@zoralabs/coins-sdk"; // For Zora token minting
import WalletConnector from "./WalletConnector"; // Wallet connection component
import "../styles/style.css";
import { FaEdit, FaTrashAlt, FaArrowLeft, FaArrowRight } from "react-icons/fa";

export default function Card() {
  const { userData, authStatus } = useFarcaster();
  const { address } = useAccount();
  const [walletUserData, setWalletUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  console.log("userData in Card.js:", userData);

  const displayUser = useMemo(() => {
    return userData || walletUserData;
  }, [userData, walletUserData]);

  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchWalletUser = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      console.log("🔍 Fetching user data for address:", address);
      const response = await fetch(`/api/neynar?address=${address}`);
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        console.log("✅ Wallet user data:", data.users[0]);
        setWalletUserData(data.users[0]);
      } else {
        console.warn("⚠️ No Farcaster user found for wallet");
        setWalletUserData(null);
      }
    } catch (error) {
      console.error("❌ Error fetching wallet user:", error);
      setWalletUserData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Use either frame user data or wallet user data

  // Fetch quotes from API
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/quote");
      const data = await res.json();
      if (res.ok) {
        setQuotes(data.quotes);
        if (data.quotes.length > 0) {
          setCurrentIndex(Math.floor(Math.random() * data.quotes.length));
        }
      }
    } catch (error) {
      setMessage("Failed to fetch quotes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, []);

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
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: quote }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Quote saved successfully!");
        setQuote("");
        fetchQuotes();
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
          name: `Quote by ${
            userData?.displayName || userData?.username || "Anonymous"
          }`,
          description: quote,
          image: userData?.pfpUrl || "/default-avatar.jpg",
        },
        owner: address,
      });
      console.log("Coin minted:", coin);
      setMessage("Quote minted as a Zora Coin!");
      setQuote("");
      await sendQuote();
    } catch (error) {
      console.error("Failed to mint Coin:", error);
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

  useEffect(() => {
    fetchWalletUser();
  }, [fetchWalletUser]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (authStatus === "failed") {
    return (
      <div className="error-container">
        <p>Failed to load user data. Please try again.</p>
        <WalletConnector />
      </div>
    );
  }

  return (
    <div className="card" data-state={activeSection}>
      <div className="card-header">
        <img
          src={
            displayUser?.pfpUrl || displayUser?.pfp_url || "/default-avatar.jpg"
          }
          alt="Avatar"
          className="card-avatar"
          onError={(e) => {
            console.log("Failed to load profile image");
            e.target.src = "/default-avatar.jpg";
          }}
        />
        <h1 className="card-fullname">
          Welcome,{" "}
          {displayUser?.displayName ||
            displayUser?.display_name ||
            displayUser?.username ||
            "Guest"}
          !
        </h1>
        {address && !walletUserData && (
          <p className="wallet-info">
            Connected wallet has no associated Farcaster account
          </p>
        )}
      </div>
      {/* Wallet Connector */}
      <WalletConnector />

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
          <div className="card-content">
            <div className="card-subtitle">Write Your Quote</div>
            <p className="char-count">
              {240 - quote.length} characters remaining
            </p>
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
              <button className="contact-me" onClick={mintQuote}>
                Mint as Zora Coin
              </button>
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
    </div>
  );
}
