
import React, { useEffect, useState } from 'react';
import { getFeed } from '../api/client';
import Card from './Card';
import { Loader2 } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { $user, initAuth } from '../store/auth';
import type { AnnotationItem } from '../types';

interface MasonryFeedProps {
    motivation?: string;
    emptyMessage?: string;
}

export default function MasonryFeed({
    motivation,
    emptyMessage = "No items found."
}: MasonryFeedProps) {
    const user = useStore($user);
    const [items, setItems] = useState<AnnotationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initAuth();
    }, []);

    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            try {
                const data = await getFeed({ type: 'my-feed', motivation });
                setItems(data?.items || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchFeed();
    }, [motivation]);

    const handleDelete = (uri: string) => {
        setItems((prev) => prev.filter(i => i.uri !== uri));
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-20 text-surface-500 dark:text-surface-400 bg-surface-50/50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="columns-1 xl:columns-2 gap-4 animate-fade-in">
            {items.map((item) => (
                <div key={item.uri || item.cid} className="break-inside-avoid mb-4">
                    <Card item={item} onDelete={handleDelete} />
                </div>
            ))}
        </div>
    );
}
