import { motion } from "framer-motion";
import {
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import "../styles/notification.css";

const Notification = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <motion.div
      className={`notification ${type || "info"}`}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="notification-content">
        <div className="notification-icon-wrapper">
          {type === "error" && (
            <FaExclamationTriangle className="notification-icon error-icon" />
          )}
          {type === "success" && (
            <FaCheckCircle className="notification-icon success-icon" />
          )}
          {type === "info" && (
            <FaInfoCircle className="notification-icon info-icon" />
          )}
          {type === "pending" && (
            <FaSpinner className="notification-icon pending-icon spin" />
          )}
        </div>
        <span className="notification-message">{message}</span>
      </div>
      <button
        className="notification-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        <FaTimes />
      </button>
    </motion.div>
  );
};

export default Notification;
