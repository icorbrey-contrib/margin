import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Github,
  Twitter,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { getTrendingTags, type Tag } from "../../api/client";

export default function RightSidebar() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [browser, setBrowser] = useState<"chrome" | "firefox" | "other">(
    "other",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/url?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("firefox")) setBrowser("firefox");
    else if (ua.includes("chrome")) setBrowser("chrome");
    getTrendingTags().then(setTags);
  }, []);

  const extensionLink =
    browser === "firefox"
      ? "https://addons.mozilla.org/en-US/firefox/addon/margin/"
      : "https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa";

  return (
    <aside className="hidden lg:block w-[280px] shrink-0 sticky top-0 h-screen overflow-y-auto px-4 py-4 border-l border-surface-100/50 dark:border-surface-800/50">
      <div className="space-y-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search
              className="text-surface-400 dark:text-surface-500"
              size={16}
            />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search Margin..."
            className="w-full bg-surface-100 dark:bg-surface-800 rounded-full pl-10 pr-5 py-2.5 text-sm font-medium text-surface-900 dark:text-white placeholder:text-surface-500 dark:placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all border-none"
          />
        </div>

        <div className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-4 border border-surface-100 dark:border-surface-800">
          <h3 className="font-bold text-base mb-1 text-surface-900 dark:text-white">
            Get the Extension
          </h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm mb-4 leading-snug">
            Save anything, annotate anywhere.
          </p>
          <a
            href={extensionLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full px-4 py-2 bg-surface-900 dark:bg-white text-white dark:text-surface-900 rounded-full hover:bg-black dark:hover:bg-surface-100 transition-all text-sm font-semibold"
          >
            Download for {browser === "firefox" ? "Firefox" : "Chrome"}
          </a>
        </div>

        <div className="py-2">
          <h3 className="font-bold text-xl px-2 mb-4 text-surface-900 dark:text-white">
            Trending
          </h3>
          {tags.length > 0 ? (
            <div className="flex flex-col">
              {tags.map((t) => (
                <a
                  key={t.tag}
                  href={`/search?q=${t.tag}`}
                  className="px-2 py-3 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-xl transition-colors group"
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
                      Trending
                    </span>
                    <span className="text-xs text-surface-400 dark:text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      ...
                    </span>
                  </div>
                  <div className="font-bold text-surface-900 dark:text-white">
                    #{t.tag}
                  </div>
                  <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {t.count} posts
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="px-2">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Nothing trending right now.
              </p>
            </div>
          )}
        </div>

        <div className="px-2 pt-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-surface-400 dark:text-surface-500 leading-relaxed">
            <a
              href="#"
              className="hover:underline hover:text-surface-600 dark:hover:text-surface-300"
            >
              About
            </a>
            <a
              href="/privacy"
              className="hover:underline hover:text-surface-600 dark:hover:text-surface-300"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="hover:underline hover:text-surface-600 dark:hover:text-surface-300"
            >
              Terms
            </a>
            <a
              href="https://github.com/margin-at"
              target="_blank"
              rel="noreferrer"
              className="hover:underline hover:text-surface-600 dark:hover:text-surface-300"
            >
              Code
            </a>
            <span>© 2026 Margin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
