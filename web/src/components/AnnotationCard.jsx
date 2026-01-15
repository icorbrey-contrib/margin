import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ReplyList from "./ReplyList";
import { Link } from "react-router-dom";
import {
  normalizeAnnotation,
  normalizeHighlight,
  normalizeBookmark,
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

export default function AnnotationCard({
  annotation,
  onDelete,
  onAddToCollection,
}) {
  const { user, login } = useAuth();
  const data = normalizeAnnotation(annotation);

  const [likeCount, setLikeCount] = useState(data.likeCount || 0);
  const [isLiked, setIsLiked] = useState(data.viewerHasLiked || false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text || "");
  const [editTags, setEditTags] = useState(data.tags?.join(", ") || "");
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [replies, setReplies] = useState([]);
  const [replyCount, setReplyCount] = useState(data.replyCount || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const isOwner = user?.did && data.author?.did === user.did;

  const [hasEditHistory, setHasEditHistory] = useState(false);

  useEffect(() => {}, []);

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
      const tagList = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await updateAnnotation(data.uri, editText, tagList);
      setIsEditing(false);
      if (annotation.body) annotation.body.value = editText;
      else if (annotation.text) annotation.text = editText;
      if (annotation.tags) annotation.tags = tagList;
      data.tags = tagList;
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
            {hasEditHistory && !data.color && !data.description && (
              <button
                className="annotation-action action-icon-only"
                onClick={fetchHistory}
                title="View Edit History"
              >
                <Clock size={16} />
              </button>
            )}

            {isOwner && (
              <>
                {!data.color && !data.description && (
                  <button
                    className="annotation-action action-icon-only"
                    onClick={() => setIsEditing(!isEditing)}
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  className="annotation-action action-icon-only"
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete"
                >
                  <TrashIcon size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

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

      <div className="annotation-content">
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
            style={{
              borderLeftColor: data.color || "var(--accent)",
            }}
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
            <input
              type="text"
              className="reply-input"
              placeholder="Tags (comma separated)..."
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
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
              <Link
                key={i}
                to={`/?tag=${encodeURIComponent(tag)}`}
                className="annotation-tag"
              >
                #{tag}
              </Link>
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
          <button
            className={`annotation-action ${showReplies ? "active" : ""}`}
            onClick={async () => {
              if (!showReplies && replies.length === 0) {
                try {
                  const res = await getReplies(data.uri);
                  if (res.items) setReplies(res.items);
                } catch (err) {
                  console.error("Failed to load replies:", err);
                }
              }
              setShowReplies(!showReplies);
            }}
          >
            <MessageIcon size={16} />
            <span>{replyCount > 0 ? `${replyCount}` : "Reply"}</span>
          </button>
          <ShareMenu
            uri={data.uri}
            text={data.title || data.url}
            handle={data.author?.handle}
            type="Annotation"
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
    </article>
  );
}

export function HighlightCard({ highlight, onDelete, onAddToCollection }) {
  const { user, login } = useAuth();
  const data = normalizeHighlight(highlight);
  const highlightedText =
    data.selector?.type === "TextQuoteSelector" ? data.selector.exact : null;
  const fragmentUrl = buildTextFragmentUrl(data.url, data.selector);
  const isOwner = user?.did && data.author?.did === user.did;
  const [isEditing, setIsEditing] = useState(false);
  const [editColor, setEditColor] = useState(data.color || "#f59e0b");
  const [editTags, setEditTags] = useState(data.tags?.join(", ") || "");

  const handleSaveEdit = async () => {
    try {
      const tagList = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateHighlight(data.uri, editColor, tagList);
      setIsEditing(false);

      if (highlight.color) highlight.color = editColor;
      if (highlight.tags) highlight.tags = tagList;
      else highlight.value = { ...highlight.value, tags: tagList };
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
        <div className="annotation-header-left">
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
            {data.author?.handle && (
              <a
                href={`https://bsky.app/profile/${data.author.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="annotation-handle"
              >
                @{data.author.handle}
              </a>
            )}
          </div>
        </div>

        <div className="annotation-header-right">
          <div style={{ display: "flex", gap: "4px" }}>
            {isOwner && (
              <>
                <button
                  className="annotation-action action-icon-only"
                  onClick={() => setIsEditing(!isEditing)}
                  title="Edit Color"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="annotation-action action-icon-only"
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
        </div>
      </header>

      <div className="annotation-content">
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
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              padding: "8px",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="color-picker-compact"
              style={{
                position: "relative",
                width: "28px",
                height: "28px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  backgroundColor: editColor,
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  border: "2px solid var(--bg-card)",
                  boxShadow: "0 0 0 1px var(--border)",
                }}
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                }}
                title="Change Color"
              />
            </div>

            <input
              type="text"
              className="reply-input"
              placeholder="e.g. tag1, tag2"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              style={{
                margin: 0,
                flex: 1,
                fontSize: "0.9rem",
                padding: "6px 10px",
                height: "32px",
                border: "none",
                background: "transparent",
              }}
            />

            <button
              onClick={handleSaveEdit}
              className="btn btn-primary btn-sm"
              style={{ padding: "0 10px", height: "32px", minWidth: "auto" }}
              title="Save"
            >
              <Save size={16} />
            </button>
          </div>
        )}

        {data.tags?.length > 0 && (
          <div className="annotation-tags">
            {data.tags.map((tag, i) => (
              <Link
                key={i}
                to={`/?tag=${encodeURIComponent(tag)}`}
                className="annotation-tag"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="annotation-actions">
        <div className="annotation-actions-left">
          <span
            className="annotation-action"
            style={{
              color: data.color || "#f59e0b",
              background: "none",
              paddingLeft: 0,
            }}
          >
            <HighlightIcon size={14} /> Highlight
          </span>
          <ShareMenu
            uri={data.uri}
            text={data.title || data.description}
            handle={data.author?.handle}
            type="Highlight"
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
