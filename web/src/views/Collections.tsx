import React, { useEffect, useState } from 'react';
import { getCollections, createCollection, deleteCollection } from '../api/client';
import { Loader2, Plus, Folder, Trash2, X } from 'lucide-react';
import CollectionIcon, { ICON_MAP } from '../components/CollectionIcon';
import { useStore } from '@nanostores/react';
import { $user } from '../store/auth';
import type { Collection } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

export default function Collections() {
    const user = useStore($user);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemIcon, setNewItemIcon] = useState('folder');

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        setLoading(true);
        const data = await getCollections();
        setCollections(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        const res = await createCollection(newItemName, newItemDesc);
        if (res) {
            setCollections([res, ...collections]);
            setShowCreateModal(false);
            setNewItemName('');
            setNewItemDesc('');
            setNewItemIcon('folder');
            loadCollections();
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (window.confirm('Delete this collection?')) {
            const success = await deleteCollection(id);
            if (success) {
                setCollections(prev => prev.filter(c => c.id !== id));
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">Collections</h1>
                    <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">Organize your annotations and highlights</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-500 transition-colors"
                >
                    <Plus size={16} />
                    New
                </button>
            </div>

            {collections.length === 0 ? (
                <div className="text-center py-16 text-surface-500 dark:text-surface-400 bg-surface-50/50 dark:bg-surface-800/50 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
                    <Folder size={40} className="mx-auto mb-3 text-surface-300 dark:text-surface-600" />
                    <p className="mb-3">No collections yet</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                    >
                        Create your first collection
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {collections.map(collection => (
                        <a
                            key={collection.id}
                            href={`/${collection.creator?.handle || user?.handle}/collection/${collection.uri.split('/').pop()}`}
                            className="group flex items-center gap-3 bg-white dark:bg-surface-900 rounded-lg p-3 ring-1 ring-black/5 dark:ring-white/5 hover:ring-primary-500/30 dark:hover:ring-primary-400/30 transition-all"
                        >
                            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                                <CollectionIcon icon={collection.icon} size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-surface-900 dark:text-white truncate">{collection.name}</h3>
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                    {collection.itemCount} items · {collection.createdAt && formatDistanceToNow(new Date(collection.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            {!collection.uri.includes('network.cosmik') && (
                                <button
                                    onClick={(e) => handleDelete(collection.id, e)}
                                    className="p-2 text-surface-400 dark:text-surface-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </a>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 rounded-xl shadow-xl max-w-md w-full p-5 animate-scale-in ring-1 ring-black/5 dark:ring-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-surface-900 dark:text-white">New Collection</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-surface-400 dark:text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400"
                                    placeholder="e.g. Design Inspiration"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Icon</label>
                                <div className="grid grid-cols-6 gap-2 p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg max-h-32 overflow-y-auto">
                                    {Object.keys(ICON_MAP).map(key => {
                                        const Icon = ICON_MAP[key];
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setNewItemIcon(key)}
                                                className={clsx(
                                                    "p-2 rounded-lg flex items-center justify-center transition-colors",
                                                    newItemIcon === key
                                                        ? "bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 ring-1 ring-primary-500"
                                                        : "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400"
                                                )}
                                            >
                                                <Icon size={18} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
                                <textarea
                                    value={newItemDesc}
                                    onChange={e => setNewItemDesc(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 min-h-[60px] resize-none"
                                    placeholder="What's this collection for?"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-surface-600 dark:text-surface-300 font-medium hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-500 transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
