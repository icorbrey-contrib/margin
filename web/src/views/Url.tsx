import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '@nanostores/react';
import { $user } from '../store/auth';
import { getByTarget, searchActors, resolveHandle } from '../api/client';
import type { AnnotationItem, ActorSearchItem } from '../types';
import Card from '../components/Card';
import { Search, PenTool, Highlighter, Loader2, AlertTriangle, ExternalLink, Copy, Check, Link as LinkIcon, Clock, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { getAvatarUrl } from '../api/client';

export default function UrlPage() {
    const user = useStore($user);
    const navigate = useNavigate();
    const [url, setUrl] = useState("");
    const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
    const [highlights, setHighlights] = useState<AnnotationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'annotations' | 'highlights'>('all');
    const [copied, setCopied] = useState(false);

    const [suggestions, setSuggestions] = useState<ActorSearchItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('margin-recent-searches');
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored).slice(0, 5));
            } catch { }
        }
    }, []);

    const saveRecentSearch = (query: string) => {
        const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('margin-recent-searches', JSON.stringify(updated));
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            const isUrl = url.includes("http") || url.includes("://");
            if (url.length >= 2 && !isUrl) {
                try {
                    const data = await searchActors(url);
                    setSuggestions(data.actors || []);
                    setShowSuggestions(true);
                } catch { }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [url]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, -1));
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (actor: ActorSearchItem) => {
        navigate(`/profile/${encodeURIComponent(actor.handle)}`);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);
        setAnnotations([]);
        setHighlights([]);

        const isProtocol = url.startsWith("http://") || url.startsWith("https://");
        if (!isProtocol) {
            try {
                const actorRes = await searchActors(url);
                if (actorRes?.actors?.length > 0) {
                    const match = actorRes.actors[0];
                    navigate(`/profile/${encodeURIComponent(match.handle)}`);
                    return;
                }
            } catch { }
        }

        try {
            const data = await getByTarget(url);
            setAnnotations(data.annotations || []);
            setHighlights(data.highlights || []);
            saveRecentSearch(url);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setShowSuggestions(false);
        }
    };

    const myAnnotations = user
        ? annotations.filter((a) => (a.author?.did || a.creator?.did) === user.did)
        : [];
    const myHighlights = user
        ? highlights.filter((h) => (h.author?.did || h.creator?.did) === user.did)
        : [];
    const myItemsCount = myAnnotations.length + myHighlights.length;

    const getShareUrl = () => {
        if (!user?.handle || !url) return null;
        return `${window.location.origin}/${user.handle}/url/${encodeURIComponent(url)}`;
    };

    const handleCopyShareLink = async () => {
        const shareUrl = getShareUrl();
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            prompt("Copy this link:", shareUrl);
        }
    };

    const totalItems = annotations.length + highlights.length;

    const renderResults = () => {
        if (activeTab === "annotations" && annotations.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-50 dark:bg-surface-800/50 border border-dashed border-surface-200 dark:border-surface-700 rounded-2xl">
                    <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400 dark:text-surface-500 mb-4">
                        <PenTool size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-surface-600 dark:text-surface-300">No annotations</h3>
                </div>
            );
        }

        if (activeTab === "highlights" && highlights.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-50 dark:bg-surface-800/50 border border-dashed border-surface-200 dark:border-surface-700 rounded-2xl">
                    <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400 dark:text-surface-500 mb-4">
                        <Highlighter size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-surface-600 dark:text-surface-300">No highlights</h3>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {(activeTab === "all" || activeTab === "annotations") &&
                    annotations.map((a) => <Card key={a.uri} item={a} />)}
                {(activeTab === "all" || activeTab === "highlights") &&
                    highlights.map((h) => <Card key={h.uri} item={h} />)}
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-2">Explore</h1>
                <p className="text-surface-500 dark:text-surface-400">
                    Search for a URL or find a user
                </p>
            </div>

            <form onSubmit={handleSearch} className="mb-6 relative z-10">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        {loading ? (
                            <Loader2 className="animate-spin text-primary-500" size={20} />
                        ) : (
                            <Search className="text-surface-400 dark:text-surface-500" size={20} />
                        )}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="https://... or @handle"
                        className="w-full pl-12 pr-24 py-3.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 dark:focus:border-primary-400 outline-none transition-all text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500"
                        autoComplete="off"
                        required
                    />
                    <div className="absolute inset-y-1.5 right-1.5">
                        <button
                            type="submit"
                            className="h-full px-5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70"
                            disabled={loading}
                        >
                            Search
                        </button>
                    </div>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-900 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden max-h-[280px] overflow-y-auto"
                    >
                        {suggestions.map((actor, index) => (
                            <button
                                key={actor.did}
                                type="button"
                                className={clsx(
                                    "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-surface-100 dark:border-surface-800 last:border-0",
                                    index === selectedIndex ? "bg-surface-50 dark:bg-surface-800" : "hover:bg-surface-50 dark:hover:bg-surface-800"
                                )}
                                onClick={() => selectSuggestion(actor)}
                            >
                                {getAvatarUrl(actor.did, actor.avatar) ? (
                                    <img src={getAvatarUrl(actor.did, actor.avatar)} alt="" className="w-10 h-10 rounded-full object-cover bg-surface-100 dark:bg-surface-800" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center font-bold text-surface-500 dark:text-surface-400">
                                        {(actor.displayName || actor.handle || "?")[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="font-semibold text-surface-900 dark:text-white">{actor.displayName || actor.handle}</span>
                                    <span className="text-sm text-surface-500 dark:text-surface-400">@{actor.handle}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </form>

            {!searched && recentSearches.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-3 flex items-center gap-2">
                        <Clock size={14} /> Recent
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {recentSearches.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => { setUrl(q); }}
                                className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-sm text-surface-700 dark:text-surface-300 transition-colors flex items-center gap-1.5 max-w-[200px] truncate"
                            >
                                <Globe size={12} className="shrink-0" />
                                <span className="truncate">{q.replace(/^https?:\/\//, '')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                    <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                    <p>{error}</p>
                </div>
            )}

            {searched && !loading && !error && totalItems === 0 && (
                <div className="text-center py-12">
                    <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-400 dark:text-surface-500">
                        <Search size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">No items found</h3>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        Be the first to annotate this URL!
                    </p>
                </div>
            )}

            {searched && totalItems > 0 && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                            {totalItems} result{totalItems !== 1 ? "s" : ""}
                        </h2>
                        <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
                            {[
                                { id: 'all', label: `All (${totalItems})` },
                                { id: 'annotations', label: `Notes (${annotations.length})` },
                                { id: 'highlights', label: `Highlights (${highlights.length})` }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        activeTab === tab.id
                                            ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
                                            : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
                                    )}
                                    onClick={() => setActiveTab(tab.id as any)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {user && myItemsCount > 0 && (
                        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                            <span className="text-sm text-primary-900 dark:text-primary-100 font-medium">
                                You have {myItemsCount} note{myItemsCount !== 1 ? 's' : ''} here
                            </span>
                            <button
                                onClick={handleCopyShareLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copied!" : "Share"}
                            </button>
                        </div>
                    )}

                    {renderResults()}
                </div>
            )}
        </div>
    );
}
