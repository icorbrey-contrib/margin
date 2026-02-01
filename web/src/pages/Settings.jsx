import { useState, useEffect } from "react";
import { getAPIKeys, createAPIKey, deleteAPIKey } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Monitor, Columns, Layout } from "lucide-react";

function KeyIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function AppleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

export default function Settings() {
  const { isAuthenticated, loading } = useAuth();
  const { layout, setLayout } = useTheme();
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [keysLoading, setKeysLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAPIKeys();
    }
  }, [isAuthenticated]);

  const loadAPIKeys = async () => {
    setKeysLoading(true);
    try {
      const data = await getAPIKeys();
      setApiKeys(data.keys || []);
    } catch {
      setApiKeys([]);
    } finally {
      setKeysLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const data = await createAPIKey(newKeyName.trim());
      setNewKey(data.key);
      setNewKeyName("");
      loadAPIKeys();
    } catch (err) {
      alert("Failed to create key: " + err.message);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!confirm("Delete this API key? This cannot be undone.")) return;
    try {
      await deleteAPIKey(id);
      loadAPIKeys();
    } catch (err) {
      alert("Failed to delete key: " + err.message);
    }
  };

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-description">Manage your preferences and API keys.</p>

      <div className="settings-section layout-settings-section">
        <h2>Layout</h2>
        <div className="layout-options">
          <button
            className={`layout-option ${layout === "sidebar" ? "active" : ""}`}
            onClick={() => setLayout("sidebar")}
          >
            <Columns size={24} />
            <div className="layout-info">
              <h3>Three Column (Default)</h3>
              <p>Sidebars for navigation and tools</p>
            </div>
          </button>
          <button
            className={`layout-option ${layout === "topnav" ? "active" : ""}`}
            onClick={() => setLayout("topnav")}
          >
            <Layout size={24} />
            <div className="layout-info">
              <h3>Top Navigation</h3>
              <p>Cleaner view with top menu</p>
            </div>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>API Keys</h2>
        <p className="section-description">
          Use API keys to create bookmarks from iOS Shortcuts or other tools.
        </p>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Create API Key</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., iOS Shortcut)"
              className="input"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleCreateKey}>
              Generate
            </button>
          </div>
          {newKey && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
              }}
            >
              <p
                style={{
                  color: "var(--text-success)",
                  fontWeight: 500,
                  marginBottom: "0.5rem",
                }}
              >
                ✓ Key created! Copy it now, you won&apos;t see it again.
              </p>
              <code
                style={{
                  display: "block",
                  padding: "0.75rem",
                  background: "var(--bg-tertiary)",
                  borderRadius: "4px",
                  wordBreak: "break-all",
                  fontSize: "0.8rem",
                }}
              >
                {newKey}
              </code>
              <button
                className="btn btn-secondary"
                style={{ marginTop: "0.5rem" }}
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  alert("Copied!");
                }}
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>

        {keysLoading ? (
          <div className="card">
            <div className="skeleton skeleton-text" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <KeyIcon size={32} />
            </div>
            <h3 className="empty-state-title">No API keys</h3>
            <p className="empty-state-text">
              Create a key to use with customized tools.
            </p>
          </div>
        ) : (
          <div className="card">
            <h3 style={{ marginBottom: "1rem" }}>Your API Keys</h3>
            {apiKeys.map((key) => (
              <div
                key={key.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <strong>{key.name}</strong>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt &&
                      ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.5rem",
                    color: "#ef4444",
                    border: "1px solid #ef4444",
                  }}
                  onClick={() => handleDeleteKey(key.id)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>iOS Shortcut</h3>
          <p
            style={{
              color: "var(--text-muted)",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            Save bookmarks from Safari&apos;s share sheet.
          </p>
          <a
            href="https://www.icloud.com/shortcuts/21c87edf29b046db892c9e57dac6d1fd"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AppleIcon size={16} /> Get Shortcut
          </a>
        </div>
      </div>

      <style>{`
                .settings-page {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .page-title {
                    font-size: 1.8rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                .page-description {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }
                .settings-section {
                    margin-bottom: 3rem;
                }
                .settings-section h2 {
                    font-size: 1.2rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border);
                }
                .section-description {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                    font-size: 0.9rem;
                }
                .layout-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .layout-option {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.5rem;
                    background: var(--bg-card);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    color: var(--text-primary);
                }
                .layout-option:hover {
                    border-color: var(--border-hover);
                    background: var(--bg-hover);
                }
                .layout-option.active {
                    border-color: var(--accent);
                    background: var(--bg-secondary);
                }
                .layout-option.active svg {
                    color: var(--accent);
                }
                .layout-info h3 {
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                }
                .layout-info p {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin: 0;
                }
                @media (max-width: 600px) {
                    .layout-options {
                        grid-template-columns: 1fr;
                    }
                }
                @media (max-width: 768px) {
                    .layout-settings-section {
                        display: none;
                    }
                }
            `}</style>
    </div>
  );
}
