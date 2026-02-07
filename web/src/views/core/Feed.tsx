import React, { useEffect, useState } from "react";
import { getFeed } from "../../api/client";
import Card from "../../components/common/Card";
import { Loader2, Sparkles, Clock, Bookmark, Users } from "lucide-react";
import { useStore } from "@nanostores/react";
import { $user, initAuth } from "../../store/auth";
import type { AnnotationItem } from "../../types";
import { Tabs, EmptyState, Button } from "../../components/ui";

interface FeedProps {
  initialType?: string;
  motivation?: string;
  showTabs?: boolean;
  emptyMessage?: string;
}

export default function Feed({
  initialType = "all",
  motivation,
  showTabs = true,
  emptyMessage = "No items found.",
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
        const type = activeTab;
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
    setItems((prev) => prev.filter((i) => i.uri !== uri));
  };

  const tabs = [
    { id: "all", label: "Recent" },
    { id: "popular", label: "Popular" },
    { id: "shelved", label: "Shelved" },
    { id: "margin", label: "Margin" },
    { id: "semble", label: "Semble" },
  ];

  if (!user && !loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="text-center py-20 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 mb-6">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3 tracking-tight text-surface-900 dark:text-white">
            Welcome to Margin
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mb-8 text-lg max-w-md mx-auto">
            Annotate, highlight, and bookmark anything on the web. Your curated
            corner of the internet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => (window.location.href = "/login")}>
              Get Started
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() =>
                window.open("https://github.com/margin-at", "_blank")
              }
            >
              Learn More
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="p-5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-3">
              <Sparkles
                size={20}
                className="text-yellow-600 dark:text-yellow-400"
              />
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-white mb-1">
              Highlight
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Save key passages from any page
            </p>
          </div>
          <div className="p-5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Bookmark
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-white mb-1">
              Bookmark
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Keep pages for later reading
            </p>
          </div>
          <div className="p-5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <Users size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-white mb-1">
              Share
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Discover what others are reading
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {showTabs && (
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2
            className="animate-spin text-primary-600 dark:text-primary-400"
            size={32}
          />
          <p className="text-sm text-surface-400 dark:text-surface-500">
            Loading feed...
          </p>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.uri || item.cid}
              item={item}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Clock size={48} />}
          title="Nothing here yet"
          message={emptyMessage}
        />
      )}
    </div>
  );
}
