import { useState, useEffect } from "react";
import { X, Plus, Check, Folder } from "lucide-react";
import {
  getCollections,
  addItemToCollection,
  getCollectionsContaining,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import CollectionModal from "./CollectionModal";

export default function AddToCollectionModal({
  isOpen,
  onClose,
  annotationUri,
}) {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState(null);
  const [addedTo, setAddedTo] = useState(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      if (!annotationUri) {
        setLoading(false);
        return;
      }
      loadCollections();
      setError(null);
    }
  }, [isOpen, user, annotationUri]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const [data, existingURIs] = await Promise.all([
        getCollections(user?.did),
        annotationUri ? getCollectionsContaining(annotationUri) : [],
      ]);

      const items = Array.isArray(data) ? data : data.items || [];
      setCollections(items);
      setAddedTo(new Set(existingURIs || []));
    } catch (err) {
      console.error(err);
      setError("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (collectionUri) => {
    if (addedTo.has(collectionUri)) return;

    try {
      setAddingTo(collectionUri);
      await addItemToCollection(collectionUri, annotationUri);
      setAddedTo((prev) => new Set([...prev, collectionUri]));
    } catch (err) {
      console.error(err);
      alert("Failed to add to collection");
    } finally {
      setAddingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-container"
          style={{
            maxWidth: "380px",
            maxHeight: "80dvh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2
              className="modal-title"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Folder size={20} style={{ color: "var(--accent)" }} />
              Add to Collection
            </h2>
            <button onClick={onClose} className="modal-close-btn">
              <X size={20} />
            </button>
          </div>

          <div style={{ overflowY: "auto", padding: "8px", flex: 1 }}>
            {loading ? (
              <div
                style={{
                  padding: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "12px",
                  color: "var(--text-tertiary)",
                }}
              >
                <div className="spinner"></div>
                <span style={{ fontSize: "0.9rem" }}>
                  Loading collections...
                </span>
              </div>
            ) : error ? (
              <div style={{ padding: "24px", textAlign: "center" }}>
                <p
                  className="text-error"
                  style={{ fontSize: "0.9rem", marginBottom: "12px" }}
                >
                  {error}
                </p>
                <button
                  onClick={loadCollections}
                  className="btn btn-secondary btn-sm"
                >
                  Try Again
                </button>
              </div>
            ) : collections.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px" }}>
                <div className="empty-state-icon">
                  <Folder size={24} />
                </div>
                <p className="empty-state-title" style={{ fontSize: "1rem" }}>
                  No collections found
                </p>
                <p className="empty-state-text">
                  Create a collection to start organizing your items.
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {collections.map((col) => {
                  const isAdded = addedTo.has(col.uri);
                  const isAdding = addingTo === col.uri;

                  return (
                    <button
                      key={col.uri}
                      onClick={() => handleAdd(col.uri)}
                      disabled={isAdding || isAdded}
                      className="collection-list-item"
                      style={{
                        opacity: isAdded ? 0.7 : 1,
                        cursor: isAdded ? "default" : "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col.name}
                        </span>
                        {col.description && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-tertiary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginTop: "2px",
                            }}
                          >
                            {col.description}
                          </span>
                        )}
                      </div>

                      {isAdding ? (
                        <span
                          className="spinner spinner-sm"
                          style={{ marginLeft: "12px" }}
                        />
                      ) : isAdded ? (
                        <Check
                          size={20}
                          style={{
                            color: "var(--success)",
                            marginLeft: "12px",
                          }}
                        />
                      ) : (
                        <Plus
                          size={18}
                          style={{
                            color: "var(--text-tertiary)",
                            opacity: 0,
                            marginLeft: "12px",
                          }}
                          className="collection-list-item-icon"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "16px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-tertiary)",
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Plus size={18} />
              New Collection
            </button>
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <CollectionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadCollections();
        }}
      />
    </>
  );
}
