import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  normalizeAnnotation,
  normalizeBookmark,
  likeAnnotation,
  unlikeAnnotation,
  getLikeCount,
  deleteBookmark,
} from "../api/client";
import { HeartIcon, TrashIcon, ExternalLinkIcon, BookmarkIcon } from "./Icons";
import { Folder } from "lucide-react";
import ShareMenu from "./ShareMenu";

export default function BookmarkCard({ bookmark, onAddToCollection }) {
  const { user, login } = useAuth();
  const raw = bookmark;
  const data =
    raw.type === "Bookmark" ? normalizeBookmark(raw) : normalizeAnnotation(raw);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = user?.did && data.author?.did === user.did;

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const likeRes = await getLikeCount(data.uri);
        if (mounted) {
          if (likeRes.count !== undefined) setLikeCount(likeRes.count);
          if (likeRes.liked !== undefined) setIsLiked(likeRes.liked);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    }
    if (data.uri) fetchData();
    return () => {
      mounted = false;
    };
  }, [data.uri]);

  const handleLike = async () => {
    if (!user) {
      login();
      return;
    }
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        await unlikeAnnotation(data.uri);
      } else {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        const cid = data.cid || "";
        if (data.uri && cid) await likeAnnotation(data.uri, cid);
      }
    } catch (err) {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this bookmark?")) return;
    try {
      setDeleting(true);
      const parts = data.uri.split("/");
      const rkey = parts[parts.length - 1];
      await deleteBookmark(rkey);
      if (onDelete) onDelete(data.uri);
      else window.location.reload();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  let domain = "";
  try {
    if (data.url) domain = new URL(data.url).hostname.replace("www.", "");
  } catch {}

  const authorDisplayName = data.author?.displayName || data.author?.handle;
  const authorHandle = data.author?.handle;
  const authorAvatar = data.author?.avatar;
  const authorDid = data.author?.did;
  const marginProfileUrl = authorDid ? `/profile/${authorDid}` : null;

  return (
    <article className="card bookmark-card">
      <header className="annotation-header">
        <div className="annotation-header-left">
          <Link to={marginProfileUrl || "#"} className="annotation-avatar-link">
            <div className="annotation-avatar">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorDisplayName} />
              ) : (
                <span>
                  {(authorDisplayName || authorHandle || "??")
                    ?.substring(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
          </Link>
          <div className="annotation-meta">
            <div className="annotation-author-row">
              <Link
                to={marginProfileUrl || "#"}
                className="annotation-author-link"
              >
                <span className="annotation-author">{authorDisplayName}</span>
              </Link>
              {authorHandle && (
                <a
                  href={`https://bsky.app/profile/${authorHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="annotation-handle"
                >
                  @{authorHandle}
                </a>
              )}
            </div>
            <div className="annotation-time">{formatDate(data.createdAt)}</div>
          </div>
        </div>

        <div className="annotation-header-right">
          <div style={{ display: "flex", gap: "4px" }}>
            {isOwner && (
              <button
                className="annotation-action action-icon-only"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete"
              >
                <TrashIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="annotation-content">
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bookmark-preview"
        >
          <div className="bookmark-preview-content">
            <div className="bookmark-preview-site">
              <BookmarkIcon size={14} />
              <span>{domain}</span>
            </div>
            <h3 className="bookmark-preview-title">{data.title || data.url}</h3>
            {data.description && (
              <p className="bookmark-preview-desc">{data.description}</p>
            )}
          </div>
        </a>

        {data.tags?.length > 0 && (
          <div className="annotation-tags">
            {data.tags.map((tag, i) => (
              <span key={i} className="annotation-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <footer className="annotation-actions">
        <div className="annotation-actions-left">
          <button
            className={`annotation-action ${isLiked ? "liked" : ""}`}
            onClick={handleLike}
          >
            <HeartIcon filled={isLiked} size={16} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <ShareMenu
            uri={data.uri}
            text={data.title || data.description}
            handle={data.author?.handle}
            type="Bookmark"
          />
          <button
            className="annotation-action"
            onClick={() => {
              if (!user) {
                login();
                return;
              }
              if (onAddToCollection) onAddToCollection();
            }}
          >
            <Folder size={16} />
            <span>Collect</span>
          </button>
        </div>
      </footer>
    </article>
  );
}
