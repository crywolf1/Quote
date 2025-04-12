"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { createCoin } from "@zoralabs/coins-sdk";
import WalletConnector from "./WalletConnector";
import { FaEdit, FaTrashAlt, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "../styles/style.css";

export default function Card() {
  // Auth and wallet states
  const [userData, setUserData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { address } = useAccount();
  const [walletUserData, setWalletUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // UI states
  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Memoized user data
  const displayUser = useMemo(() => {
    return (
      userData ||
      walletUserData || { username: "Guest", pfpUrl: "/default-avatar.jpg" }
    );
  }, [userData, walletUserData]);

  // Fetch Farcaster user data
  const fetchFarcasterUser = async (address) => {
    try {
      const response = await fetch(`/api/neynar?address=${address}`);
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        setUserData(data.users[0]);
      } else {
        setErrorMessage("No Farcaster account found for this wallet.");
      }
    } catch (error) {
      console.error("Error fetching Farcaster user data:", error);
      setErrorMessage("Failed to fetch user data. Please try again.");
    }
  };

  // Fetch user data by wallet address
  const fetchWalletUser = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/neynar?address=${address}`);
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        setWalletUserData(data.users[0]);
      } else {
        setWalletUserData(null);
        setErrorMessage("No Farcaster account found for this wallet.");
      }
    } catch (error) {
      console.error("Failed to fetch wallet user:", error);
      setErrorMessage("Failed to fetch wallet user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

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
      } else {
        setErrorMessage("Failed to fetch quotes.");
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      setErrorMessage("Failed to fetch quotes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Quote actions
  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedText(quotes[index].text);
  };

  const handleUpdateQuote = async () => {
    if (!editedText.trim()) {
      setErrorMessage("Quote cannot be empty!");
      return;
    }

    try {
      const res = await fetch(`/api/quote/${quotes[editIndex]._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editedText }),
      });

      if (res.ok) {
        setSuccessMessage("Quote updated successfully!");
        setEditIndex(null);
        fetchQuotes();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to update quote.");
      }
    } catch (error) {
      console.error("Failed to update quote:", error);
      setErrorMessage("Failed to update quote. Please try again.");
    }
  };

  const handleDelete = async (index) => {
    try {
      const res = await fetch(`/api/quote/${quotes[index]._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMessage("Quote deleted successfully!");
        fetchQuotes();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to delete quote.");
      }
    } catch (error) {
      console.error("Failed to delete quote:", error);
      setErrorMessage("Failed to delete quote. Please try again.");
    }
  };

  // Navigation handlers
  const handleLeftClick = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + quotes.length) % quotes.length
    );
  };

  const handleRightClick = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
  };

  const handleSectionChange = (section) => {
    if (editIndex !== null) setEditIndex(null);
    setActiveSection(section);
  };

  // Save and mint functions
  const sendQuote = async () => {
    if (!quote.trim()) {
      setErrorMessage("Quote cannot be empty!");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: quote }),
      });

      if (res.ok) {
        setSuccessMessage("Quote saved successfully!");
        setQuote("");
        fetchQuotes();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to save quote.");
      }
    } catch (error) {
      console.error("Failed to save quote:", error);
      setErrorMessage("Failed to save quote. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const mintQuote = async () => {
    if (!address) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (!quote.trim()) {
      setErrorMessage("Quote cannot be empty!");
      return;
    }

    try {
      const coin = await createCoin({
        metadata: {
          name: `Quote by ${
            displayUser?.displayName || displayUser?.username || "Anonymous"
          }`,
          description: quote,
          image: displayUser?.pfpUrl || "/default-avatar.jpg",
        },
        owner: address,
      });

      setSuccessMessage("Quote minted as a Zora Coin!");
      setQuote("");
      await sendQuote();
    } catch (error) {
      console.error("Failed to mint Coin:", error);
      setErrorMessage("Failed to mint quote: " + error.message);
    }
  };

  // Effects
  useEffect(() => {
    fetchWalletUser();
  }, [fetchWalletUser]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="card" data-state={activeSection}>
      <WalletConnector onWalletConnect={fetchFarcasterUser} />

      {userData ? (
        <div>
          <h1>Welcome, {userData.display_name || userData.username}!</h1>
          <img src={userData.pfp_url || "/default-avatar.jpg"} alt="Profile" />
        </div>
      ) : (
        <p>{errorMessage || "Connect your wallet to fetch user data."}</p>
      )}

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
                          onChange={(e) => setEditedText(e.target.value)}
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
              <button
                className="contact-me"
                onClick={sendQuote}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Quote"}
              </button>
              <button
                className="contact-me"
                onClick={mintQuote}
                disabled={isSaving}
              >
                {isSaving ? "Minting..." : "Mint as Zora Coin"}
              </button>
            </div>
            {successMessage && (
              <p className="success-message">{successMessage}</p>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
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
