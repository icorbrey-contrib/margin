import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import { getUserTargetItems } from "../api/client";
import {
  PenIcon,
  HighlightIcon,
  SearchIcon,
  BlueskyIcon,
} from "../components/Icons";

export default function UserUrl() {
  const { handle, "*": urlPath } = useParams();
  const targetUrl = urlPath || "";

  const [profile, setProfile] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function fetchData() {
      if (!targetUrl) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const profileRes = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
        );
        let did = handle;
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          did = profileData.did;
        }

        const data = await getUserTargetItems(did, targetUrl);
        setAnnotations(data.annotations || []);
        setHighlights(data.highlights || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [handle, targetUrl]);

  const displayName = profile?.displayName || profile?.handle || handle;
  const displayHandle =
    profile?.handle || (handle?.startsWith("did:") ? null : handle);
  const avatarUrl = profile?.avatar;

  const getInitial = () => {
    return (displayName || displayHandle || "??")
      ?.substring(0, 2)
      .toUpperCase();
  };

  const totalItems = annotations.length + highlights.length;
  const bskyProfileUrl = displayHandle
    ? `https://bsky.app/profile/${displayHandle}`
    : `https://bsky.app/profile/${handle}`;

  const renderResults = () => {
    if (activeTab === "annotations" && annotations.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">
            <PenIcon size={32} />
          </div>
          <h3 className="empty-state-title">No annotations</h3>
        </div>
      );
    }

    if (activeTab === "highlights" && highlights.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">
            <HighlightIcon size={32} />
          </div>
          <h3 className="empty-state-title">No highlights</h3>
        </div>
      );
    }

    return (
      <>
        {(activeTab === "all" || activeTab === "annotations") &&
          annotations.map((a) => <AnnotationCard key={a.uri} annotation={a} />)}
        {(activeTab === "all" || activeTab === "highlights") &&
          highlights.map((h) => <HighlightCard key={h.uri} highlight={h} />)}
      </>
    );
  };

  if (!targetUrl) {
    return (
      <div className="user-url-page">
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchIcon size={32} />
          </div>
          <h3 className="empty-state-title">No URL specified</h3>
          <p className="empty-state-text">
            Please provide a URL to view annotations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-url-page">
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
        </div>
      </header>

      <div className="url-target-info">
        <span className="url-target-label">Annotations on:</span>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="url-target-link"
        >
          {targetUrl}
        </a>
      </div>

      {loading && (
        <div className="feed-container">
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
        </div>
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Error</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      )}

      {!loading && !error && totalItems === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchIcon size={32} />
          </div>
          <h3 className="empty-state-title">No items found</h3>
          <p className="empty-state-text">
            {displayName} hasn&apos;t annotated this page yet.
          </p>
        </div>
      )}

      {!loading && !error && totalItems > 0 && (
        <>
          <div className="url-results-header">
            <h2 className="feed-title">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </h2>
            <div className="feed-filters">
              <button
                className={`filter-tab ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All ({totalItems})
              </button>
              <button
                className={`filter-tab ${activeTab === "annotations" ? "active" : ""}`}
                onClick={() => setActiveTab("annotations")}
              >
                Annotations ({annotations.length})
              </button>
              <button
                className={`filter-tab ${activeTab === "highlights" ? "active" : ""}`}
                onClick={() => setActiveTab("highlights")}
              >
                Highlights ({highlights.length})
              </button>
            </div>
          </div>
          <div className="feed-container">
            <div className="feed">{renderResults()}</div>
          </div>
        </>
      )}
    </div>
  );
}
