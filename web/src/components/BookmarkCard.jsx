import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  normalizeAnnotation,
  normalizeBookmark,
  likeAnnotation,
  unlikeAnnotation,
  getLikeCount,
  deleteBookmark,
} from "../api/client";
import { HeartIcon, TrashIcon, BookmarkIcon } from "./Icons";
import { Folder } from "lucide-react";
import ShareMenu from "./ShareMenu";
import UserMeta from "./UserMeta";

export default function BookmarkCard({
  bookmark,
  onAddToCollection,
  onDelete,
}) {
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
      } catch {
        /* ignore */
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
    } catch {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(data.uri);
      return;
    }

    if (!confirm("Delete this bookmark?")) return;
    try {
      setDeleting(true);
      const parts = data.uri.split("/");
      const rkey = parts[parts.length - 1];
      await deleteBookmark(rkey);
      window.location.reload();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  let domain = "";
  try {
    if (data.url) domain = new URL(data.url).hostname.replace("www.", "");
  } catch {
    /* ignore */
  }

  return (
    <article className="card annotation-card bookmark-card">
      <header className="annotation-header">
        <div className="annotation-header-left">
          <UserMeta author={data.author} createdAt={data.createdAt} />
        </div>

        <div className="annotation-header-right">
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {data.uri && data.uri.includes("network.cosmik") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  marginRight: "8px",
                }}
                title="Added using Semble"
              >
                <span>via Semble</span>
                <img
                  src="/semble-logo.svg"
                  alt="Semble"
                  style={{ width: "16px", height: "16px" }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: "4px" }}>
              {((isOwner &&
                !(data.uri && data.uri.includes("network.cosmik"))) ||
                onDelete) && (
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
            url={data.url}
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
