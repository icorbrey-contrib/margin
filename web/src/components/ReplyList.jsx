import { Link } from "react-router-dom";
import { MessageSquare, Trash2, Reply } from "lucide-react";

function formatDate(dateString) {
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
  return date.toLocaleDateString();
}

function ReplyItem({ reply, depth = 0, user, onReply, onDelete, isInline }) {
  const author = reply.creator || reply.author || {};
  const isReplyOwner = user?.did && author.did === user.did;

  const containerStyle = isInline
    ? {
        display: "flex",
        gap: "10px",
        padding: depth > 0 ? "10px 12px 10px 16px" : "12px 16px",
        marginLeft: depth * 20,
        borderLeft: depth > 0 ? "2px solid var(--accent-subtle)" : "none",
        background: depth > 0 ? "rgba(168, 85, 247, 0.03)" : "transparent",
      }
    : {
        marginLeft: depth * 24,
        borderLeft: depth > 0 ? "2px solid var(--accent-subtle)" : "none",
        paddingLeft: depth > 0 ? "16px" : "0",
        background: depth > 0 ? "rgba(168, 85, 247, 0.02)" : "transparent",
        marginBottom: "12px",
      };

  const avatarSize = isInline ? (depth > 0 ? 28 : 32) : depth > 0 ? 28 : 36;

  return (
    <div key={reply.id || reply.uri}>
      <div
        className={isInline ? "inline-reply" : "reply-card-threaded"}
        style={containerStyle}
      >
        {isInline ? (
          <>
            <Link
              to={`/profile/${author.handle}`}
              className="inline-reply-avatar"
              style={{
                width: avatarSize,
                height: avatarSize,
                minWidth: avatarSize,
              }}
            >
              {author.avatar ? (
                <img
                  src={author.avatar}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--accent), #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: depth > 0 ? "0.65rem" : "0.75rem",
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  {(author.displayName ||
                    author.handle ||
                    "?")[0].toUpperCase()}
                </span>
              )}
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: depth > 0 ? "0.8rem" : "0.85rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {author.displayName || author.handle}
                </span>
                <Link
                  to={`/profile/${author.handle}`}
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: depth > 0 ? "0.75rem" : "0.8rem",
                    textDecoration: "none",
                  }}
                >
                  @{author.handle}
                </Link>
                <span
                  style={{ color: "var(--text-tertiary)", fontSize: "0.7rem" }}
                >
                  ·
                </span>
                <span
                  style={{ color: "var(--text-tertiary)", fontSize: "0.7rem" }}
                >
                  {formatDate(reply.created || reply.createdAt)}
                </span>

                <div
                  style={{ marginLeft: "auto", display: "flex", gap: "4px" }}
                >
                  <button
                    onClick={() => onReply(reply)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: "2px 6px",
                      fontSize: "0.7rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      borderRadius: "4px",
                    }}
                  >
                    <MessageSquare size={11} />
                  </button>
                  {isReplyOwner && (
                    <button
                      onClick={() => onDelete(reply)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        padding: "2px 6px",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        borderRadius: "4px",
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: depth > 0 ? "0.85rem" : "0.9rem",
                  lineHeight: 1.5,
                  color: "var(--text-primary)",
                }}
              >
                {reply.text || reply.body?.value}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="reply-header">
              <Link
                to={`/profile/${author.handle}`}
                className="reply-avatar-link"
              >
                <div
                  className="reply-avatar"
                  style={{ width: avatarSize, height: avatarSize }}
                >
                  {author.avatar ? (
                    <img
                      src={author.avatar}
                      alt={author.displayName || author.handle}
                    />
                  ) : (
                    <span>
                      {(author.displayName ||
                        author.handle ||
                        "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </Link>
              <div className="reply-meta">
                <span className="reply-author">
                  {author.displayName || author.handle}
                </span>
                {author.handle && (
                  <Link
                    to={`/profile/${author.handle}`}
                    className="reply-handle"
                  >
                    @{author.handle}
                  </Link>
                )}
                <span className="reply-dot">·</span>
                <span className="reply-time">
                  {formatDate(reply.created || reply.createdAt)}
                </span>
              </div>
              <div className="reply-actions">
                <button
                  className="reply-action-btn"
                  onClick={() => onReply(reply)}
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
                {isReplyOwner && (
                  <button
                    className="reply-action-btn reply-action-delete"
                    onClick={() => onDelete(reply)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <p className="reply-text">{reply.text || reply.body?.value}</p>
          </>
        )}
      </div>
      {reply.children &&
        reply.children.map((child) => (
          <ReplyItem
            key={child.id || child.uri}
            reply={child}
            depth={depth + 1}
            user={user}
            onReply={onReply}
            onDelete={onDelete}
            isInline={isInline}
          />
        ))}
    </div>
  );
}

export default function ReplyList({
  replies,
  rootUri,
  user,
  onReply,
  onDelete,
  isInline = false,
}) {
  if (!replies || replies.length === 0) {
    if (isInline) {
      return (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
          }}
        >
          No replies yet
        </div>
      );
    }
    return (
      <div className="empty-state" style={{ padding: "32px" }}>
        <p className="empty-state-text">
          No replies yet. Be the first to reply!
        </p>
      </div>
    );
  }

  const buildReplyTree = () => {
    const replyMap = {};
    const rootReplies = [];

    replies.forEach((r) => {
      replyMap[r.id || r.uri] = { ...r, children: [] };
    });

    replies.forEach((r) => {
      const parentUri = r.inReplyTo || r.parentUri;
      if (parentUri === rootUri) {
        rootReplies.push(replyMap[r.id || r.uri]);
      } else if (replyMap[parentUri]) {
        replyMap[parentUri].children.push(replyMap[r.id || r.uri]);
      } else {
        rootReplies.push(replyMap[r.id || r.uri]);
      }
    });

    return rootReplies;
  };

  const replyTree = buildReplyTree();

  return (
    <div className={isInline ? "replies-list" : "replies-list-threaded"}>
      {replyTree.map((reply) => (
        <ReplyItem
          key={reply.id || reply.uri}
          reply={reply}
          depth={0}
          user={user}
          onReply={onReply}
          onDelete={onDelete}
          isInline={isInline}
        />
      ))}
    </div>
  );
}
