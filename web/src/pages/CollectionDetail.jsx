import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Plus, ExternalLink } from "lucide-react";
import {
  getCollection,
  getCollectionItems,
  removeItemFromCollection,
  deleteCollection,
  resolveHandle,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import CollectionModal from "../components/CollectionModal";
import CollectionIcon from "../components/CollectionIcon";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import ShareMenu from "../components/ShareMenu";

export default function CollectionDetail() {
  const { rkey, handle, "*": wildcardPath } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [collection, setCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const searchParams = new URLSearchParams(location.search);
  const paramAuthorDid = searchParams.get("author");

  const isOwner =
    user?.did &&
    (collection?.creator?.did === user.did || paramAuthorDid === user.did);

  useEffect(() => {
    let active = true;

    const fetchContext = async () => {
      if (active) {
        setLoading(true);
        setError(null);
      }

      try {
        let targetUri = null;
        let targetDid = paramAuthorDid || user?.did;

        if (handle && rkey) {
          try {
            targetDid = await resolveHandle(handle);
            if (!active) return;
            targetUri = `at://${targetDid}/at.margin.collection/${rkey}`;
          } catch (e) {
            console.error("Failed to resolve handle", e);
            if (active) setError("Could not resolve user handle");
          }
        } else if (wildcardPath) {
          targetUri = decodeURIComponent(wildcardPath);
        } else if (rkey && targetDid) {
          targetUri = `at://${targetDid}/at.margin.collection/${rkey}`;
        }

        if (!targetUri) {
          if (active) {
            if (!user && !handle && !paramAuthorDid) {
              setError("Please log in to view your collections");
            } else if (!error) {
              setError("Invalid collection URL");
            }
          }
          return;
        }

        if (!targetDid && targetUri.startsWith("at://")) {
          const parts = targetUri.split("/");
          if (parts.length > 2) targetDid = parts[2];
        }

        const collectionData = await getCollection(targetUri);
        if (!active) return;

        setCollection(collectionData);

        const itemsData = await getCollectionItems(collectionData.uri);
        if (!active) return;

        setItems(itemsData || []);
      } catch (err) {
        console.error("Fetch failed:", err);
        if (active) {
          if (
            err.message.includes("404") ||
            err.message.includes("not found")
          ) {
            setError("Collection not found");
          } else {
            setError(err.message || "Failed to load collection");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchContext();

    return () => {
      active = false;
    };
  }, [
    paramAuthorDid,
    user?.did,
    handle,
    rkey,
    wildcardPath,
    refreshTrigger,
    error,
    user,
  ]);

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setRefreshTrigger((v) => v + 1);
  };

  const handleDeleteItem = async (itemUri) => {
    if (!confirm("Remove this item from the collection?")) return;
    try {
      await removeItemFromCollection(itemUri);
      setItems((prev) => prev.filter((i) => i.uri !== itemUri));
    } catch (err) {
      console.error(err);
      alert("Failed to remove item");
    }
  };

  if (loading) {
    return (
      <div className="feed-page">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
          }}
        >
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="feed-page">
        <div className="empty-state card">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">
            {error || "Collection not found"}
          </h3>
          <button
            onClick={() => navigate("/collections")}
            className="btn btn-secondary"
            style={{ marginTop: "16px" }}
          >
            Back to Collections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <Link to="/collections" className="back-link">
        <ArrowLeft size={18} />
        <span>Collections</span>
      </Link>

      <div className="collection-detail-header">
        <div className="collection-detail-icon">
          <CollectionIcon icon={collection.icon} size={28} />
        </div>
        <div className="collection-detail-info">
          <h1 className="collection-detail-title">{collection.name}</h1>
          {collection.description && (
            <p className="collection-detail-desc">{collection.description}</p>
          )}
          <div className="collection-detail-stats">
            <span>
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            <span>·</span>
            <span>
              Created {new Date(collection.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="collection-detail-actions">
          <ShareMenu
            uri={collection.uri}
            handle={collection.creator?.handle}
            type="Collection"
            text={`Check out this collection: ${collection.name}`}
          />
          {isOwner && (
            <>
              {collection.uri.includes("network.cosmik.collection") ? (
                <a
                  href={`https://semble.so/profile/${collection.creator?.handle || collection.creator?.did}/collections/${collection.uri.split("/").pop()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="collection-detail-edit btn btn-secondary btn-sm"
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                  }}
                  title="Manage on Semble"
                >
                  <span>Manage on Semble</span>
                  <ExternalLink size={16} />
                </a>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="collection-detail-edit"
                    title="Edit Collection"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        confirm("Delete this collection and all its items?")
                      ) {
                        await deleteCollection(collection.uri);
                        navigate("/collections");
                      }
                    }}
                    className="collection-detail-delete"
                    title="Delete Collection"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="feed-container">
        <div className="feed">
          {items.length === 0 ? (
            <div className="empty-state card" style={{ borderStyle: "dashed" }}>
              <div className="empty-state-icon">
                <Plus size={32} />
              </div>
              <h3 className="empty-state-title">Collection is empty</h3>
              <p className="empty-state-text">
                {isOwner
                  ? 'Add items to this collection from your feed or bookmarks using the "Collect" button.'
                  : "This collection has no items yet."}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.uri} className="collection-item-wrapper">
                {isOwner &&
                  !collection.uri.includes("network.cosmik.collection") && (
                    <button
                      onClick={() => handleDeleteItem(item.uri)}
                      className="collection-item-remove"
                      title="Remove from collection"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                {item.annotation ? (
                  <AnnotationCard annotation={item.annotation} />
                ) : item.highlight ? (
                  <HighlightCard highlight={item.highlight} />
                ) : item.bookmark ? (
                  <BookmarkCard bookmark={item.bookmark} />
                ) : (
                  <div className="card" style={{ padding: "16px" }}>
                    <p className="text-secondary">Item could not be loaded</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isOwner && (
        <CollectionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          collectionToEdit={collection}
        />
      )}
    </div>
  );
}
