import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Folder, Plus, Edit2, ChevronRight } from "lucide-react";
import { getCollections } from "../api/client";
import { useAuth } from "../context/AuthContext";
import CollectionModal from "../components/CollectionModal";
import CollectionRow from "../components/CollectionRow";

export default function Collections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const data = await getCollections(user.did);
      setCollections(data.items || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const handleCreateSuccess = () => {
    fetchCollections();
    setIsCreateModalOpen(false);
    setEditingCollection(null);
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

  return (
    <div className="feed-page">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-description">
            Organize your annotations, highlights, and bookmarks
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          New Collection
        </button>
      </div>

      {error ? (
        <div className="empty-state card">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Something went wrong</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <Folder size={32} />
          </div>
          <h3 className="empty-state-title">No collections yet</h3>
          <p className="empty-state-text mb-6">
            Create your first collection to start organizing your web
            annotations.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-secondary"
          >
            Create Collection
          </button>
        </div>
      ) : (
        <div className="collections-list">
          {collections.map((collection) => (
            <CollectionRow
              key={collection.uri}
              collection={collection}
              onEdit={() => setEditingCollection(collection)}
            />
          ))}
        </div>
      )}

      <CollectionModal
        isOpen={isCreateModalOpen || !!editingCollection}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCollection(null);
        }}
        onSuccess={handleCreateSuccess}
        collectionToEdit={editingCollection}
      />
    </div>
  );
}
