import { useState, useEffect } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export default function CustomConnectButton() {
  const { openConnectModal } = useConnectModal();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Detect mobile on client-side
  useEffect(() => {
    const checkMobile = () => {
      return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };

    if (typeof window !== "undefined") {
      setIsMobileDevice(checkMobile());
    }
  }, []);

  const handleConnect = async () => {
    // For mobile, try direct deep linking first
    if (isMobileDevice) {
      // Try opening Rainbow directly
      window.location.href = "https://rnbwapp.com/";

      // After a short delay, open the modal as fallback
      setTimeout(() => {
        openConnectModal?.();
      }, 1500);
    } else {
      // On desktop, use normal modal
      openConnectModal?.();
    }
  };

  return (
    <button onClick={handleConnect} className="custom-connect-btn">
      Sign in
    </button>
  );
}
