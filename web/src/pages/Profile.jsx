import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import {
  getUserAnnotations,
  getUserHighlights,
  getUserBookmarks,
  getCollections,
} from "../api/client";
import CollectionIcon from "../components/CollectionIcon";
import CollectionRow from "../components/CollectionRow";
import {
  PenIcon,
  HighlightIcon,
  BookmarkIcon,
  BlueskyIcon,
} from "../components/Icons";

export default function Profile() {
  const { handle } = useParams();
  const [activeTab, setActiveTab] = useState("annotations");
  const [profile, setProfile] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);

        const profileRes = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
        );
        let did = handle;
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          did = profileData.did;
        }

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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [handle]);

  const displayName = profile?.displayName || profile?.handle || handle;
  const displayHandle =
    profile?.handle || (handle?.startsWith("did:") ? null : handle);
  const avatarUrl = profile?.avatar;

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
              This user hasn't posted any annotations.
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
              This user hasn't saved any highlights.
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
              This user hasn't bookmarked any pages.
            </p>
          </div>
        );
      }
      return bookmarks.map((b) => <BookmarkCard key={b.id} annotation={b} />);
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
              This user hasn't bookmarked any pages.
            </p>
          </div>
        );
      }
      return bookmarks.map((b) => <BookmarkCard key={b.id} annotation={b} />);
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
              This user hasn't created any collections.
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
        </div>
      </header>

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
