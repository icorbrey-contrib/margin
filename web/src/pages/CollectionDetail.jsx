import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Plus } from "lucide-react";
import {
  getCollections,
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

  const searchParams = new URLSearchParams(location.search);
  const paramAuthorDid = searchParams.get("author");

  const isOwner =
    user?.did &&
    (collection?.creator?.did === user.did || paramAuthorDid === user.did);

  const fetchContext = async () => {
    try {
      setLoading(true);

      let targetUri = null;
      let targetDid = paramAuthorDid || user?.did;

      if (handle && rkey) {
        try {
          targetDid = await resolveHandle(handle);
          targetUri = `at://${targetDid}/at.margin.collection/${rkey}`;
        } catch (e) {
          console.error("Failed to resolve handle", e);
        }
      } else if (wildcardPath) {
        targetUri = decodeURIComponent(wildcardPath);
      } else if (rkey && targetDid) {
        targetUri = `at://${targetDid}/at.margin.collection/${rkey}`;
      }

      if (!targetUri) {
        if (!user && !handle && !paramAuthorDid) {
          setError("Please log in to view your collections");
          return;
        }
        setError("Invalid collection URL");
        return;
      }

      if (!targetDid && targetUri.startsWith("at://")) {
        const parts = targetUri.split("/");
        if (parts.length > 2) targetDid = parts[2];
      }

      if (!targetDid) {
        setError("Could not determine collection owner");
        return;
      }

      const [cols, itemsData] = await Promise.all([
        getCollections(targetDid),
        getCollectionItems(targetUri),
      ]);

      const found =
        cols.items?.find((c) => c.uri === targetUri) ||
        cols.items?.find(
          (c) => targetUri && c.uri.endsWith(targetUri.split("/").pop()),
        );

      if (!found) {
        setError("Collection not found");
        return;
      }
      setCollection(found);
      setItems(itemsData || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load collection");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [rkey, wildcardPath, handle, paramAuthorDid, user?.did]);

  const handleEditSuccess = () => {
    fetchContext();
    setIsEditModalOpen(false);
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
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="collection-detail-edit"
                title="Edit Collection"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={async () => {
                  if (confirm("Delete this collection and all its items?")) {
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
        </div>
      </div>

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
              {isOwner && (
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
