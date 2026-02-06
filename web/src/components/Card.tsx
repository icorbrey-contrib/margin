
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart, ExternalLink, FolderPlus, Trash2, Edit3, Bookmark as BookmarkIcon, Globe } from 'lucide-react';
import ShareMenu from './ShareMenu';
import AddToCollectionModal from './AddToCollectionModal';
import { clsx } from 'clsx';
import { likeItem, unlikeItem, deleteItem, getAvatarUrl } from '../api/client';
import { $user } from '../store/auth';
import { useStore } from '@nanostores/react';
import type { AnnotationItem } from '../types';
import { Link } from 'react-router-dom';

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

    const type = item.motivation === 'highlighting' ? 'highlight' :
        item.motivation === 'bookmarking' ? 'bookmark' : 'annotation';

    const isSemble = item.uri?.includes('network.cosmik') || item.uri?.includes('semble');

    const handleLike = async () => {
        const prev = { liked, likes };
        setLiked(!liked);
        setLikes(l => liked ? l - 1 : l + 1);

        const success = liked
            ? await unlikeItem(item.uri)
            : await likeItem(item.uri, item.cid);

        if (!success) {
            setLiked(prev.liked);
            setLikes(prev.likes);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Delete this item?')) {
            const success = await deleteItem(item.uri, type);
            if (success && onDelete) onDelete(item.uri);
        }
    };

    const timestamp = item.createdAt
        ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: false })
            .replace('about ', '')
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' minutes', 'm')
            .replace(' minute', 'm')
            .replace(' days', 'd')
            .replace(' day', 'd')
        : '';

    const pageUrl = item.target?.source;
    const pageTitle = item.target?.title || (pageUrl ? new URL(pageUrl).hostname : null);
    const pageHostname = pageUrl ? new URL(pageUrl).hostname.replace('www.', '') : null;
    const isBookmark = type === 'bookmark' && !item.target?.selector && !item.body?.value;

    return (
        <article className="bg-white dark:bg-surface-900 rounded-lg p-4 mb-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:ring-black/10 dark:hover:ring-white/10 transition-all">
            {item.collection && (
                <Link
                    to={`/${item.addedBy?.handle || ''}/collection/${item.collection.uri.split('/').pop()}`}
                    className="inline-flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 mb-2 transition-colors"
                >
                    {item.collection.icon || '📁'} {item.collection.name}
                </Link>
            )}

            <div className="flex items-start gap-3">
                <Link to={`/profile/${item.author?.did}`} className="shrink-0">
                    {getAvatarUrl(item.author?.did, item.author?.avatar) ? (
                        <img
                            src={getAvatarUrl(item.author?.did, item.author?.avatar)}
                            alt=""
                            className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800" />
                    )}
                </Link>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Link to={`/profile/${item.author?.did}`} className="font-semibold text-surface-900 dark:text-white text-[15px] hover:underline">
                            {item.author?.displayName || item.author?.handle}
                        </Link>
                        <span className="text-surface-400 dark:text-surface-500 text-sm">
                            @{item.author?.handle}
                        </span>
                        <span className="text-surface-300 dark:text-surface-600">·</span>
                        <span className="text-surface-400 dark:text-surface-500 text-sm">
                            {timestamp}
                        </span>
                        {isSemble && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-surface-400 dark:text-surface-500 uppercase font-medium tracking-wide">
                                · via <img src="/semble-logo.svg" alt="Semble" className="h-3 inline opacity-70" />
                            </span>
                        )}
                    </div>

                    {pageUrl && !isBookmark && (
                        <a
                            href={pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-0.5"
                        >
                            <ExternalLink size={10} />
                            {pageHostname}
                        </a>
                    )}
                </div>
            </div>

            <div className="mt-3 ml-[52px]">
                {isBookmark && pageUrl && (
                    <a
                        href={pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-lg flex items-center justify-center text-surface-400 dark:text-surface-500 group-hover:text-primary-500 dark:group-hover:text-primary-400">
                                <Globe size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-surface-900 dark:text-white text-sm leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2">
                                    {pageTitle}
                                </h3>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">
                                    {pageUrl}
                                </p>
                            </div>
                            <ExternalLink size={14} className="shrink-0 text-surface-300 dark:text-surface-600 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
                        </div>
                    </a>
                )}

                {item.target?.selector && (
                    <blockquote className={clsx(
                        "pl-3 border-l-[3px] mb-2 text-[15px] italic text-surface-600 dark:text-surface-300",
                        item.color === 'yellow' && "border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20",
                        item.color === 'green' && "border-green-400 bg-green-50/50 dark:bg-green-900/20",
                        item.color === 'red' && "border-red-400 bg-red-50/50 dark:bg-red-900/20",
                        item.color === 'blue' && "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20",
                        !item.color && "border-surface-300 dark:border-surface-600"
                    )}>
                        "{item.target.selector.exact}"
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
                        "flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors",
                        liked
                            ? "text-red-500"
                            : "text-surface-400 dark:text-surface-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    )}
                >
                    <Heart size={16} className={clsx(liked && "fill-current")} />
                    {likes > 0 && <span className="text-xs">{likes}</span>}
                </button>

                <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <MessageSquare size={16} />
                    {(item.replyCount || 0) > 0 && <span className="text-xs">{item.replyCount}</span>}
                </button>

                {user && (
                    <button
                        onClick={() => setShowCollectionModal(true)}
                        className="flex items-center px-2 py-1.5 rounded-md text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        title="Add to Collection"
                    >
                        <FolderPlus size={16} />
                    </button>
                )}

                {!hideShare && (
                    <ShareMenu
                        uri={item.uri}
                        text={item.body?.value || ''}
                        handle={item.author?.handle}
                        type={type}
                        url={pageUrl}
                    />
                )}

                {isAuthor && (
                    <>
                        <div className="flex-1" />
                        <button
                            className="flex items-center px-2 py-1.5 rounded-md text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                            title="Edit"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center px-2 py-1.5 rounded-md text-surface-400 dark:text-surface-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
        </article>
    );
}
