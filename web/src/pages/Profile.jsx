import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import { getLinkIconType, formatUrl } from "../utils/formatting";
import {
  getUserAnnotations,
  getUserHighlights,
  getUserBookmarks,
  getCollections,
  getProfile,
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

export default function Profile() {
  const { handle: routeHandle } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("annotations");
  const [profile, setProfile] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [collections, setCollections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handle = routeHandle || user?.did || user?.handle;
  const isOwnProfile = user && (user.did === handle || user.handle === handle);

  useEffect(() => {
    if (!handle) return;
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
            const merged = {
              ...(bskyData || {}),
            };
            if (marginData) {
              merged.did = marginData.did || merged.did;
              if (marginData.displayName)
                merged.displayName = marginData.displayName;
              if (marginData.avatar) merged.avatar = marginData.avatar;
              if (marginData.bio) merged.bio = marginData.bio;
              if (marginData.website) merged.website = marginData.website;
              if (marginData.links?.length) merged.links = marginData.links;
            }
            setProfile(merged);
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

  if (authLoading) {
    return (
      <div className="profile-page">
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
      </div>
    );
  }

  if (!handle) {
    return <Navigate to="/login" replace />;
  }

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
          <h3 className="empty-state-title">Error loading profile</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="feed-container">
          <div className="feed">{renderContent()}</div>
        </div>
      )}
    </div>
  );
}
