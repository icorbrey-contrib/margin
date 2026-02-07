import React, { useEffect, useState } from "react";
import { getFeed } from "../../api/client";
import Card from "../common/Card";
import { Loader2 } from "lucide-react";
import { useStore } from "@nanostores/react";
import { $user, initAuth } from "../../store/auth";
import type { AnnotationItem } from "../../types";
import { Tabs, EmptyState } from "../ui";

interface MasonryFeedProps {
  motivation?: string;
  emptyMessage?: string;
  showTabs?: boolean;
  title?: string;
}

export default function MasonryFeed({
  motivation,
  emptyMessage = "No items found.",
  showTabs = false,
  title,
}: MasonryFeedProps) {
  const user = useStore($user);
  const [items, setItems] = useState<AnnotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my");

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const params: { type?: string; motivation?: string; creator?: string } =
          {
            motivation,
          };

        if (activeTab === "my" && user?.did) {
          params.creator = user.did;
          params.type = "my-feed";
        } else {
          params.type = "all";
        }

        const data = await getFeed(params);
        setItems(data?.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [motivation, activeTab, user?.did]);

  const handleDelete = (uri: string) => {
    setItems((prev) => prev.filter((i) => i.uri !== uri));
  };

  const tabs = [
    { id: "my", label: "My" },
    { id: "global", label: "Global" },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {title && (
        <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-6 text-center lg:text-left">
          {title}
        </h1>
      )}

      {showTabs && (
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2
            className="animate-spin text-primary-600 dark:text-primary-400"
            size={32}
          />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          message={
            activeTab === "my"
              ? emptyMessage
              : `No ${motivation === "bookmarking" ? "bookmarks" : "highlights"} from the community yet.`
          }
        />
      ) : (
        <div className="columns-1 xl:columns-2 gap-4 animate-fade-in">
          {items.map((item) => (
            <div key={item.uri || item.cid} className="break-inside-avoid mb-4">
              <Card item={item} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
