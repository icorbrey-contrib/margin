
import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $user } from '../store/auth';
import { getAPIKeys, createAPIKey, deleteAPIKey, type APIKey } from '../api/client';
import { Copy, Trash2, Key, Plus, Check, User as UserIcon } from 'lucide-react';

export default function Settings() {
    const user = useStore($user);
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [justCopied, setJustCopied] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setLoading(true);
        const data = await getAPIKeys();
        setKeys(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        const res = await createAPIKey(newKeyName);
        if (res) {
            setKeys([res, ...keys]);
            setCreatedKey(res.key || null);
            setNewKeyName('');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Revoke this key? Apps using it will stop working.')) {
            const success = await deleteAPIKey(id);
            if (success) {
                setKeys(prev => prev.filter(k => k.id !== id));
            }
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 2000);
    };

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white mb-6">Settings</h1>

            <div className="space-y-4">
                <section className="bg-white dark:bg-surface-900 rounded-xl ring-1 ring-black/5 dark:ring-white/5 p-4">
                    <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">Profile</h2>
                    <div className="flex gap-4 items-center">
                        {user.avatar ? (
                            <img src={user.avatar} className="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 object-cover" />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500">
                                <UserIcon size={24} />
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-surface-900 dark:text-white">{user.displayName || user.handle}</p>
                            <p className="text-sm text-surface-500 dark:text-surface-400">@{user.handle}</p>
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-surface-900 rounded-xl ring-1 ring-black/5 dark:ring-white/5 p-4">
                    <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">API Keys</h2>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mb-4">For the browser extension and other apps</p>

                    <form onSubmit={handleCreate} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={e => setNewKeyName(e.target.value)}
                            placeholder="Key name, e.g. Chrome Extension"
                            className="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!newKeyName.trim()}
                            className="px-3 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-500 disabled:opacity-50 transition-colors text-sm flex items-center gap-1.5"
                        >
                            <Plus size={16} />
                            Generate
                        </button>
                    </form>

                    {createdKey && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Key size={16} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-green-800 dark:text-green-200 text-xs mb-2">Copy now - you won't see this again!</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-white dark:bg-surface-900 border border-green-200 dark:border-green-800 px-2 py-1.5 rounded text-xs font-mono text-green-900 dark:text-green-100 break-all">
                                            {createdKey}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(createdKey)}
                                            className="p-1.5 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
                                        >
                                            {justCopied ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-12 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
                            <div className="h-12 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
                        </div>
                    ) : keys.length === 0 ? (
                        <p className="text-center text-surface-500 dark:text-surface-400 text-sm py-6">No API keys yet</p>
                    ) : (
                        <div className="space-y-2">
                            {keys.map(key => (
                                <div key={key.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg group">
                                    <div className="flex items-center gap-3">
                                        <Key size={16} className="text-surface-400 dark:text-surface-500" />
                                        <div>
                                            <p className="font-medium text-surface-900 dark:text-white text-sm">{key.alias}</p>
                                            <p className="text-xs text-surface-500 dark:text-surface-400">
                                                Created {new Date(key.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(key.id)}
                                        className="p-1.5 text-surface-400 dark:text-surface-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
