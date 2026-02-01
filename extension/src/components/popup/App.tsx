import { useState, useEffect } from 'react';
import { sendMessage } from '@/utils/messaging';
import { themeItem, apiUrlItem, overlayEnabledItem } from '@/utils/storage';
import type { MarginSession, Annotation, Bookmark, Highlight, Collection } from '@/utils/types';
import CollectionIcon from '@/components/CollectionIcon';
import {
  Settings,
  ExternalLink,
  Bookmark as BookmarkIcon,
  Highlighter,
  MessageSquare,
  X,
  Sun,
  Moon,
  Monitor,
  Check,
  Globe,
  ChevronRight,
  Sparkles,
  FolderPlus,
  Folder,
} from 'lucide-react';

type Tab = 'page' | 'bookmarks' | 'highlights' | 'collections';

export function App() {
  const [session, setSession] = useState<MarginSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('page');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [collectionModalItem, setCollectionModalItem] = useState<string | null>(null);
  const [addingToCollection, setAddingToCollection] = useState<string | null>(null);
  const [containingCollections, setContainingCollections] = useState<Set<string>>(new Set());
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState('https://margin.at');
  const [overlayEnabled, setOverlayEnabled] = useState(true);

  useEffect(() => {
    checkSession();
    loadCurrentTab();
    loadTheme();
    loadSettings();
  }, []);

  useEffect(() => {
    if (session?.authenticated && currentUrl) {
      if (activeTab === 'page') loadAnnotations();
      else if (activeTab === 'bookmarks') loadBookmarks();
      else if (activeTab === 'highlights') loadHighlights();
      else if (activeTab === 'collections') loadCollections();
    }
  }, [activeTab, session, currentUrl]);

  async function loadSettings() {
    const url = await apiUrlItem.getValue();
    const overlay = await overlayEnabledItem.getValue();
    setApiUrl(url);
    setOverlayEnabled(overlay);
  }

  async function saveSettings() {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    await apiUrlItem.setValue(cleanUrl);
    await overlayEnabledItem.setValue(overlayEnabled);

    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: 'UPDATE_OVERLAY_VISIBILITY',
            show: overlayEnabled,
          });
        } catch {
          /* ignore */
        }
      }
    }

    setShowSettings(false);
    checkSession();
  }

  async function loadTheme() {
    const t = await themeItem.getValue();
    setTheme(t);
    applyTheme(t);

    themeItem.watch((newTheme) => {
      setTheme(newTheme);
      applyTheme(newTheme);
    });
  }

  function applyTheme(t: string) {
    document.body.classList.remove('light', 'dark');
    if (t === 'system') {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('light');
      }
    } else {
      document.body.classList.add(t);
    }
  }

  async function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    await themeItem.setValue(newTheme);
    setTheme(newTheme);
    applyTheme(newTheme);
  }

  async function checkSession() {
    try {
      const result = await sendMessage('checkSession', undefined);
      setSession(result);
    } catch (error) {
      console.error('Session check error:', error);
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentTab() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      setCurrentUrl(tab.url);
      setCurrentTitle(tab.title || '');
    }
  }

  async function loadAnnotations() {
    if (!currentUrl) return;
    setLoadingAnnotations(true);
    try {
      let result = await sendMessage('getCachedAnnotations', { url: currentUrl });

      if (!result) {
        result = await sendMessage('getAnnotations', { url: currentUrl });
      }

      const filtered = (result || []).filter((item: any) => item.type !== 'Bookmark');
      setAnnotations(filtered);

      const isBookmarked = (result || []).some(
        (item: any) => item.type === 'Bookmark' && item.creator?.did === session?.did
      );
      setBookmarked(isBookmarked);
    } catch (error) {
      console.error('Load annotations error:', error);
    } finally {
      setLoadingAnnotations(false);
    }
  }

  async function loadBookmarks() {
    if (!session?.did) return;
    setLoadingBookmarks(true);
    try {
      const result = await sendMessage('getUserBookmarks', { did: session.did });
      setBookmarks(result || []);
    } catch (error) {
      console.error('Load bookmarks error:', error);
    } finally {
      setLoadingBookmarks(false);
    }
  }

  async function loadHighlights() {
    if (!session?.did) return;
    setLoadingHighlights(true);
    try {
      const result = await sendMessage('getUserHighlights', { did: session.did });
      setHighlights(result || []);
    } catch (error) {
      console.error('Load highlights error:', error);
    } finally {
      setLoadingHighlights(false);
    }
  }

  async function loadCollections() {
    if (!session?.did) return;
    setLoadingCollections(true);
    try {
      const result = await sendMessage('getUserCollections', { did: session.did });
      setCollections(result || []);
    } catch (error) {
      console.error('Load collections error:', error);
    } finally {
      setLoadingCollections(false);
    }
  }

  async function openCollectionModal(itemUri: string) {
    setCollectionModalItem(itemUri);
    setContainingCollections(new Set());

    if (collections.length === 0) {
      await loadCollections();
    }

    try {
      const itemCollectionUris = await sendMessage('getItemCollections', {
        annotationUri: itemUri,
      });
      setContainingCollections(new Set(itemCollectionUris));
    } catch (error) {
      console.error('Failed to get item collections:', error);
    }
  }

  async function handleAddToCollection(collectionUri: string) {
    if (!collectionModalItem) return;

    if (containingCollections.has(collectionUri)) {
      setCollectionModalItem(null);
      return;
    }

    setAddingToCollection(collectionUri);
    try {
      const result = await sendMessage('addToCollection', {
        collectionUri,
        annotationUri: collectionModalItem,
      });
      if (result.success) {
        setContainingCollections((prev) => new Set([...prev, collectionUri]));
      } else {
        alert('Failed to add to collection');
      }
    } catch (error) {
      console.error('Add to collection error:', error);
      alert('Error adding to collection');
    } finally {
      setAddingToCollection(null);
    }
  }

  async function handlePost() {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const result = await sendMessage('createAnnotation', {
        url: currentUrl,
        text: text.trim(),
        title: currentTitle,
      });
      if (result.success) {
        setText('');
        loadAnnotations();
      } else {
        alert('Failed to post annotation');
      }
    } catch (error) {
      console.error('Post error:', error);
      alert('Error posting annotation');
    } finally {
      setPosting(false);
    }
  }

  async function handleBookmark() {
    setBookmarking(true);
    try {
      const result = await sendMessage('createBookmark', {
        url: currentUrl,
        title: currentTitle,
      });
      if (result.success) {
        setBookmarked(true);
      } else {
        alert('Failed to bookmark page');
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      alert('Error bookmarking page');
    } finally {
      setBookmarking(false);
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <div className="flex flex-col h-screen">
        {showSettings && (
          <div className="absolute inset-0 bg-[var(--bg-primary)] z-10 flex flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="font-medium">Settings</span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">API URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                  placeholder="https://margin.at"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                        theme === t
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {t === 'light' ? (
                        <Sun size={12} />
                      ) : t === 'dark' ? (
                        <Moon size={12} />
                      ) : (
                        <Monitor size={12} />
                      )}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={saveSettings}
                className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <img src="/icons/logo.svg" alt="Margin" className="w-12 h-12 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sign in with AT Protocol</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Connect your Bluesky account to annotate, highlight, and bookmark the web.
          </p>
          <button
            onClick={() => browser.tabs.create({ url: `${apiUrl}/login` })}
            className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Continue
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="mt-4 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1"
          >
            <Settings size={12} /> Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {showSettings && (
        <div className="absolute inset-0 bg-[var(--bg-primary)] z-10 flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="font-medium">Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">API URL</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="https://margin.at"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Change this for development or self-hosted instances
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Show page overlays</label>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Highlights, badges, and tooltips on pages
                </p>
              </div>
              <input
                type="checkbox"
                checked={overlayEnabled}
                onChange={(e) => setOverlayEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                      theme === t
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {t === 'light' ? (
                      <Sun size={12} />
                    ) : t === 'dark' ? (
                      <Moon size={12} />
                    ) : (
                      <Monitor size={12} />
                    )}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={saveSettings}
              className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2.5">
          <img src="/icons/logo.svg" alt="Margin" className="w-6 h-6" />
          <span className="font-bold text-sm tracking-tight">Margin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2.5 py-1.5 rounded-full border border-[var(--border)]">
            @{session.handle}
          </div>
        </div>
      </header>

      <div className="flex border-b border-[var(--border)] px-2 gap-0.5 bg-[var(--bg-secondary)]">
        {(['page', 'bookmarks', 'highlights', 'collections'] as Tab[]).map((tab) => {
          const icons: Record<Tab, JSX.Element> = {
            page: <Globe size={13} />,
            bookmarks: <BookmarkIcon size={13} />,
            highlights: <Highlighter size={13} />,
            collections: <Folder size={13} />,
          };
          const labels: Record<Tab, string> = {
            page: 'Page',
            bookmarks: 'Bookmarks',
            highlights: 'Highlights',
            collections: 'Collections',
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-[11px] font-medium flex items-center justify-center gap-1 border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {icons[tab]}
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'page' && (
          <div>
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-start gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {currentUrl ? (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(currentUrl).hostname}&sz=64`}
                      alt=""
                      className="w-6 h-6"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove(
                          'hidden'
                        );
                      }}
                    />
                  ) : null}
                  <Globe
                    size={18}
                    className={`text-[var(--text-tertiary)] ${currentUrl ? 'hidden' : ''}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate mb-0.5">
                    {currentTitle || 'Untitled'}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] truncate">
                    {currentUrl ? new URL(currentUrl).hostname : ''}
                  </div>
                </div>
                <button
                  onClick={handleBookmark}
                  disabled={bookmarking || bookmarked}
                  className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                    bookmarked
                      ? 'bg-[var(--success)]/15 text-[var(--success)]'
                      : 'bg-[var(--bg-hover)] hover:bg-[var(--accent-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
                  }`}
                  title={bookmarked ? 'Bookmarked' : 'Bookmark page'}
                >
                  {bookmarked ? <Check size={16} /> : <BookmarkIcon size={16} />}
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-[var(--border)]">
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share your thoughts on this page..."
                  className="w-full p-3 pb-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] min-h-[90px]"
                />
                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={handlePost}
                    disabled={posting || !text.trim()}
                    className="px-4 py-1.5 bg-[var(--accent)] text-white text-xs rounded-lg font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[var(--text-tertiary)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Annotations
                  </span>
                </div>
                <span className="text-xs font-semibold bg-[var(--accent-subtle)] text-[var(--accent)] px-2.5 py-1 rounded-full">
                  {annotations.length}
                </span>
              </div>

              {loadingAnnotations ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              ) : annotations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4">
                    <Sparkles size={24} className="opacity-40" />
                  </div>
                  <p className="text-sm font-medium mb-1">No annotations yet</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Be the first to annotate this page
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {annotations.map((item) => (
                    <AnnotationCard
                      key={item.uri || item.id}
                      item={item}
                      formatDate={formatDate}
                      onAddToCollection={() => openCollectionModal(item.uri || item.id || '')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="p-4">
            {loadingBookmarks ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent)] border-t-transparent" />
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4">
                  <BookmarkIcon size={24} className="opacity-40" />
                </div>
                <p className="text-sm font-medium mb-1">No bookmarks yet</p>
                <p className="text-xs text-[var(--text-tertiary)]">Save pages to read later</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((item) => (
                  <div
                    key={item.uri || item.id}
                    className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center flex-shrink-0">
                      <BookmarkIcon size={16} className="text-[var(--accent)]" />
                    </div>
                    <a
                      href={item.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0"
                    >
                      <div className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                        {item.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate">
                        {item.source ? new URL(item.source).hostname : ''}
                      </div>
                    </a>
                    <button
                      onClick={() => openCollectionModal(item.uri || item.id || '')}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-all"
                      title="Add to collection"
                    >
                      <FolderPlus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="p-4">
            {loadingHighlights ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent)] border-t-transparent" />
              </div>
            ) : highlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4">
                  <Highlighter size={24} className="opacity-40" />
                </div>
                <p className="text-sm font-medium mb-1">No highlights yet</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Select text on any page to highlight
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {highlights.map((item) => (
                  <div
                    key={item.uri || item.id}
                    className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-all group"
                  >
                    {item.target?.selector?.exact && (
                      <div
                        className="text-sm leading-relaxed border-l-3 pl-3 mb-3 py-1"
                        style={{
                          borderColor: item.color || '#fbbf24',
                          background: `linear-gradient(90deg, ${item.color || '#fbbf24'}15, transparent)`,
                        }}
                      >
                        "
                        {item.target.selector.exact.length > 120
                          ? item.target.selector.exact.slice(0, 120) + '...'
                          : item.target.selector.exact}
                        "
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] flex-1 cursor-pointer hover:text-[var(--accent)]"
                        onClick={() => {
                          if (item.target?.source) {
                            browser.tabs.create({ url: item.target.source });
                          }
                        }}
                      >
                        <Globe size={12} />
                        {item.target?.source ? new URL(item.target.source).hostname : ''}
                        <ChevronRight
                          size={14}
                          className="ml-auto text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors"
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCollectionModal(item.uri || item.id || '');
                        }}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-all ml-2"
                        title="Add to collection"
                      >
                        <FolderPlus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="p-4">
            {loadingCollections ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent)] border-t-transparent" />
              </div>
            ) : collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4">
                  <Folder size={24} className="opacity-40" />
                </div>
                <p className="text-sm font-medium mb-1">No collections yet</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Organize your annotations into collections
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {collections.map((item) => (
                  <button
                    key={item.uri || item.id}
                    onClick={() =>
                      browser.tabs.create({
                        url: `${apiUrl}/collection/${encodeURIComponent(item.uri || item.id || '')}`,
                      })
                    }
                    className="w-full text-left p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-all group flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 text-[var(--accent)] text-lg">
                      <CollectionIcon icon={item.icon} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-[var(--accent)] transition-colors">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-[var(--text-tertiary)] truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {collectionModalItem && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setCollectionModalItem(null)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-[90%] max-w-[340px] max-h-[80vh] overflow-hidden shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold">Add to Collection</h3>
              <button
                onClick={() => setCollectionModalItem(null)}
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto">
              {loadingCollections ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              ) : collections.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-tertiary)]">
                  <Folder size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No collections yet</p>
                  <p className="text-xs mt-1">Create collections on margin.at</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map((col) => {
                    const colUri = col.uri || col.id || '';
                    const isInCollection = containingCollections.has(colUri);
                    const isAdding = addingToCollection === colUri;
                    return (
                      <button
                        key={colUri}
                        onClick={() => !isInCollection && handleAddToCollection(colUri)}
                        disabled={isAdding || isInCollection}
                        className={`w-full text-left p-3 border rounded-xl transition-all flex items-center gap-3 ${
                          isInCollection
                            ? 'bg-emerald-400/10 border-emerald-400/30 cursor-default'
                            : 'bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base ${
                            isInCollection
                              ? 'bg-emerald-400/15 text-emerald-400'
                              : 'bg-[var(--accent)]/15 text-[var(--accent)]'
                          }`}
                        >
                          <CollectionIcon icon={col.icon} size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{col.name}</div>
                        </div>
                        {isAdding ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent)] border-t-transparent" />
                        ) : isInCollection ? (
                          <Check size={16} className="text-emerald-400" />
                        ) : (
                          <FolderPlus size={16} className="text-[var(--text-tertiary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <button
          onClick={() => browser.tabs.create({ url: apiUrl })}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:bg-[var(--accent-subtle)] transition-all"
        >
          Open Margin <ExternalLink size={12} />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-all"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </footer>
    </div>
  );
}

function AnnotationCard({
  item,
  formatDate,
  onAddToCollection,
}: {
  item: Annotation;
  formatDate: (d?: string) => string;
  onAddToCollection?: () => void;
}) {
  const author = item.author || item.creator || {};
  const handle = author.handle || 'User';
  const text = item.body?.value || item.text || '';
  const selector = item.target?.selector;
  const quote = selector?.exact || '';
  const isHighlight = (item as any).type === 'Highlight';

  return (
    <div className="px-4 py-4 hover:bg-[var(--bg-hover)] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm">
          {author.avatar ? (
            <img src={author.avatar} alt={handle} className="w-full h-full object-cover" />
          ) : (
            handle[0]?.toUpperCase() || 'U'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold hover:text-[var(--accent)] cursor-pointer transition-colors">
              @{handle}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {formatDate(item.created || item.createdAt)}
            </span>
            {isHighlight && (
              <span className="text-[10px] font-semibold bg-[var(--warning)]/15 text-[var(--warning)] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Highlighter size={10} /> Highlight
              </span>
            )}
            {onAddToCollection && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCollection();
                }}
                className="ml-auto p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded transition-all"
                title="Add to collection"
              >
                <FolderPlus size={14} />
              </button>
            )}
          </div>

          {quote && (
            <div
              className="text-sm text-[var(--text-secondary)] border-l-2 border-[var(--accent)] pl-3 mb-2.5 py-1.5 rounded-r bg-[var(--accent-subtle)] italic cursor-pointer hover:bg-[var(--accent)]/20 transition-colors"
              onClick={async (e) => {
                e.stopPropagation();
                const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                  browser.tabs.sendMessage(tab.id, { type: 'SCROLL_TO_TEXT', text: quote });
                  window.close();
                }
              }}
              title="Jump to text on page"
            >
              "{quote.length > 100 ? quote.slice(0, 100) + '...' : quote}"
            </div>
          )}

          {text && (
            <div className="text-[13px] leading-relaxed text-[var(--text-primary)]">{text}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
