"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { sdk } from "@farcaster/frame-sdk"; // Import Farcaster Frame SDK
import "../styles/style.css";

export default function Card() {
  const [userData, setUserData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch Farcaster user data using FID or wallet address
  const fetchFarcasterUser = async (fid, address) => {
    try {
      const response = await fetch(
        `/api/neynar?${fid ? `fid=${fid}` : `address=${address}`}`
      );
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        setUserData(data.users[0]);
      } else {
        setErrorMessage("No Farcaster account found for this user.");
      }
    } catch (error) {
      console.error("Error fetching Farcaster user data:", error);
      setErrorMessage("Failed to fetch user data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Farcaster Frame SDK and fetch user data
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        // Check if the SDK is available
        if (!sdk || !sdk.actions) {
          throw new Error("Farcaster Frame SDK is not available.");
        }

        // Wait for the Frame SDK to be ready
        await sdk.actions.ready();

        // Get the user's Frame context (FID and wallet address)
        const context = await sdk.actions.getFrameContext();
        console.log("Farcaster Frame Context:", context);

        if (context?.fid) {
          // Fetch user data using FID
          fetchFarcasterUser(context.fid, null);
        } else if (context?.address) {
          // Fetch user data using wallet address
          fetchFarcasterUser(null, context.address);
        } else {
          setErrorMessage("No Farcaster user context found.");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing Farcaster Frame SDK:", error);
        setErrorMessage(
          error.message || "Failed to initialize Farcaster. Please try again."
        );
        setIsLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="error-container">
        <p>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="card" data-state={activeSection}>
      {userData ? (
        <div>
          <h1>Welcome, {userData.display_name || userData.username}!</h1>
          <img
            src={userData.pfp_url || "/default-avatar.jpg"}
            alt="Profile"
            className="card-avatar"
          />
          <p>{userData.profile?.bio || "No bio available."}</p>
          <p>Followers: {userData.follower_count}</p>
          <p>Following: {userData.following_count}</p>
        </div>
      ) : (
        <p>No user data available.</p>
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
            </div>
            {successMessage && (
              <p className="success-message">{successMessage}</p>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
