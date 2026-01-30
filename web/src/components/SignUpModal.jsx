import { useState, useEffect } from "react";
import { X, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { BlackskyIcon, NorthskyIcon, BlueskyIcon, TopphieIcon } from "./Icons";
import { startSignup } from "../api/client";

const RECOMMENDED_PROVIDER = {
  id: "bluesky",
  name: "Bluesky",
  service: "https://bsky.social",
  Icon: BlueskyIcon,
  description: "The most popular option, recommended for most people",
};

const OTHER_PROVIDERS = [
  {
    id: "blacksky",
    name: "Blacksky",
    service: "https://blacksky.app",
    Icon: BlackskyIcon,
    description: "For the Culture. A safe space for Black users and allies",
  },
  {
    id: "northsky",
    name: "Northsky",
    service: "https://northsky.social",
    Icon: NorthskyIcon,
    description: "A Canadian-based worker-owned cooperative",
  },
  {
    id: "topphie",
    name: "Topphie",
    service: "https://tophhie.social",
    Icon: TopphieIcon,
    description: "A welcoming and friendly community",
  },
  {
    id: "altq",
    name: "AltQ",
    service: "https://altq.net",
    Icon: null,
    description: "An independent, self-hosted PDS instance",
  },
  {
    id: "custom",
    name: "Custom",
    service: "",
    custom: true,
    Icon: null,
    description: "Connect to your own or another custom PDS",
  },
];

export default function SignUpModal({ onClose }) {
  const [showOtherProviders, setShowOtherProviders] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customService, setCustomService] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleProviderSelect = async (provider) => {
    if (provider.custom) {
      setShowCustomInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await startSignup(provider.service);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to this provider. Please try again.");
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customService.trim()) return;

    setLoading(true);
    setError(null);

    let serviceUrl = customService.trim();
    if (!serviceUrl.startsWith("http")) {
      serviceUrl = `https://${serviceUrl}`;
    }

    try {
      const result = await startSignup(serviceUrl);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to this PDS. Please check the URL.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content signup-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        {loading ? (
          <div className="signup-step" style={{ textAlign: "center" }}>
            <Loader2 size={32} className="spinner" />
            <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
              Connecting to provider...
            </p>
          </div>
        ) : showCustomInput ? (
          <div className="signup-step">
            <h2>Custom Provider</h2>
            <form onSubmit={handleCustomSubmit}>
              <div className="form-group">
                <label className="form-label">
                  PDS address (e.g. pds.example.com)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  placeholder="pds.example.com"
                  autoFocus
                />
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCustomInput(false);
                    setError(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!customService.trim()}
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="signup-step">
            <h2>Create your account</h2>
            <p className="signup-subtitle">
              Margin uses the AT Protocol, the same decentralized network that
              powers Bluesky. Your account will be hosted on a server of your
              choice.
            </p>

            {error && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="signup-recommended">
              <div className="signup-recommended-badge">Recommended</div>
              <button
                className="provider-card provider-card-featured"
                onClick={() => handleProviderSelect(RECOMMENDED_PROVIDER)}
              >
                <div className="provider-icon">
                  <RECOMMENDED_PROVIDER.Icon size={24} />
                </div>
                <div className="provider-info">
                  <h3>{RECOMMENDED_PROVIDER.name}</h3>
                  <span>{RECOMMENDED_PROVIDER.description}</span>
                </div>
                <ChevronRight size={16} className="provider-arrow" />
              </button>
            </div>

            <button
              type="button"
              className="signup-toggle-others"
              onClick={() => setShowOtherProviders(!showOtherProviders)}
            >
              {showOtherProviders ? "Hide other options" : "More options"}
              <ChevronRight
                size={14}
                className={`toggle-chevron ${showOtherProviders ? "open" : ""}`}
              />
            </button>

            {showOtherProviders && (
              <div className="provider-grid">
                {OTHER_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    className="provider-card"
                    onClick={() => handleProviderSelect(p)}
                  >
                    <div className={`provider-icon ${p.wide ? "wide" : ""}`}>
                      {p.Icon ? (
                        <p.Icon size={32} />
                      ) : (
                        <span className="provider-initial">{p.name[0]}</span>
                      )}
                    </div>
                    <div className="provider-info">
                      <h3>{p.name}</h3>
                      <span>{p.description}</span>
                    </div>
                    <ChevronRight size={16} className="provider-arrow" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
