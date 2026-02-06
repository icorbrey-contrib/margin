import React, { useEffect, useState } from 'react';
import { getProfile, getFeed, getAvatarUrl, getCollections } from '../api/client';
import Card from '../components/Card';
import { Loader2, User as UserIcon, Edit2, Grid, Bookmark, PenTool, MessageSquare, Folder, Link as LinkIcon, Globe } from 'lucide-react';
import type { UserProfile, AnnotationItem, Collection } from '../types';
import { useStore } from '@nanostores/react';
import { $user } from '../store/auth';
import EditProfileModal from '../components/EditProfileModal';
import CollectionIcon from '../components/CollectionIcon';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface ProfileProps {
    did: string;
}

type Tab = 'annotations' | 'highlights' | 'bookmarks' | 'collections';

export default function Profile({ did }: ProfileProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('annotations');

    const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
    const [highlights, setHighlights] = useState<AnnotationItem[]>([]);
    const [bookmarks, setBookmarks] = useState<AnnotationItem[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    const user = useStore($user);
    const isOwner = user?.did === did;
    const [showEdit, setShowEdit] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const marginPromise = getProfile(did);
                const bskyPromise = fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`)
                    .then(res => res.ok ? res.json() : null)
                    .catch(() => null);

                const [marginData, bskyData] = await Promise.all([marginPromise, bskyPromise]);

                const merged: UserProfile = {
                    did: did,
                    handle: bskyData?.handle || marginData?.handle || '',
                    displayName: bskyData?.displayName || marginData?.displayName,
                    avatar: bskyData?.avatar || marginData?.avatar,
                    description: bskyData?.description || marginData?.description,
                    banner: bskyData?.banner || marginData?.banner,
                    website: marginData?.website,
                    links: marginData?.links || [],
                    followersCount: bskyData?.followersCount || marginData?.followersCount,
                    followsCount: bskyData?.followsCount || marginData?.followsCount,
                    postsCount: bskyData?.postsCount || marginData?.postsCount
                };

                setProfile(merged);
            } catch (e) {
                console.error("Profile load failed", e);
            } finally {
                setLoading(false);
            }
        };
        if (did) loadProfile();
    }, [did]);

    useEffect(() => {
        const loadTabContent = async () => {
            if (!did) return;
            setDataLoading(true);
            try {
                if (activeTab === 'annotations') {
                    const res = await getFeed({ creator: did, motivation: 'commenting', limit: 50 });
                    setAnnotations(res.items || []);
                } else if (activeTab === 'highlights') {
                    const res = await getFeed({ creator: did, motivation: 'highlighting', limit: 50 });
                    setHighlights(res.items || []);
                } else if (activeTab === 'bookmarks') {
                    const res = await getFeed({ creator: did, motivation: 'bookmarking', limit: 50 });
                    setBookmarks(res.items || []);
                } else if (activeTab === 'collections') {
                    const res = await getCollections(did);
                    setCollections(res);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setDataLoading(false);
            }
        };
        loadTabContent();
    }, [did, activeTab]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-20 text-surface-500 dark:text-surface-400">
                <p>User not found.</p>
            </div>
        );
    }

    const currentAvatar = getAvatarUrl(profile.did, profile.avatar);

    const tabs = [
        { id: 'annotations', label: 'Notes', icon: MessageSquare },
        { id: 'highlights', label: 'Highlights', icon: PenTool },
        { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
        { id: 'collections', label: 'Collections', icon: Grid },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-4 mb-4">
                <div className="flex items-start gap-4">
                    <div className="shrink-0">
                        {currentAvatar ? (
                            <img src={currentAvatar} alt={profile.handle} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-surface-100 dark:ring-surface-800" />
                        ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500">
                                <UserIcon size={28} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white truncate">
                                    {profile.displayName || profile.handle}
                                </h1>
                                <p className="text-surface-500 dark:text-surface-400 text-sm">@{profile.handle}</p>
                            </div>
                            {isOwner && (
                                <button
                                    onClick={() => setShowEdit(true)}
                                    className="shrink-0 px-2.5 py-1.5 text-sm font-medium text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Edit2 size={14} />
                                    <span className="hidden sm:inline">Edit</span>
                                </button>
                            )}
                        </div>

                        {profile.description && (
                            <p className="text-surface-600 dark:text-surface-300 text-sm mt-2 line-clamp-2">{profile.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-surface-500 dark:text-surface-400">
                            <span><strong className="text-surface-700 dark:text-surface-200">{profile.followersCount || 0}</strong> followers</span>
                            <span><strong className="text-surface-700 dark:text-surface-200">{profile.followsCount || 0}</strong> following</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg mb-4 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
                                : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
                        )}
                    >
                        <tab.icon size={14} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="min-h-[200px]">
                {dataLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-surface-400" size={24} />
                    </div>
                ) : (
                    <>
                        {activeTab === 'collections' ? (
                            collections.length === 0 ? (
                                <EmptyState type="collections" isOwner={isOwner} />
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {collections.map(collection => (
                                        <Link
                                            key={collection.id}
                                            to={`/${collection.creator?.handle || profile.handle}/collection/${collection.uri.split('/').pop()}`}
                                            className="group bg-white dark:bg-surface-900 rounded-lg p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:ring-primary-300 dark:hover:ring-primary-600 transition-all flex items-center gap-3"
                                        >
                                            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                                                <CollectionIcon icon={collection.icon} size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {collection.name}
                                                </h3>
                                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                                    {collection.itemCount} items
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )
                        ) : (
                            <>
                                {(activeTab === 'annotations' ? annotations : activeTab === 'highlights' ? highlights : bookmarks).length > 0 ? (
                                    <div>
                                        {(activeTab === 'annotations' ? annotations : activeTab === 'highlights' ? highlights : bookmarks).map((item) => (
                                            <Card key={item.uri || item.cid} item={item} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState type={activeTab} isOwner={isOwner} />
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {showEdit && profile && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setShowEdit(false)}
                    onUpdate={(updated) => setProfile(updated)}
                />
            )}
        </div>
    );
}

function EmptyState({ type, isOwner }: { type: string, isOwner: boolean }) {
    const messages: Record<string, string> = {
        annotations: isOwner ? "No notes yet" : "No notes",
        highlights: isOwner ? "No highlights yet" : "No highlights",
        bookmarks: isOwner ? "No bookmarks yet" : "No bookmarks",
        collections: isOwner ? "No collections yet" : "No collections"
    };

    const icons: Record<string, any> = {
        annotations: MessageSquare,
        highlights: PenTool,
        bookmarks: Bookmark,
        collections: Folder
    };

    const Icon = icons[type] || MessageSquare;

    return (
        <div className="text-center py-10 flex flex-col items-center">
            <div className="w-10 h-10 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center text-surface-400 dark:text-surface-500 mb-2">
                <Icon size={20} />
            </div>
            <p className="text-surface-500 dark:text-surface-400 text-sm">{messages[type]}</p>
        </div>
    );
}
