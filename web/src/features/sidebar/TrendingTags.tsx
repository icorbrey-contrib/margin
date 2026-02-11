import { getTrendingTags, type Tag } from "../../api/client";
import { useEffect, useState } from "react";

export const TrendingTags = () => {
  const [trendingTags, setTrendingTags] = useState<Tag[]>([]);

  useEffect(() => {
    getTrendingTags().then(setTrendingTags);
  }, []);

  return (
    <div>
      <h3 className="font-semibold text-sm px-1 mb-3 text-surface-900 dark:text-white tracking-tight">
        Trending
      </h3>
      {trendingTags.length > 0 ? (
        <div className="flex flex-col">
          {trendingTags.map((tag) => (
            <TrendingTag {...{ tag }} />
          ))}
        </div>
      ) : (
        <div className="px-2">
          <p className="text-sm text-surface-400 dark:text-surface-500">
            Nothing trending right now.
          </p>
        </div>
      )}
    </div>
  );
};

export const TrendingTag = ({ tag: { tag, count } }: { tag: Tag }) => (
  <a
    className="
      px-2 py-2.5 hover:bg-surface-100 dark:hover:bg-surface-800/60 rounded-lg
      transition-colors group
    "
    href={`/home?tag=${encodeURIComponent(tag)}`}
    key={tag}
  >
    <div
      className="
        font-semibold text-sm text-surface-900 dark:text-white group-hover:text-primary-600
        dark:group-hover:text-primary-400 transition-colors
      "
    >
      #{tag}
    </div>
    <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
      {count} {count === 1 ? "post" : "posts"}
    </div>
  </a>
);

export default TrendingTags;
