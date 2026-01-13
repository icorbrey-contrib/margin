import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getNotifications, markNotificationsRead } from "../api/client";
import { BellIcon, HeartIcon, ReplyIcon } from "../components/Icons";

function getContentRoute(subjectUri) {
  if (!subjectUri) return "/";
  if (subjectUri.includes("at.margin.bookmark")) {
    return `/bookmarks`;
  }
  if (subjectUri.includes("at.margin.highlight")) {
    return `/highlights`;
  }
  return `/annotation/${encodeURIComponent(subjectUri)}`;
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.did) return;

    async function load() {
      try {
        setLoading(true);
        const data = await getNotifications();
        setNotifications(data.items || []);
        await markNotificationsRead();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.did]);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <HeartIcon size={16} />;
      case "reply":
        return <ReplyIcon size={16} />;
      default:
        return <BellIcon size={16} />;
    }
  };

  const getNotificationText = (n) => {
    const name = n.actor?.displayName || n.actor?.handle || "Unknown";
    const handle = n.actor?.handle;

    switch (n.type) {
      case "like":
        return (
          <span>
            <Link
              to={`/profile/${handle}`}
              className="notification-author-link"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>{" "}
            liked your annotation
          </span>
        );
      case "reply":
        return (
          <span>
            <Link
              to={`/profile/${handle}`}
              className="notification-author-link"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>{" "}
            replied to your annotation
          </span>
        );
      default:
        return (
          <span>
            <Link
              to={`/profile/${handle}`}
              className="notification-author-link"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>{" "}
            interacted with your content
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="notifications-page">
        <div className="page-header">
          <h1 className="page-title">Notifications</h1>
        </div>
        <div className="empty-state">
          <BellIcon size={48} />
          <h3>Sign in to see notifications</h3>
          <p>Get notified when people like or reply to your content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <p className="page-description">
          Likes and replies on your annotations
        </p>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="empty-state">
          <BellIcon size={48} />
          <h3>No notifications yet</h3>
          <p>
            When someone likes or replies to your content, you'll see it here
          </p>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="notifications-list">
          {notifications.map((n, i) => (
            <Link
              key={n.id || i}
              to={getContentRoute(n.subjectUri)}
              className="notification-item card"
              style={{ alignItems: "center" }}
            >
              <div
                className="notification-avatar-container"
                style={{ marginRight: 12, position: "relative" }}
              >
                {n.actor?.avatar ? (
                  <img
                    src={n.actor.avatar}
                    alt={n.actor.handle}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#eee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {(n.actor?.handle || "?")[0].toUpperCase()}
                  </div>
                )}
                <div
                  className="notification-icon-badge"
                  data-type={n.type}
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    background: "var(--bg-primary)",
                    borderRadius: "50%",
                    padding: 2,
                    display: "flex",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  {getNotificationIcon(n.type)}
                </div>
              </div>
              <div className="notification-content">
                <p className="notification-text">{getNotificationText(n)}</p>
                <span className="notification-time">
                  {formatTime(n.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
