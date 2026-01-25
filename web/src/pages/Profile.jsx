import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import { getLinkIconType, formatUrl } from "../utils/formatting";
import {
  getUserAnnotations,
  getUserHighlights,
  getUserBookmarks,
  getCollections,
  getProfile,
  getAPIKeys,
  createAPIKey,
  deleteAPIKey,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import EditProfileModal from "../components/EditProfileModal";
import CollectionIcon from "../components/CollectionIcon";
import CollectionRow from "../components/CollectionRow";
import {
  PenIcon,
  HighlightIcon,
  BookmarkIcon,
  BlueskyIcon,
  GithubIcon,
  LinkedinIcon,
  TangledIcon,
  LinkIcon,
} from "../components/Icons";

function LinkIconComponent({ url }) {
  const type = getLinkIconType(url);
  switch (type) {
    case "github":
      return <GithubIcon size={14} />;
    case "bluesky":
      return <BlueskyIcon size={14} />;
    case "linkedin":
      return <LinkedinIcon size={14} />;
    case "tangled":
      return <TangledIcon size={14} />;
    default:
      return <LinkIcon size={14} />;
  }
}

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

export default function Profile() {
  const { handle } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("annotations");
  const [profile, setProfile] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [keysLoading, setKeysLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnProfile = user && (user.did === handle || user.handle === handle);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);

        const bskyPromise = fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
        ).then((res) => (res.ok ? res.json() : null));

        const marginPromise = getProfile(handle).catch(() => null);

        const marginData = await marginPromise;
        let did = handle.startsWith("did:") ? handle : marginData?.did;
        if (!did) {
          const bskyData = await bskyPromise;
          if (bskyData) {
            did = bskyData.did;
            setProfile(bskyData);
          }
        } else {
          if (marginData) {
            setProfile((prev) => ({ ...prev, ...marginData }));
          }
        }

        if (did) {
          const [annData, hlData, bmData, collData] = await Promise.all([
            getUserAnnotations(did),
            getUserHighlights(did).catch(() => ({ items: [] })),
            getUserBookmarks(did).catch(() => ({ items: [] })),
            getCollections(did).catch(() => ({ items: [] })),
          ]);
          setAnnotations(annData.items || []);
          setHighlights(hlData.items || []);
          setBookmarks(bmData.items || []);
          setCollections(collData.items || []);

          const bskyData = await bskyPromise;
          if (bskyData || marginData) {
            setProfile((prev) => ({
              ...(bskyData || {}),
              ...prev,
              ...(marginData || {}),
            }));
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [handle]);

  useEffect(() => {
    if (isOwnProfile && activeTab === "apikeys") {
      loadAPIKeys();
    }
  }, [isOwnProfile, activeTab]);

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

  const displayName = profile?.displayName || profile?.handle || handle;
  const displayHandle =
    profile?.handle || (handle?.startsWith("did:") ? null : handle);
  const avatarUrl = profile?.did
    ? `/api/avatar/${encodeURIComponent(profile.did)}`
    : null;

  const getInitial = () => {
    return (displayName || displayHandle || "??")
      ?.substring(0, 2)
      .toUpperCase();
  };

  const totalItems =
    annotations.length +
    highlights.length +
    bookmarks.length +
    collections.length;

  const renderContent = () => {
    if (activeTab === "annotations") {
      if (annotations.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-state-icon">
              <PenIcon size={32} />
            </div>
            <h3 className="empty-state-title">No annotations</h3>
            <p className="empty-state-text">
              This user hasn&apos;t posted any annotations.
            </p>
          </div>
        );
      }
      return annotations.map((a) => (
        <AnnotationCard key={a.id} annotation={a} />
      ));
    }

    if (activeTab === "highlights") {
      if (highlights.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-state-icon">
              <HighlightIcon size={32} />
            </div>
            <h3 className="empty-state-title">No highlights</h3>
            <p className="empty-state-text">
              This user hasn&apos;t saved any highlights.
            </p>
          </div>
        );
      }
      return highlights.map((h) => <HighlightCard key={h.id} highlight={h} />);
    }

    if (activeTab === "bookmarks") {
      if (bookmarks.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BookmarkIcon size={32} />
            </div>
            <h3 className="empty-state-title">No bookmarks</h3>
            <p className="empty-state-text">
              This user hasn&apos;t bookmarked any pages.
            </p>
          </div>
        );
      }
      return bookmarks.map((b) => <BookmarkCard key={b.uri} bookmark={b} />);
    }

    if (activeTab === "collections") {
      if (collections.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CollectionIcon icon="folder" size={32} />
            </div>
            <h3 className="empty-state-title">No collections</h3>
            <p className="empty-state-text">
              This user hasn&apos;t created any collections.
            </p>
          </div>
        );
      }
      return (
        <div className="collections-list">
          {collections.map((c) => (
            <CollectionRow key={c.uri} collection={c} />
          ))}
        </div>
      );
    }

    if (activeTab === "apikeys" && isOwnProfile) {
      return (
        <div className="api-keys-section">
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>Create API Key</h3>
            <p
              style={{
                color: "var(--text-muted)",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}
            >
              Use API keys to create bookmarks from iOS Shortcuts or other
              tools.
            </p>
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
                Create a key to use with iOS Shortcuts.
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
              href="#"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: 0.5,
                pointerEvents: "none",
                cursor: "default",
              }}
              onClick={(e) => e.preventDefault()}
            >
              <AppleIcon size={16} /> Coming Soon
            </a>
          </div>
        </div>
      );
    }
  };

  const bskyProfileUrl = displayHandle
    ? `https://bsky.app/profile/${displayHandle}`
    : `https://bsky.app/profile/${handle}`;

  return (
    <div className="profile-page">
      <header className="profile-header">
        <a
          href={bskyProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="profile-avatar-link"
        >
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span>{getInitial()}</span>
            )}
          </div>
        </a>
        <div className="profile-info">
          <h1 className="profile-name">{displayName}</h1>
          {displayHandle && (
            <a
              href={bskyProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-bluesky-link"
            >
              <BlueskyIcon size={16} />@{displayHandle}
            </a>
          )}
          <div className="profile-stats">
            <span className="profile-stat">
              <strong>{totalItems}</strong> items
            </span>
            <span className="profile-stat">
              <strong>{annotations.length}</strong> annotations
            </span>
            <span className="profile-stat">
              <strong>{highlights.length}</strong> highlights
            </span>
          </div>

          {(profile?.bio || profile?.website || profile?.links?.length > 0) && (
            <div className="profile-margin-details">
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <div className="profile-links">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-link-chip main-website"
                  >
                    <LinkIcon size={14} /> {formatUrl(profile.website)}
                  </a>
                )}
                {profile.links?.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-link-chip"
                  >
                    <LinkIconComponent url={link} /> {formatUrl(link)}
                  </a>
                ))}
              </div>
            </div>
          )}

          {isOwnProfile && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "1rem", alignSelf: "flex-start" }}
              onClick={() => setShowEditModal(true)}
            >
              Edit Profile
            </button>
          )}
        </div>
      </header>

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      )}

      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "annotations" ? "active" : ""}`}
          onClick={() => setActiveTab("annotations")}
        >
          Annotations ({annotations.length})
        </button>
        <button
          className={`profile-tab ${activeTab === "highlights" ? "active" : ""}`}
          onClick={() => setActiveTab("highlights")}
        >
          Highlights ({highlights.length})
        </button>
        <button
          className={`profile-tab ${activeTab === "bookmarks" ? "active" : ""}`}
          onClick={() => setActiveTab("bookmarks")}
        >
          Bookmarks ({bookmarks.length})
        </button>

        <button
          className={`profile-tab ${activeTab === "collections" ? "active" : ""}`}
          onClick={() => setActiveTab("collections")}
        >
          Collections ({collections.length})
        </button>

        {isOwnProfile && (
          <button
            className={`profile-tab ${activeTab === "apikeys" ? "active" : ""}`}
            onClick={() => setActiveTab("apikeys")}
          >
            <KeyIcon size={14} /> API Keys
          </button>
        )}
      </div>

      {loading && (
        <div className="feed">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div
                className="skeleton skeleton-text"
                style={{ width: "40%" }}
              />
              <div className="skeleton skeleton-text" />
              <div
                className="skeleton skeleton-text"
                style={{ width: "60%" }}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Error loading profile</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      )}

      {!loading && !error && <div className="feed">{renderContent()}</div>}
    </div>
  );
}

function AppleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
