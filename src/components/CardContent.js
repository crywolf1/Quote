"use client";

import { useState, useEffect } from "react";
import "../styles/style.css";
import {
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaPlus,
} from "react-icons/fa";
import { useSearchParams } from "next/navigation";

export default function CardContent() {
  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userData, setUserData] = useState(null);

  const searchParams = useSearchParams();
  const fid = searchParams.get("fid") || 0;

  const fetchQuotes = async () => {
    try {
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
    }
  };

  useEffect(() => {
    fetchQuotes();

    const fetchUserData = async () => {
      if (fid) {
        try {
          const res = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
            {
              headers: {
                accept: "application/json",
                api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "",
              },
            }
          );
          const data = await res.json();
          const user = data.users[0] || {};
          setUserData({ username: user.username, pfpUrl: user.pfp_url });
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" });
        }
      } else {
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" });
      }
    };
    fetchUserData();
  }, [fid]);

  const handleLeftClick = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + quotes.length) % quotes.length
    );
  };

  const handleRightClick = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
  };

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

  const handleSectionChange = (section) => {
    if (editIndex !== null) {
      setEditIndex(null);
    }
    setActiveSection(section);
  };

  return (
    <div className="card" data-state={activeSection}>
      <div className="card-header">
        <img
          src={userData?.pfpUrl || "/default-avatar.jpg"}
          alt="Avatar"
          className="card-avatar"
        />
        <h1 className="card-fullname">
          Welcome, {userData?.username || "Guest"}!
        </h1>
      </div>

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
                Send Quote
              </button>
            </div>
          </div>
        </div>

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
