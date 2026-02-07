import React, { useEffect, useState } from "react";
import { getNotifications, markNotificationsRead } from "../../api/client";
import type { NotificationItem } from "../../types";
import { Heart, MessageCircle, Bell, PenTool, Loader2 } from "lucide-react";
import Card from "../../components/common/Card";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { Avatar, EmptyState, Skeleton } from "../../components/ui";

const NotificationIcon = ({ type }: { type: string }) => {
  const iconClass = "p-2 rounded-full";
  switch (type) {
    case "like":
      return (
        <div className={clsx(iconClass, "bg-red-100 dark:bg-red-900/30")}>
          <Heart size={16} className="text-red-500" />
        </div>
      );
    case "reply":
      return (
        <div className={clsx(iconClass, "bg-blue-100 dark:bg-blue-900/30")}>
          <MessageCircle size={16} className="text-blue-500" />
        </div>
      );
    case "highlight":
      return (
        <div className={clsx(iconClass, "bg-yellow-100 dark:bg-yellow-900/30")}>
          <PenTool size={16} className="text-yellow-600" />
        </div>
      );
    default:
      return (
        <div className={clsx(iconClass, "bg-surface-100 dark:bg-surface-800")}>
          <Bell size={16} className="text-surface-500" />
        </div>
      );
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
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-6">
          Activity
        </h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex gap-3">
              <Skeleton variant="circular" className="w-10 h-10" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-6">
          Activity
        </h1>
        <EmptyState
          icon={<Bell size={48} />}
          title="No activity yet"
          message="Interactions with your content will appear here."
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-6">
        Activity
      </h1>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={clsx(
              "card p-4 transition-all",
              !n.readAt &&
                "ring-2 ring-primary-500/20 dark:ring-primary-400/20 bg-primary-50/30 dark:bg-primary-900/10",
            )}
          >
            <div className="flex gap-3">
              <div className="shrink-0">
                <NotificationIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Avatar src={n.actor.avatar} size="xs" />
                  <span className="font-semibold text-surface-900 dark:text-white text-sm truncate">
                    {n.actor.displayName || n.actor.handle}
                  </span>
                  <span className="text-surface-500 dark:text-surface-400 text-sm">
                    {n.type === "like" && "liked your post"}
                    {n.type === "reply" && "replied to you"}
                    {n.type === "follow" && "followed you"}
                    {n.type === "highlight" && "highlighted"}
                  </span>
                  <span className="text-surface-400 dark:text-surface-500 text-xs ml-auto">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: false,
                    })}
                  </span>
                </div>

                {n.subject && (
                  <div className="mt-3 pl-3 border-l-2 border-surface-200 dark:border-surface-700">
                    {n.type === "reply" && n.subject.text ? (
                      <p className="text-surface-600 dark:text-surface-300 text-sm">
                        {n.subject.text}
                      </p>
                    ) : n.subject.uri ? (
                      <Card item={n.subject} hideShare />
                    ) : null}
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
