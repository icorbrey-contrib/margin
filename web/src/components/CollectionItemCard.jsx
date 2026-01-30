import { Link } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "./AnnotationCard";
import BookmarkCard from "./BookmarkCard";

import CollectionIcon from "./CollectionIcon";
import ShareMenu from "./ShareMenu";

export default function CollectionItemCard({ item, onAddToCollection }) {
  const author = item.creator;
  const collection = item.collection;

  if (!author || !collection) return null;

  const innerItem = item.annotation || item.highlight || item.bookmark;
  if (!innerItem) return null;

  const innerUri = innerItem.uri || innerItem.id;

  return (
    <div className="collection-feed-item">
      <div className="collection-context-badge">
        <div className="collection-context-inner">
          {author.avatar && (
            <img
              src={author.avatar}
              alt={author.handle}
              className="collection-context-avatar"
            />
          )}
          <span className="collection-context-text">
            <Link
              to={`/profile/${author.did}`}
              className="collection-context-author"
            >
              {author.displayName || author.handle}
            </Link>{" "}
            added to{" "}
            <Link
              to={`/${author.handle}/collection/${collection.uri.split("/").pop()}`}
              className="collection-context-link"
            >
              <CollectionIcon icon={collection.icon} size={14} />
              {collection.name}
            </Link>
          </span>
        </div>
        <ShareMenu
          uri={collection.uri}
          handle={author.handle}
          type="Collection"
          text={`Check out this collection: ${collection.name}`}
        />
      </div>

      {item.annotation && (
        <AnnotationCard
          annotation={item.annotation}
          onAddToCollection={() => onAddToCollection?.(innerUri)}
        />
      )}
      {item.highlight && (
        <HighlightCard
          highlight={item.highlight}
          onAddToCollection={() => onAddToCollection?.(innerUri)}
        />
      )}
      {item.bookmark && (
        <BookmarkCard
          bookmark={item.bookmark}
          onAddToCollection={() => onAddToCollection?.(innerUri)}
        />
      )}
    </div>
  );
}
