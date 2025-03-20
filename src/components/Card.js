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

const Card = () => {
  const [activeSection, setActiveSection] = useState("#about");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userData, setUserData] = useState(null);

  // Fetch all quotes
  const fetchQuotes = async () => {
    try {
      const res = await fetch("/api/quote");
      const data = await res.json();
      if (res.ok) {
        setQuotes(data.quotes);
        if (data.quotes.length > 0) {
          setCurrentQuoteIndex(Math.floor(Math.random() * data.quotes.length)); // Show random quote initially
        }
      }
    } catch (error) {
      setMessage("Failed to fetch quotes.");
    }
  };

  const handleLeftClick = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + quotes.length) % quotes.length
    );
  };

  const handleRightClick = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
  };

  const handleAddQuote = () => {
    console.log("Add New Quote");
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
        setQuote(""); // Clear textarea
        fetchQuotes(); // Re-fetch quotes after adding a new one
      } else {
        setMessage(data.error || "Failed to save quote.");
      }
    } catch (error) {
      setMessage("Something went wrong. Try again.");
    }
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedText(quotes[index].text); // Set the quote text for editing
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
        fetchQuotes(); // Re-fetch quotes after editing
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
        fetchQuotes(); // Re-fetch quotes after deleting
      } else {
        setMessage(data.error || "Failed to delete quote.");
      }
    } catch (error) {
      setMessage("Something went wrong. Try again.");
    }
  };

  // Close the editing text area if user clicks outside the editing section
  const handleSectionChange = (section) => {
    if (editIndex !== null) {
      setEditIndex(null); // Close editing if changing section
    }
    setActiveSection(section);
  };

  useEffect(() => {
    fetchQuotes(); // Fetch quotes when the component mounts
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/frame-action");
        const data = await res.json();
        setUserData(data);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="card" data-state={activeSection}>
      <div className="card-header">
        <img
          src={userData?.image || "/default-avatar.jpg"}
          alt="Avatar"
          className="card-avatar"
        />
        <h1 className="card-fullname">
          {userData ? `Welcome, ${userData.text}` : "Guest"}
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
            <p className="card-desc">{quotes[currentIndex]?.text}</p>
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
                  <div key={index} className="quote-item">
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
                          maxLength={240} // Limits input to 240 characters
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
                {/* Display the number of characters remaining */}
              </div>
              <button className="contact-me" onClick={sendQuote}>
                Send Quote
              </button>
            </div>
          </div>
        </div>

        <div className="card-container2">
          {/* Only show .card-buttons1 when activeSection is "#about" (Quote section) */}
          {activeSection === "#about" && (
            <div className="card-buttons1">
              <button className="nav-btn left" onClick={handleLeftClick}>
                <FaArrowLeft size={30} />
              </button>
              <button className="add-quote-btn" onClick={handleAddQuote}>
                <FaPlus size={30} />
              </button>
              <button className="nav-btn right" onClick={handleRightClick}>
                <FaArrowRight size={30} />
              </button>
            </div>
          )}

          {/* The section buttons */}
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
};

export default Card;
