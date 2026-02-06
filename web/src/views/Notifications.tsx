
import React, { useEffect, useState } from 'react';
import { getNotifications, markNotificationsRead } from '../api/client';
import type { NotificationItem } from '../types';
import { Heart, MessageCircle, Star, User } from 'lucide-react';
import Card from '../components/Card';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

const NotificationIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'like': return <Heart size={18} className="text-red-500 fill-current" />;
        case 'reply': return <MessageCircle size={18} className="text-blue-500 fill-current" />;
        case 'follow': return <User size={18} className="text-primary-500 fill-current" />;
        case 'highlight': return <Star size={18} className="text-yellow-500 fill-current" />;
        default: return <Star size={18} className="text-surface-400 dark:text-surface-500" />;
    }
};

export default function Notifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        const data = await getNotifications();
        setNotifications(data);
        setLoading(false);
        markNotificationsRead();
    };

    if (loading) {
        return <div className="p-8 text-center text-surface-500 dark:text-surface-400">Loading activity...</div>;
    }

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-surface-900 rounded-xl ring-1 ring-black/5 dark:ring-white/5">
                <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mb-3">
                    <Star size={24} className="text-surface-400 dark:text-surface-500" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">No activity yet</h3>
                <p className="text-surface-500 dark:text-surface-400 text-sm">Interactions with your content will appear here</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white mb-4">Activity</h1>
            <div className="space-y-2">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={clsx(
                            "bg-white dark:bg-surface-900 ring-1 ring-black/5 dark:ring-white/5 rounded-lg p-3 transition-colors",
                            !n.readAt && "ring-primary-500/20 dark:ring-primary-400/20 bg-primary-50/30 dark:bg-primary-900/10"
                        )}
                    >
                        <div className="flex gap-3">
                            <div className="shrink-0 mt-0.5">
                                <NotificationIcon type={n.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {n.actor.avatar ? (
                                        <img src={n.actor.avatar} alt="" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-surface-100 dark:bg-surface-800" />
                                    )}
                                    <span className="font-medium text-surface-900 dark:text-white text-sm truncate">
                                        {n.actor.displayName || n.actor.handle}
                                    </span>
                                    <span className="text-surface-500 dark:text-surface-400 text-sm">
                                        {n.type === 'like' && 'liked your post'}
                                        {n.type === 'reply' && 'replied to you'}
                                        {n.type === 'follow' && 'followed you'}
                                        {n.type === 'highlight' && 'highlighted'}
                                    </span>
                                    <span className="text-surface-400 dark:text-surface-500 text-xs ml-auto">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false })}
                                    </span>
                                </div>

                                {n.subject && (
                                    <div className="mt-2 pl-3 border-l-2 border-surface-200 dark:border-surface-700">
                                        {n.type === 'reply' ? (
                                            <p className="text-surface-600 dark:text-surface-300 text-sm">{n.subject.text}</p>
                                        ) : (
                                            <Card item={n.subject} />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
