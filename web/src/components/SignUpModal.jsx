import { useState, useEffect } from "react";
import { X, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { BlackskyIcon, NorthskyIcon, BlueskyIcon, TopphieIcon } from "./Icons";
import { describeServer, createAccount, startLogin } from "../api/client";

const PROVIDERS = [
  {
    id: "bluesky",
    name: "Bluesky",
    service: "https://bsky.social",
    Icon: BlueskyIcon,
    description: "The main network",
  },
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
    inviteUrl: "https://northskysocial.com/join",
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
    id: "selfhosted",
    name: "Self-Hosted",
    service: "",
    custom: true,
    Icon: null,
    description: "Connect to your own Personal Data Server",
  },
];

export default function SignUpModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [customService, setCustomService] = useState("");
  const [formData, setFormData] = useState({
    handle: "",
    email: "",
    password: "",
    inviteCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    if (!provider.custom) {
      checkServer(provider.service);
    } else {
      setStep(1.5);
    }
  };

  const checkServer = async (url) => {
    setLoading(true);
    setError(null);
    try {
      let serviceUrl = url.trim();
      if (!serviceUrl.startsWith("http")) {
        serviceUrl = `https://${serviceUrl}`;
      }

      const info = await describeServer(serviceUrl);
      setServerInfo({
        ...info,
        service: serviceUrl,
        inviteCodeRequired: info.inviteCodeRequired ?? true,
      });

      if (selectedProvider?.custom) {
        setSelectedProvider({ ...selectedProvider, service: serviceUrl });
      }

      setStep(2);
    } catch (err) {
      console.error(err);
      setError("Could not connect to this PDS. Please check the URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!serverInfo) return;

    setLoading(true);
    setError(null);

    let domain =
      serverInfo.selectedDomain || serverInfo.availableUserDomains[0];
    if (!domain.startsWith(".")) {
      domain = "." + domain;
    }

    const cleanHandle = formData.handle.trim().replace(/^@/, "");
    const fullHandle = cleanHandle.endsWith(domain)
      ? cleanHandle
      : `${cleanHandle}${domain}`;

    try {
      await createAccount(serverInfo.service, {
        handle: fullHandle,
        email: formData.email,
        password: formData.password,
        inviteCode: formData.inviteCode,
      });

      const result = await startLogin(fullHandle);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        onClose();
        alert("Account created! Please sign in.");
      }
    } catch (err) {
      setError(err.message || "Failed to create account");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content signup-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        {step === 1 && (
          <div className="signup-step">
            <h2>Choose a Provider</h2>
            <p className="signup-subtitle">
              Where would you like to host your account?
            </p>
            <div className="provider-grid">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  className="provider-card"
                  onClick={() => handleProviderSelect(p)}
                >
                  <div className={`provider-icon ${p.wide ? "wide" : ""}`}>
                    {p.Icon ? (
                      <p.Icon size={p.wide ? 32 : 32} />
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
          </div>
        )}

        {step === 1.5 && (
          <div className="signup-step">
            <h2>Custom Provider</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkServer(customService);
              }}
            >
              <div className="form-group">
                <label>PDS address (e.g. pds.example.com)</label>
                <input
                  type="text"
                  className="login-input"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  placeholder="example.com"
                  autoFocus
                />
              </div>
              {error && (
                <div className="error-message">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!customService || loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Next"}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && serverInfo && (
          <div className="signup-step">
            <div className="step-header">
              <button className="btn-back" onClick={() => setStep(1)}>
                ← Back
              </button>
              <h2>
                Create Account on {selectedProvider?.name || "Custom PDS"}
              </h2>
            </div>

            <form onSubmit={handleCreateAccount} className="signup-form">
              {serverInfo.inviteCodeRequired && (
                <div className="form-group">
                  <label>Invite Code *</label>
                  <input
                    type="text"
                    className="login-input"
                    value={formData.inviteCode}
                    onChange={(e) =>
                      setFormData({ ...formData, inviteCode: e.target.value })
                    }
                    placeholder="bsky-social-xxxxx"
                    required
                  />
                  {selectedProvider?.inviteUrl && (
                    <p
                      className="legal-text"
                      style={{ textAlign: "left", marginTop: "4px" }}
                    >
                      Need an invite code?{" "}
                      <a
                        href={selectedProvider.inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)" }}
                      >
                        Get one here
                      </a>
                    </p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="login-input"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="login-input"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Handle</label>
                <div className="handle-input-group">
                  <input
                    type="text"
                    className="login-input"
                    value={formData.handle}
                    onChange={(e) =>
                      setFormData({ ...formData, handle: e.target.value })
                    }
                    placeholder="username"
                    required
                    style={{ flex: 1 }}
                  />
                  {serverInfo.availableUserDomains &&
                  serverInfo.availableUserDomains.length > 1 ? (
                    <select
                      className="login-input"
                      style={{
                        width: "auto",
                        flex: "0 0 auto",
                        paddingRight: "24px",
                      }}
                      onChange={(e) => {
                        setServerInfo({
                          ...serverInfo,
                          selectedDomain: e.target.value,
                        });
                      }}
                      value={
                        serverInfo.selectedDomain ||
                        serverInfo.availableUserDomains[0]
                      }
                    >
                      {serverInfo.availableUserDomains.map((d) => (
                        <option key={d} value={d}>
                          .{d.startsWith(".") ? d.substring(1) : d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="handle-suffix">
                      {(() => {
                        const d =
                          serverInfo.availableUserDomains?.[0] || "bsky.social";
                        return d.startsWith(".") ? d : `.${d}`;
                      })()}
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary full-width"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <p className="legal-text">
                By creating an account, you agree to {selectedProvider?.name}
                &apos;s{" "}
                {serverInfo.links?.termsOfService ? (
                  <a
                    href={serverInfo.links.termsOfService}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)" }}
                  >
                    Terms of Service
                  </a>
                ) : (
                  "Terms of Service"
                )}
                .
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
