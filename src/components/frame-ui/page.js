"use client";

import { useState, useEffect } from "react";
import {
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaPlus,
} from "react-icons/fa";
import "../../styles/style.css"; // Adjust path if needed

export default function FrameUI() {
  const [quotes, setQuotes] = useState([]);
  const [userData, setUserData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch quotes
      const quotesRes = await fetch("/api/quote");
      const { quotes } = await quotesRes.json();
      setQuotes(quotes);
      setCurrentIndex(Math.floor(Math.random() * quotes.length));

      // Fetch user data from Neynar (assuming fid is passed or available)
      const fid = window.localStorage.getItem("farcaster_fid") || 0; // Fallback; ideally passed from frame
      const neynarRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            accept: "application/json",
            api_key: process.env.NEYNAR_API_KEY || "",
          },
        }
      );
      const neynarData = await neynarRes.json();
      const user = neynarData.users[0] || {};
      setUserData({ username: user.username, pfpUrl: user.pfp_url });
    };
    fetchData();
  }, []);

  const handleLeftClick = () =>
    setCurrentIndex((prev) => (prev - 1 + quotes.length) % quotes.length);
  const handleRightClick = () =>
    setCurrentIndex((prev) => (prev + 1) % quotes.length);

  const sendQuote = async () => {
    if (!quote.trim()) return setMessage("Quote cannot be empty!");
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: quote }),
    });
    if (res.ok) {
      setMessage("Quote added!");
      setQuote("");
      const { quotes } = await (await fetch("/api/quote")).json();
      setQuotes(quotes);
    } else setMessage("Failed to add quote.");
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedText(quotes[index].text);
  };

  const handleUpdateQuote = async () => {
    if (!editedText.trim()) return setMessage("Quote cannot be empty!");
    const res = await fetch(`/api/quote/${quotes[editIndex]._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editedText }),
    });
    if (res.ok) {
      setMessage("Quote updated!");
      setEditIndex(null);
      const { quotes } = await (await fetch("/api/quote")).json();
      setQuotes(quotes);
    } else setMessage("Failed to update quote.");
  };

  const handleDelete = async (index) => {
    const res = await fetch(`/api/quote/${quotes[index]._id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessage("Quote deleted!");
      const { quotes } = await (await fetch("/api/quote")).json();
      setQuotes(quotes);
    } else setMessage("Failed to delete quote.");
  };

  return (
    <div className="card">
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
        <div className="card-section is-active">
          <div className="card-content">
            <div className="card-subtitle">Quote</div>
            <p className="card-desc">
              {quotes[currentIndex]?.text || "No quotes yet."}
            </p>
          </div>
          <div className="card-buttons1">
            <button className="nav-btn left" onClick={handleLeftClick}>
              <FaArrowLeft size={30} />
            </button>
            <button className="nav-btn right" onClick={handleRightClick}>
              <FaArrowRight size={30} />
            </button>
          </div>
        </div>
        <div className="card-section">
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            maxLength={240}
            placeholder="Add a quote"
          />
          <button onClick={sendQuote}>Add Quote</button>
          {message && <p>{message}</p>}
        </div>
        <div className="card-section">
          {quotes.map((q, i) => (
            <div key={q._id} className="quote-item">
              {editIndex === i ? (
                <>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    maxLength={240}
                  />
                  <button onClick={handleUpdateQuote}>Save</button>
                </>
              ) : (
                <>
                  <p>{q.text}</p>
                  <button onClick={() => handleEdit(i)}>
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(i)}>
                    <FaTrashAlt />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
