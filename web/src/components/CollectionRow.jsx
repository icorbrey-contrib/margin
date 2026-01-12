import { Link } from "react-router-dom";
import { ChevronRight, Edit2 } from "lucide-react";
import CollectionIcon from "./CollectionIcon";

export default function CollectionRow({ collection, onEdit }) {
  return (
    <div className="collection-row">
      <Link
        to={`/collection/${encodeURIComponent(collection.uri)}?author=${encodeURIComponent(
          collection.authorDid || collection.author?.did,
        )}`}
        className="collection-row-content"
      >
        <div className="collection-row-icon">
          <CollectionIcon icon={collection.icon} size={22} />
        </div>
        <div className="collection-row-info">
          <h3 className="collection-row-name">{collection.name}</h3>
          {collection.description && (
            <p className="collection-row-desc">{collection.description}</p>
          )}
        </div>
        <ChevronRight size={20} className="collection-row-arrow" />
      </Link>
      {onEdit && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="collection-row-edit"
          title="Edit collection"
        >
          <Edit2 size={16} />
        </button>
      )}
    </div>
  );
}
