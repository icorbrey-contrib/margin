import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Heart,
  ExternalLink,
  FolderPlus,
  Trash2,
  Edit3,
  Globe,
} from "lucide-react";
import ShareMenu from "../modals/ShareMenu";
import AddToCollectionModal from "../modals/AddToCollectionModal";
import ExternalLinkModal from "../modals/ExternalLinkModal";
import { clsx } from "clsx";
import { likeItem, unlikeItem, deleteItem } from "../../api/client";
import { $user } from "../../store/auth";
import { $preferences } from "../../store/preferences";
import { useStore } from "@nanostores/react";
import type { AnnotationItem } from "../../types";
import { Link } from "react-router-dom";
import { Avatar } from "../ui";
import CollectionIcon from "./CollectionIcon";
import ProfileHoverCard from "./ProfileHoverCard";

interface CardProps {
  item: AnnotationItem;
  onDelete?: (uri: string) => void;
  hideShare?: boolean;
}

export default function Card({ item, onDelete, hideShare }: CardProps) {
  const user = useStore($user);
  const isAuthor = user && item.author?.did === user.did;

  const [liked, setLiked] = useState(!!item.viewer?.like);
  const [likes, setLikes] = useState(item.likeCount || 0);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string | null>(null);

  const type =
    item.motivation === "highlighting"
      ? "highlight"
      : item.motivation === "bookmarking"
        ? "bookmark"
        : "annotation";

  const isSemble =
    item.uri?.includes("network.cosmik") || item.uri?.includes("semble");

  const handleLike = async () => {
    const prev = { liked, likes };
    setLiked(!liked);
    setLikes((l) => (liked ? l - 1 : l + 1));

    const success = liked
      ? await unlikeItem(item.uri)
      : await likeItem(item.uri, item.cid);

    if (!success) {
      setLiked(prev.liked);
      setLikes(prev.likes);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this item?")) {
      const success = await deleteItem(item.uri, type);
      if (success && onDelete) onDelete(item.uri);
    }
  };

  const handleExternalClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const hostname = new URL(url).hostname;
      const skipped = $preferences.get().externalLinkSkippedHostnames;
      if (skipped.includes(hostname)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    } catch {
      // ignore
    }

    setExternalLinkUrl(url);
    setShowExternalLinkModal(true);
  };

  const timestamp = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: false })
        .replace("about ", "")
        .replace(" hours", "h")
        .replace(" hour", "h")
        .replace(" minutes", "m")
        .replace(" minute", "m")
        .replace(" days", "d")
        .replace(" day", "d")
    : "";

  const detailUrl = `/${item.author?.handle || item.author?.did}/${type}/${(item.uri || "").split("/").pop()}`;

  const pageUrl = item.target?.source || item.source;
  const pageTitle =
    item.target?.title ||
    item.title ||
    (pageUrl ? new URL(pageUrl).hostname : null);
  const pageHostname = pageUrl
    ? new URL(pageUrl).hostname.replace("www.", "")
    : null;
  const isBookmark = type === "bookmark";

  const [ogData, setOgData] = useState<{
    title?: string;
    description?: string;
    image?: string;
    icon?: string;
  } | null>(null);

  const [imgError, setImgError] = useState(false);
  const [iconError, setIconError] = useState(false);

  React.useEffect(() => {
    if (isBookmark && item.uri && !ogData && pageUrl) {
      const fetchMetadata = async () => {
        try {
          const res = await fetch(
            `/api/url-metadata?url=${encodeURIComponent(pageUrl)}`,
          );
          if (res.ok) {
            const data = await res.json();
            setOgData(data);
          }
        } catch (e) {
          console.error("Failed to fetch metadata", e);
        }
      };
      fetchMetadata();
    }
  }, [isBookmark, item.uri, pageUrl, ogData]);

  const displayTitle =
    item.title || ogData?.title || pageTitle || "Untitled Bookmark";
  const displayDescription = item.description || ogData?.description;
  const displayImage = ogData?.image;

  return (
    <article className="card p-4 hover:ring-black/10 dark:hover:ring-white/10 transition-all">
      {item.collection && (
        <div className="flex items-center gap-1.5 text-xs text-surface-400 dark:text-surface-500 mb-2">
          {item.addedBy && item.addedBy.did !== item.author?.did ? (
            <>
              <ProfileHoverCard did={item.addedBy.did}>
                <Link
                  to={`/profile/${item.addedBy.did}`}
                  className="flex items-center gap-1.5 font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  <Avatar
                    did={item.addedBy.did}
                    avatar={item.addedBy.avatar}
                    size="xs"
                  />
                  <span>
                    {item.addedBy.displayName || `@${item.addedBy.handle}`}
                  </span>
                </Link>
              </ProfileHoverCard>
              <span>added to</span>
            </>
          ) : (
            <span>Added to</span>
          )}
          <Link
            to={`/${item.addedBy?.handle || ""}/collection/${(item.collection.uri || "").split("/").pop()}`}
            className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <CollectionIcon icon={item.collection.icon} size={14} />
            <span className="font-medium">{item.collection.name}</span>
          </Link>
        </div>
      )}

      <div className="flex items-start gap-3">
        <ProfileHoverCard did={item.author?.did}>
          <Link to={`/profile/${item.author?.did}`} className="shrink-0">
            <Avatar
              did={item.author?.did}
              avatar={item.author?.avatar}
              size="md"
            />
          </Link>
        </ProfileHoverCard>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ProfileHoverCard did={item.author?.did}>
              <Link
                to={`/profile/${item.author?.did}`}
                className="font-semibold text-surface-900 dark:text-white text-[15px] hover:underline"
              >
                {item.author?.displayName || item.author?.handle}
              </Link>
            </ProfileHoverCard>
            <span className="text-surface-400 dark:text-surface-500 text-sm">
              @{item.author?.handle}
            </span>
            <span className="text-surface-300 dark:text-surface-600">·</span>
            <span className="text-surface-400 dark:text-surface-500 text-sm">
              {timestamp}
            </span>
            {isSemble && (
              <span className="inline-flex items-center gap-1 text-[10px] text-surface-400 dark:text-surface-500 uppercase font-medium tracking-wide">
                · via{" "}
                <img
                  src="/semble-logo.svg"
                  alt="Semble"
                  className="h-3 opacity-70"
                />
              </span>
            )}
          </div>

          {pageUrl && !isBookmark && (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleExternalClick(e, pageUrl)}
              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-0.5"
            >
              <ExternalLink size={10} />
              {pageHostname}
            </a>
          )}
        </div>
      </div>

      <div className="mt-3 ml-[52px]">
        {isBookmark && (
          <a
            href={pageUrl || "#"}
            target={pageUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={(e) => pageUrl && handleExternalClick(e, pageUrl)}
            className="block bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all group overflow-hidden"
          >
            {displayImage && !imgError && (
              <div className="h-32 w-full overflow-hidden bg-surface-200 dark:bg-surface-700 border-b border-surface-200 dark:border-surface-700">
                <img
                  src={displayImage}
                  alt=""
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-surface-900 dark:text-white text-base leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2 transition-colors">
                {displayTitle}
              </h3>

              {displayDescription && (
                <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed mb-3 line-clamp-2">
                  {displayDescription}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-500">
                <div className="w-5 h-5 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {ogData?.icon && !iconError ? (
                    <img
                      src={ogData.icon}
                      alt=""
                      onError={() => setIconError(true)}
                      className="w-3.5 h-3.5 object-contain"
                    />
                  ) : (
                    <Globe size={10} />
                  )}
                </div>
                <span className="truncate max-w-[200px]">
                  {pageHostname || pageUrl}
                </span>
              </div>
            </div>
          </a>
        )}

        {item.target?.selector?.exact && (
          <blockquote
            className={clsx(
              "pl-4 py-2 border-l-[3px] mb-3 text-[15px] italic text-surface-600 dark:text-surface-300 rounded-r-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors",
              !item.color &&
                type === "highlight" &&
                "border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20",
              item.color === "yellow" &&
                "border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20",
              item.color === "green" &&
                "border-green-400 bg-green-50/50 dark:bg-green-900/20",
              item.color === "red" &&
                "border-red-400 bg-red-50/50 dark:bg-red-900/20",
              item.color === "blue" &&
                "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20",
              !item.color &&
                type !== "highlight" &&
                "border-surface-300 dark:border-surface-600",
            )}
            style={
              item.color?.startsWith("#")
                ? {
                    borderColor: item.color,
                    backgroundColor: `${item.color}15`,
                  }
                : undefined
            }
          >
            <a
              href={`${pageUrl}#:~:text=${item.target.selector.prefix ? encodeURIComponent(item.target.selector.prefix) + "-," : ""}${encodeURIComponent(item.target.selector.exact)}${item.target.selector.suffix ? ",-" + encodeURIComponent(item.target.selector.suffix) : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                const sel = item.target?.selector;
                if (!sel) return;
                const url = `${pageUrl}#:~:text=${sel.prefix ? encodeURIComponent(sel.prefix) + "-," : ""}${encodeURIComponent(sel.exact)}${sel.suffix ? ",-" + encodeURIComponent(sel.suffix) : ""}`;
                handleExternalClick(e, url);
              }}
              className="block"
            >
              "{item.target?.selector?.exact}"
            </a>
          </blockquote>
        )}

        {item.body?.value && (
          <p className="text-surface-900 dark:text-surface-100 whitespace-pre-wrap leading-relaxed text-[15px]">
            {item.body.value}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3 ml-[52px]">
        <button
          onClick={handleLike}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all",
            liked
              ? "text-red-500 bg-red-50 dark:bg-red-900/20"
              : "text-surface-400 dark:text-surface-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
          )}
        >
          <Heart size={16} className={clsx(liked && "fill-current")} />
          {likes > 0 && <span className="text-xs font-medium">{likes}</span>}
        </button>

        {type === "annotation" && (
          <Link
            to={detailUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
          >
            <MessageSquare size={16} />
            {(item.replyCount || 0) > 0 && (
              <span className="text-xs font-medium">{item.replyCount}</span>
            )}
          </Link>
        )}

        {user && (
          <button
            onClick={() => setShowCollectionModal(true)}
            className="flex items-center px-2.5 py-1.5 rounded-lg text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
            title="Add to Collection"
          >
            <FolderPlus size={16} />
          </button>
        )}

        {!hideShare && (
          <ShareMenu
            uri={item.uri}
            text={item.body?.value || ""}
            handle={item.author?.handle}
            type={type}
            url={pageUrl}
          />
        )}

        {isAuthor && (
          <>
            <div className="flex-1" />
            <button
              className="flex items-center px-2.5 py-1.5 rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-2.5 py-1.5 rounded-lg text-surface-400 dark:text-surface-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      <AddToCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        annotationUri={item.uri}
      />

      <ExternalLinkModal
        isOpen={showExternalLinkModal}
        onClose={() => setShowExternalLinkModal(false)}
        url={externalLinkUrl}
      />
    </article>
  );
}
