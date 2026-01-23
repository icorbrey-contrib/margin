import { Link } from "react-router-dom";

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

export default function UserMeta({ author, createdAt }) {
  const authorDisplayName = author?.displayName || author?.handle || "Unknown";
  const authorHandle = author?.handle;
  const authorAvatar = author?.avatar;
  const authorDid = author?.did;
  const marginProfileUrl = authorDid ? `/profile/${authorDid}` : "#";

  return (
    <>
      <Link to={marginProfileUrl} className="annotation-avatar-link">
        <div className="annotation-avatar">
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorDisplayName} />
          ) : (
            <span>
              {authorDisplayName?.substring(0, 2).toUpperCase() || "??"}
            </span>
          )}
        </div>
      </Link>
      <div className="annotation-meta">
        <div className="annotation-author-row">
          <Link to={marginProfileUrl} className="annotation-author-link">
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
        <div className="annotation-time">{formatDate(createdAt)}</div>
      </div>
    </>
  );
}
