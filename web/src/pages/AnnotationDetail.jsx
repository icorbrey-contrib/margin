import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import ReplyList from "../components/ReplyList";
import {
  getAnnotation,
  getReplies,
  createReply,
  deleteReply,
  resolveHandle,
  normalizeAnnotation,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { MessageSquare } from "lucide-react";

export default function AnnotationDetail() {
  const { uri, did, rkey, handle, type } = useParams();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [annotation, setAnnotation] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const [targetUri, setTargetUri] = useState(uri);

  useEffect(() => {
    async function resolve() {
      if (uri) {
        setTargetUri(uri);
        return;
      }

      if (handle && rkey) {
        let collection = "at.margin.annotation";
        if (type === "highlight") collection = "at.margin.highlight";
        if (type === "bookmark") collection = "at.margin.bookmark";

        try {
          const resolvedDid = await resolveHandle(handle);
          if (resolvedDid) {
            setTargetUri(`at://${resolvedDid}/${collection}/${rkey}`);
          }
        } catch (e) {
          console.error("Failed to resolve handle:", e);
        }
      } else if (did && rkey) {
        setTargetUri(`at://${did}/at.margin.annotation/${rkey}`);
      } else {
        const pathParts = location.pathname.split("/");
        const atIndex = pathParts.indexOf("at");
        if (
          atIndex !== -1 &&
          pathParts[atIndex + 1] &&
          pathParts[atIndex + 2]
        ) {
          setTargetUri(
            `at://${pathParts[atIndex + 1]}/at.margin.annotation/${pathParts[atIndex + 2]}`,
          );
        }
      }
    }
    resolve();
  }, [uri, did, rkey, handle, type, location.pathname]);

  const refreshReplies = async () => {
    if (!targetUri) return;
    const repliesData = await getReplies(targetUri);
    setReplies(repliesData.items || []);
  };

  useEffect(() => {
    async function fetchData() {
      if (!targetUri) return;

      try {
        setLoading(true);
        const [annData, repliesData] = await Promise.all([
          getAnnotation(targetUri),
          getReplies(targetUri).catch(() => ({ items: [] })),
        ]);
        setAnnotation(normalizeAnnotation(annData));
        setReplies(repliesData.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [targetUri]);

  const handleReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setPosting(true);
      const parentUri = replyingTo
        ? replyingTo.id || replyingTo.uri
        : targetUri;
      const parentCid = replyingTo
        ? replyingTo.cid || ""
        : annotation?.cid || "";

      await createReply({
        parentUri,
        parentCid,
        rootUri: targetUri,
        rootCid: annotation?.cid || "",
        text: replyText,
      });
      setReplyText("");
      setReplyingTo(null);
      await refreshReplies();
    } catch (err) {
      alert("Failed to post reply: " + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteReply = async (reply) => {
    if (!confirm("Delete this reply?")) return;
    try {
      await deleteReply(reply.id || reply.uri);
      await refreshReplies();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="annotation-detail-page">
        <div className="card">
          <div className="skeleton skeleton-text" style={{ width: "40%" }} />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  if (error || !annotation) {
    return (
      <div className="annotation-detail-page">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Annotation not found</h3>
          <p className="empty-state-text">
            {error || "This annotation may have been deleted."}
          </p>
          <Link
            to="/"
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="annotation-detail-page">
      <div className="annotation-detail-header">
        <Link to="/" className="back-link">
          ← Back to Feed
        </Link>
      </div>

      {annotation.type === "Highlight" ? (
        <HighlightCard
          highlight={annotation}
          onDelete={() => (window.location.href = "/")}
        />
      ) : annotation.type === "Bookmark" ? (
        <BookmarkCard
          bookmark={annotation}
          onDelete={() => (window.location.href = "/")}
        />
      ) : (
        <AnnotationCard annotation={annotation} />
      )}

      {annotation.type !== "Bookmark" && annotation.type !== "Highlight" && (
        <div className="replies-section">
          <h3 className="replies-title">
            <MessageSquare size={18} />
            Replies ({replies.length})
          </h3>

          {isAuthenticated && (
            <div className="reply-form card">
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
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  replyingTo
                    ? `Reply to @${(replyingTo.creator || replyingTo.author)?.handle}...`
                    : "Write a reply..."
                }
                className="reply-input"
                rows={3}
                disabled={posting}
              />
              <div className="reply-form-actions">
                <button
                  className="btn btn-primary"
                  disabled={posting || !replyText.trim()}
                  onClick={() => handleReply()}
                >
                  {posting ? "Posting..." : "Reply"}
                </button>
              </div>
            </div>
          )}

          <ReplyList
            replies={replies}
            rootUri={targetUri}
            user={user}
            onReply={(reply) => setReplyingTo(reply)}
            onDelete={handleDeleteReply}
            isInline={false}
          />
        </div>
      )}
    </div>
  );
}
