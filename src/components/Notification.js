import { motion } from "framer-motion";
import { FaSpinner } from "react-icons/fa";

const Notification = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <motion.div
      className={`notification ${type || "info"}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="notification-content">
        {type === "error" && <span className="notification-icon">⚠️</span>}
        {type === "success" && <span className="notification-icon">✅</span>}
        {type === "info" && <span className="notification-icon">ℹ️</span>}
        {type === "pending" && <FaSpinner className="spin notification-icon" />}
        <span className="notification-message">{message}</span>
      </div>
      <button className="notification-close" onClick={onClose}>
        ×
      </button>
    </motion.div>
  );
};

export default Notification;