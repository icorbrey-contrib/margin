import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ReplyList from "./ReplyList";
import { Link } from "react-router-dom";
import {
  normalizeAnnotation,
  normalizeHighlight,
  deleteAnnotation,
  likeAnnotation,
  unlikeAnnotation,
  getReplies,
  createReply,
  deleteReply,
  getLikeCount,
  updateAnnotation,
  updateHighlight,
  updateBookmark,
  getEditHistory,
} from "../api/client";
import {
  HeartIcon,
  MessageIcon,
  TrashIcon,
  ExternalLinkIcon,
  HighlightIcon,
  BookmarkIcon,
} from "./Icons";
import { Folder, Edit2, Save, X, Clock } from "lucide-react";
import AddToCollectionModal from "./AddToCollectionModal";
import ShareMenu from "./ShareMenu";

function buildTextFragmentUrl(baseUrl, selector) {
  if (!selector || selector.type !== "TextQuoteSelector" || !selector.exact) {
    return baseUrl;
  }

  let fragment = ":~:text=";
  if (selector.prefix) {
    fragment += encodeURIComponent(selector.prefix) + "-,";
  }
  fragment += encodeURIComponent(selector.exact);
  if (selector.suffix) {
    fragment += ",-" + encodeURIComponent(selector.suffix);
  }

  return baseUrl + "#" + fragment;
}

const truncateUrl = (url, maxLength = 60) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const fullPath = parsed.host + parsed.pathname;
    if (fullPath.length > maxLength)
      return fullPath.substring(0, maxLength) + "...";
    return fullPath;
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength) + "..." : url;
  }
};

