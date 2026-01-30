import { useState } from "react";
import { X } from "lucide-react";
import { SiApple } from "react-icons/si";

function shouldShowBanner() {
  if (typeof window === "undefined") return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;

  const dismissedAt = localStorage.getItem("ios-shortcut-dismissed");
  const daysSinceDismissed = dismissedAt
    ? (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
    : Infinity;
  return daysSinceDismissed > 7;
}

export default function IOSInstallBanner() {
  const [show, setShow] = useState(shouldShowBanner);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("ios-shortcut-dismissed", Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="ios-shortcut-banner">
      <button
        className="ios-shortcut-banner-close"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <div className="ios-shortcut-banner-content">
        <div className="ios-shortcut-banner-text">
          <p>Save pages directly from Safari</p>
        </div>
        <a
          href="https://www.icloud.com/shortcuts/21c87edf29b046db892c9e57dac6d1fd"
          target="_blank"
          rel="noopener noreferrer"
          className="ios-shortcut-banner-btn"
        >
          <SiApple size={14} />
          Get iOS Shortcut
        </a>
      </div>
    </div>
  );
}
