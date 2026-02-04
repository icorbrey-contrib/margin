import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ReplyList from "./ReplyList";
import { Link } from "react-router-dom";
import RichText from "./RichText";
import {
  normalizeAnnotation,
  normalizeHighlight,
  likeAnnotation,
  unlikeAnnotation,
  getReplies,
  createReply,
  deleteReply,
  updateAnnotation,
  updateHighlight,
  getEditHistory,
  deleteAnnotation,
} from "../api/client";
import {
  MessageSquare,
  Heart,
  Trash2,
  Folder,
  Edit2,
  Save,
  X,
  Clock,
} from "lucide-react";
import { HighlightIcon, TrashIcon } from "./Icons";
import ShareMenu from "./ShareMenu";
import UserMeta from "./UserMeta";

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

const truncateUrl = (url, maxLength = 50) => {
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

function SembleBadge() {
  return (
    <div className="semble-badge" title="Added using Semble">
      <span>via Semble</span>
      <img src="/semble-logo.svg" alt="Semble" />
    </div>
  );
}

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
  const [hasEditHistory, setHasEditHistory] = useState(false);

  const isOwner = user?.did && data.author?.did === user.did;
  const isSemble = data.uri?.includes("network.cosmik");
  const highlightedText =
    data.selector?.type === "TextQuoteSelector" ? data.selector.exact : null;
  const fragmentUrl = buildTextFragmentUrl(data.url, data.selector);

  useEffect(() => {
    if (data.uri && !data.color && !data.description) {
      getEditHistory(data.uri)
        .then((history) => {
          if (history?.length > 0) setHasEditHistory(true);
        })
        .catch(() => {});
    }
  }, [data.uri, data.color, data.description]);

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
    } catch {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
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

  const loadReplies = async () => {
    if (!showReplies && replies.length === 0) {
      try {
        const res = await getReplies(data.uri);
        if (res.items) setReplies(res.items);
      } catch (err) {
        console.error("Failed to load replies:", err);
      }
    }
    setShowReplies(!showReplies);
  };

  const handleCollect = () => {
    if (!user) {
      login();
      return;
    }
    if (onAddToCollection) onAddToCollection();
  };

  return (
    <article className="card annotation-card">
      <header className="annotation-header">
        <div className="annotation-header-left">
          <UserMeta author={data.author} createdAt={data.createdAt} />
        </div>
        <div className="annotation-header-right">
          {isSemble && <SembleBadge />}
          {hasEditHistory && !data.color && !data.description && (
            <button
              className="annotation-action action-icon-only"
              onClick={fetchHistory}
              title="View Edit History"
            >
              <Clock size={16} />
            </button>
          )}
          {isOwner && !isSemble && (
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
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h4 className="history-title">Edit History</h4>
            <button
              className="annotation-action action-icon-only"
              onClick={() => setShowHistory(false)}
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
            <span className="annotation-source-title"> · {data.title}</span>
          )}
        </a>

        {highlightedText && (
          <a
            href={fragmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="annotation-highlight"
            style={{ borderLeftColor: data.color || "var(--accent)" }}
          >
            <mark>&ldquo;{highlightedText}&rdquo;</mark>
          </a>
        )}

        {isEditing ? (
          <div className="edit-form">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="reply-input"
              rows={3}
              placeholder="Your annotation..."
            />
            <input
              type="text"
              className="reply-input"
              placeholder="Tags (comma separated)..."
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              style={{ marginTop: "8px" }}
            />
            <div className="action-buttons-end" style={{ marginTop: "8px" }}>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn btn-primary"
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
          <RichText text={data.text} facets={data.facets} />
        )}

        {data.tags?.length > 0 && (
          <div className="annotation-tags">
            {data.tags.map((tag, i) => (
              <Link
                key={i}
                to={`/home?tag=${encodeURIComponent(tag)}`}
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
            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          <button
            className={`annotation-action ${showReplies ? "active" : ""}`}
            onClick={loadReplies}
          >
            <MessageSquare size={16} />
            <span>{replyCount > 0 ? replyCount : "Reply"}</span>
          </button>

          <ShareMenu
            uri={data.uri}
            text={data.title || data.url}
            handle={data.author?.handle}
            type="Annotation"
            url={data.url}
          />

          <button className="annotation-action" onClick={handleCollect}>
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
              <div className="replying-to-banner">
                <span>
                  Replying to @
                  {(replyingTo.creator || replyingTo.author)?.handle ||
                    "unknown"}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="cancel-reply"
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
              rows={2}
            />
            <div className="reply-form-actions">
              <button
                className="btn btn-primary"
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

export function HighlightCard({
  highlight,
  onDelete,
  onAddToCollection,
  onUpdate,
}) {
  const { user, login } = useAuth();
  const data = normalizeHighlight(highlight);
  const highlightedText =
    data.selector?.type === "TextQuoteSelector" ? data.selector.exact : null;
  const fragmentUrl = buildTextFragmentUrl(data.url, data.selector);
  const isOwner = user?.did && data.author?.did === user.did;
  const isSemble = data.uri?.includes("network.cosmik");

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
      if (typeof onUpdate === "function") {
        onUpdate({ ...highlight, color: editColor, tags: tagList });
      }
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  const handleCollect = () => {
    if (!user) {
      login();
      return;
    }
    if (onAddToCollection) onAddToCollection();
  };

  return (
    <article className="card annotation-card">
      <header className="annotation-header">
        <div className="annotation-header-left">
          <UserMeta author={data.author} createdAt={data.createdAt} />
        </div>
        <div className="annotation-header-right">
          {isSemble && (
            <div className="semble-badge" title="Added using Semble">
              <span>via Semble</span>
              <img src="/semble-logo.svg" alt="Semble" />
            </div>
          )}
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
                title="Delete"
              >
                <TrashIcon size={16} />
              </button>
            </>
          )}
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
            <mark>&ldquo;{highlightedText}&rdquo;</mark>
          </a>
        )}

        {isEditing && (
          <div className="color-edit-form">
            <div className="color-picker-wrapper">
              <div
                className="color-preview"
                style={{ backgroundColor: editColor }}
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="color-input"
              />
            </div>
            <input
              type="text"
              className="reply-input"
              placeholder="Tags (comma separated)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              style={{ flex: 1, margin: 0 }}
            />
            <button
              onClick={handleSaveEdit}
              className="btn btn-primary"
              style={{ padding: "0 12px", height: "32px" }}
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
                to={`/home?tag=${encodeURIComponent(tag)}`}
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
            style={{ color: data.color || "#f59e0b", cursor: "default" }}
          >
            <HighlightIcon size={14} /> Highlight
          </span>

          <ShareMenu
            uri={data.uri}
            text={data.title || data.description}
            handle={data.author?.handle}
            type="Highlight"
          />

          <button className="annotation-action" onClick={handleCollect}>
            <Folder size={16} />
            <span>Collect</span>
          </button>
        </div>
      </footer>
    </article>
  );
}