export default function AnnotationCard({ annotation, onDelete }) {
  const { user, login } = useAuth();
  const data = normalizeAnnotation(annotation);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text || "");
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [replies, setReplies] = useState([]);
  const [replyCount, setReplyCount] = useState(0);
  const [showReplies, setShowReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const isOwner = user?.did && data.author?.did === user.did;

  const [hasEditHistory, setHasEditHistory] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const repliesRes = await getReplies(data.uri);
        if (mounted && repliesRes.items) {
          setReplies(repliesRes.items);
          setReplyCount(repliesRes.items.length);
        }

        const likeRes = await getLikeCount(data.uri);
        if (mounted) {
          if (likeRes.count !== undefined) {
            setLikeCount(likeRes.count);
          }
          if (likeRes.liked !== undefined) {
            setIsLiked(likeRes.liked);
          }
        }

        if (!data.color && !data.description) {
          try {
            const history = await getEditHistory(data.uri);
            if (mounted && history && history.length > 0) {
              setHasEditHistory(true);
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    }
    if (data.uri) {
      fetchData();
    }
    return () => {
      mounted = false;
    };
  }, [data.uri]);

  const fetchHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    try {
      setLoadingHistory(true);
      setShowHistory(true);
      const history = await getEditHistory(data.uri);
      setEditHistory(history);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePostReply = async (parentReply) => {
    if (!replyText.trim()) return;

    try {
      setPosting(true);
      const parentUri = parentReply
        ? parentReply.id || parentReply.uri
        : data.uri;
      const parentCid = parentReply
        ? parentReply.cid
        : annotation.cid || data.cid;

      await createReply({
        parentUri,
        parentCid: parentCid || "",
        rootUri: data.uri,
        rootCid: annotation.cid || data.cid || "",
        text: replyText,
      });

      setReplyText("");
      setReplyingTo(null);

      const res = await getReplies(data.uri);
      if (res.items) {
        setReplies(res.items);
        setReplyCount(res.items.length);
      }
    } catch (err) {
      alert("Failed to post reply: " + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await updateAnnotation(data.uri, editText, data.tags);
      setIsEditing(false);
      if (annotation.body) annotation.body.value = editText;
      else if (annotation.text) annotation.text = editText;
    } catch (err) {
      alert("Failed to update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString, simple = true) => {
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
    if (simple)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    return date.toLocaleString();
  };

  const authorDisplayName = data.author?.displayName || data.author?.handle;
  const authorHandle = data.author?.handle;
  const authorAvatar = data.author?.avatar;
  const authorDid = data.author?.did;
  const marginProfileUrl = authorDid ? `/profile/${authorDid}` : null;
  const highlightedText =
    data.selector?.type === "TextQuoteSelector" ? data.selector.exact : null;
  const fragmentUrl = buildTextFragmentUrl(data.url, data.selector);

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
        const cid = annotation.cid || data.cid || "";
        if (data.uri && cid) await likeAnnotation(data.uri, cid);
      }
    } catch (err) {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      console.error("Failed to toggle like:", err);
    }
  };

  const handleShare = async () => {
    const uriParts = data.uri.split("/");
    const did = uriParts[2];
    const rkey = uriParts[uriParts.length - 1];
    const shareUrl = `${window.location.origin}/at/${did}/${rkey}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Margin Annotation",
          text: data.text?.substring(0, 100),
          url: shareUrl,
        });
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied!");
      } catch {
        prompt("Copy this link:", shareUrl);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this annotation? This cannot be undone.")) return;
    try {
      setDeleting(true);
      const parts = data.uri.split("/");
      const rkey = parts[parts.length - 1];
      await deleteAnnotation(rkey);
      if (onDelete) onDelete(data.uri);
      else window.location.reload();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="card annotation-card">
      <header className="annotation-header">
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
                @{authorHandle} <ExternalLinkIcon size={12} />
              </a>
            )}
          </div>
          <div className="annotation-time">{formatDate(data.createdAt)}</div>
        </div>
        <div className="action-buttons">
          {}
          {hasEditHistory && !data.color && !data.description && (
            <button
              className="annotation-edit-btn"
              onClick={fetchHistory}
              title="View Edit History"
            >
              <Clock size={16} />
            </button>
          )}
          {}
          {isOwner && (
            <>
              {!data.color && !data.description && (
                <button
                  className="annotation-edit-btn"
                  onClick={() => setIsEditing(!isEditing)}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
              )}
              <button
                className="annotation-delete"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete"
              >
                <TrashIcon size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {}
      {}
      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h4 className="history-title">Edit History</h4>
            <button
              className="history-close-btn"
              onClick={() => setShowHistory(false)}
              title="Close History"
            >
              <X size={14} />
            </button>
          </div>
          {loadingHistory ? (
            <div className="history-status">Loading history...</div>
          ) : editHistory.length === 0 ? (
            <div className="history-status">No edit history found.</div>
          ) : (
            <ul className="history-list">
              {editHistory.map((edit) => (
                <li key={edit.id} className="history-item">
                  <div className="history-date">
                    {new Date(edit.editedAt).toLocaleString()}
                  </div>
                  <div className="history-content">{edit.previousContent}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="annotation-source"
      >
        {truncateUrl(data.url)}
        {data.title && (
          <span className="annotation-source-title"> • {data.title}</span>
        )}
      </a>

      {highlightedText && (
        <a
          href={fragmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="annotation-highlight"
        >
          <mark>"{highlightedText}"</mark>
        </a>
      )}

      {isEditing ? (
        <div className="mt-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="reply-input"
            rows={3}
            style={{ marginBottom: "8px" }}
          />
          <div className="action-buttons-end">
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save size={14} /> Save
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        data.text && <p className="annotation-text">{data.text}</p>
      )}

      {data.tags?.length > 0 && (
        <div className="annotation-tags">
          {data.tags.map((tag, i) => (
            <span key={i} className="annotation-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <footer className="annotation-actions">
        <button
          className={`annotation-action ${isLiked ? "liked" : ""}`}
          onClick={handleLike}
        >
          <HeartIcon filled={isLiked} size={16} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          className={`annotation-action ${showReplies ? "active" : ""}`}
          onClick={() => setShowReplies(!showReplies)}
        >
          <MessageIcon size={16} />
          <span>{replyCount > 0 ? `${replyCount}` : "Reply"}</span>
        </button>
        <ShareMenu uri={data.uri} text={data.text} />
        <button
          className="annotation-action"
          onClick={() => {
            if (!user) {
              login();
              return;
            }
            setShowAddToCollection(true);
          }}
        >
          <Folder size={16} />
          <span>Collect</span>
        </button>
      </footer>

      {showReplies && (
        <div className="inline-replies">
          <ReplyList
            replies={replies}
            rootUri={data.uri}
            user={user}
            onReply={(reply) => setReplyingTo(reply)}
            onDelete={async (reply) => {
              if (!confirm("Delete this reply?")) return;
              try {
                await deleteReply(reply.id || reply.uri);
                const res = await getReplies(data.uri);
                if (res.items) {
                  setReplies(res.items);
                  setReplyCount(res.items.length);
                }
              } catch (err) {
                alert("Failed to delete: " + err.message);
              }
            }}
            isInline={true}
          />

          <div className="reply-form">
            {replyingTo && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                <span>
                  Replying to @
                  {(replyingTo.creator || replyingTo.author)?.handle ||
                    "unknown"}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: "2px 6px",
                  }}
                >
                  ×
                </button>
              </div>
            )}
            <textarea
              className="reply-input"
              placeholder={
                replyingTo
                  ? `Reply to @${(replyingTo.creator || replyingTo.author)?.handle}...`
                  : "Write a reply..."
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={(e) => {
                if (!user) {
                  e.target.blur();
                  login();
                }
              }}
              rows={2}
            />
            <div className="action-buttons-end">
              <button
                className="btn btn-primary btn-sm"
                disabled={posting || !replyText.trim()}
                onClick={() => {
                  if (!user) {
                    login();
                    return;
                  }
                  handlePostReply(replyingTo);
                }}
              >
                {posting ? "Posting..." : "Reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddToCollectionModal
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        annotationUri={data.uri}
      />
    </article>
  );
}

export function HighlightCard({ highlight, onDelete }) {
  const { user, login } = useAuth();
  const data = normalizeHighlight(highlight);
  const highlightedText =
    data.selector?.type === "TextQuoteSelector" ? data.selector.exact : null;
  const fragmentUrl = buildTextFragmentUrl(data.url, data.selector);
  const isOwner = user?.did && data.author?.did === user.did;
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editColor, setEditColor] = useState(data.color || "#f59e0b");

  const handleSaveEdit = async () => {
    try {
      await updateHighlight(data.uri, editColor, []);
      setIsEditing(false);

      if (highlight.color) highlight.color = editColor;
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  const formatDate = (dateString, simple = true) => {
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
    if (simple)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    return date.toLocaleString();
  };

  return (
    <article className="card annotation-card">
      <header className="annotation-header">
        <Link
          to={data.author?.did ? `/profile/${data.author.did}` : "#"}
          className="annotation-avatar-link"
        >
          <div className="annotation-avatar">
            {data.author?.avatar ? (
              <img src={data.author.avatar} alt="avatar" />
            ) : (
              <span>??</span>
            )}
          </div>
        </Link>
        <div className="annotation-meta">
          <Link to="#" className="annotation-author-link">
            <span className="annotation-author">
              {data.author?.displayName || "Unknown"}
            </span>
          </Link>
          <div className="annotation-time">{formatDate(data.createdAt)}</div>
        </div>
        <div className="action-buttons">
          {isOwner && (
            <>
              <button
                className="annotation-edit-btn"
                onClick={() => setIsEditing(!isEditing)}
                title="Edit Color"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="annotation-delete"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete && onDelete(highlight.id || highlight.uri);
                }}
              >
                <TrashIcon size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="annotation-source"
      >
        {truncateUrl(data.url)}
      </a>

      {highlightedText && (
        <a
          href={fragmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="annotation-highlight"
          style={{
            borderLeftColor: isEditing ? editColor : data.color || "#f59e0b",
          }}
        >
          <mark>"{highlightedText}"</mark>
        </a>
      )}

      {isEditing && (
        <div
          className="mt-3"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span style={{ fontSize: "0.9rem" }}>Color:</span>
          <input
            type="color"
            value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            style={{
              height: "32px",
              width: "64px",
              padding: 0,
              border: "none",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
            }}
          />
          <button
            onClick={handleSaveEdit}
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
          >
            Save
          </button>
        </div>
      )}

      <footer className="annotation-actions">
        <span
          className="annotation-action annotation-type-badge"
          style={{ color: data.color || "#f59e0b" }}
        >
          <HighlightIcon size={14} /> Highlight
        </span>
        <ShareMenu uri={data.uri} text={highlightedText} />
        <button
          className="annotation-action"
          onClick={() => {
            if (!user) {
              login();
              return;
            }
            setShowAddToCollection(true);
          }}
        >
          <Folder size={16} />
          <span>Collect</span>
        </button>
      </footer>
      <AddToCollectionModal
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        annotationUri={data.uri}
      />
    </article>
  );
}
