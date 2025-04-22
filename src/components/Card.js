"use client";

import { useFarcaster } from "./FarcasterFrameProvider";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AuthKitProvider, SignInButton, useAuthKit } from "@farcaster/auth-kit";

import "../styles/style.css";
import {
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaShareSquare,
} from "react-icons/fa";

export default function Card() {
  const { userData, connectWallet } = useFarcaster();
  const { isConnected, isDisconnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signer, setSigner] = useState(null);
  const [user, setUser] = useState(null);

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
    } catch {
      setMessage("Failed to fetch quotes.");
    }
  };

  useEffect(() => {
    if (address) fetchQuotes();
  }, [address]);

  const handleCast = async (quoteText) => {
    if (!signer || !user) {
      setMessage("Please sign in with Farcaster first.");
      return;
    }

    try {
      const res = await fetch("/api/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerUuid: signer.signer_uuid,
          fid: user.fid,
          text: quoteText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Quote casted to Farcaster!");
      } else {
        setMessage(data.error || "Failed to cast.");
      }
    } catch (err) {
      setMessage("Casting error: " + err.message);
    }
  };

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
      fetchQuotes();
    } else {
      setMessage(data.error || "Failed to save quote.");
    }
  };

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
        setMessage("Quote updated!");
        setEditIndex(null);
        fetchQuotes();
      } else {
        setMessage(data.error || "Failed to update.");
      }
    } catch {
      setMessage("Update error");
    }
  };

  const handleDelete = async (index) => {
    try {
      const res = await fetch(`/api/quote/${quotes[index]._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Deleted successfully!");
        fetchQuotes();
      } else {
        setMessage(data.error || "Failed to delete.");
      }
    } catch {
      setMessage("Delete error");
    }
  };

  const handleSectionChange = (section) => {
    if (editIndex !== null) setEditIndex(null);
    setActiveSection(section);
  };

  return (
    <AuthKitProvider
      config={{
        rpcUrl: "https://mainnet.optimism.io",
        domain: "yourdomain.com",
      }}
      onSuccess={({ signer, user }) => {
        setSigner(signer);
        setUser(user);
      }}
    >
      <div className={isConnected ? "card" : ""} data-state={activeSection}>
        {isConnected ? (
          <>
            <div className="card-main">
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
              <div
                className={`card-section ${
                  activeSection === "#contact" ? "is-active" : ""
                }`}
                id="contact"
              >
                <div className="card-content showProfileHere">
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
                      Sign out
                    </button>
                    <SignInButton />
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
              <div className="card-container2">
                {activeSection === "#about" && (
                  <div className="card-buttons1">
                    <button
                      className="nav-btn left"
                      onClick={() =>
                        setCurrentIndex(
                          (i) => (i - 1 + quotes.length) % quotes.length
                        )
                      }
                    >
                      <FaArrowLeft size={30} />
                    </button>
                    <button
                      className="cast-btn"
                      onClick={() => handleCast(quotes[currentIndex]?.text)}
                    >
                      <FaShareSquare /> Cast This
                    </button>
                    <button
                      className="nav-btn right"
                      onClick={() =>
                        setCurrentIndex((i) => (i + 1) % quotes.length)
                      }
                    >
                      <FaArrowRight size={30} />
                    </button>
                  </div>
                )}
                <div className="card-buttons">
                  <button
                    onClick={() => handleSectionChange("#about")}
                    className={activeSection === "#about" ? "is-active" : ""}
                  >
                    Quote
                  </button>
                  <button
                    onClick={() => handleSectionChange("#experience")}
                    className={
                      activeSection === "#experience" ? "is-active" : ""
                    }
                  >
                    All Quotes
                  </button>
                  <button
                    onClick={() => handleSectionChange("#contact")}
                    className={activeSection === "#contact" ? "is-active" : ""}
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
    </AuthKitProvider>
  );
}
