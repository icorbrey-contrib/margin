
import React, { useEffect, useState } from 'react';
import { getFeed } from '../api/client';
import Card from '../components/Card';
import { Loader2 } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { $user, initAuth } from '../store/auth';
import type { AnnotationItem } from '../types';
import { clsx } from 'clsx';

interface FeedProps {
    initialType?: string;
    motivation?: string;
    showTabs?: boolean;
    emptyMessage?: string;
}

export default function Feed({
    initialType = 'all',
    motivation,
    showTabs = true,
    emptyMessage = "No items found."
}: FeedProps) {
    const user = useStore($user);
    const [items, setItems] = useState<AnnotationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialType);

    useEffect(() => {
        initAuth();
    }, []);

    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            try {
                const type = activeTab === 'all' ? 'popular' : activeTab;
                const data = await getFeed({ type, motivation });
                setItems(data?.items || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchFeed();
    }, [activeTab, motivation]);

    const handleDelete = (uri: string) => {
        setItems((prev) => prev.filter(i => i.uri !== uri));
    };

    const tabs = [
        { id: 'all', label: 'Popular' },
        { id: 'shelved', label: 'Shelved' },
        { id: 'margin', label: 'Margin' },
        { id: 'semble', label: 'Semble' },
    ];

    if (!user && !loading) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-display font-bold mb-4 tracking-tight text-surface-900 dark:text-white">Welcome to Margin</h2>
                <p className="text-surface-500 dark:text-surface-400 mb-8 text-lg">Your curated corner of the internet.</p>
                <a href="/login" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold shadow-sm hover:bg-primary-500 transition-colors">
                    Log In
                </a>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {showTabs && (
                <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg mb-6 w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
                                    : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
                </div>
            ) : items.length > 0 ? (
                <div className="animate-fade-in">
                    {items.map((item) => (
                        <Card key={item.uri || item.cid} item={item} onDelete={handleDelete} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-surface-500 dark:text-surface-400 bg-surface-50/50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </div>
    );
}
