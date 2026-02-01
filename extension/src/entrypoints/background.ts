import { onMessage } from '@/utils/messaging';
import type { Annotation } from '@/utils/types';
import {
  checkSession,
  getAnnotations,
  createAnnotation,
  createBookmark,
  createHighlight,
  getUserBookmarks,
  getUserHighlights,
  getUserCollections,
  addToCollection,
  getItemCollections,
  getReplies,
  createReply,
} from '@/utils/api';
import { overlayEnabledItem, apiUrlItem } from '@/utils/storage';

export default defineBackground(() => {
  console.log('Margin extension loaded');

  const annotationCache = new Map<string, { annotations: Annotation[]; timestamp: number }>();
  const CACHE_TTL = 60000;

  onMessage('checkSession', async () => {
    return await checkSession();
  });

  onMessage('getAnnotations', async ({ data }) => {
    return await getAnnotations(data.url);
  });

  onMessage('createAnnotation', async ({ data }) => {
    return await createAnnotation(data);
  });

  onMessage('createBookmark', async ({ data }) => {
    return await createBookmark(data);
  });

  onMessage('createHighlight', async ({ data }) => {
    return await createHighlight(data);
  });

  onMessage('getUserBookmarks', async ({ data }) => {
    return await getUserBookmarks(data.did);
  });

  onMessage('getUserHighlights', async ({ data }) => {
    return await getUserHighlights(data.did);
  });

  onMessage('getUserCollections', async ({ data }) => {
    return await getUserCollections(data.did);
  });

  onMessage('addToCollection', async ({ data }) => {
    return await addToCollection(data.collectionUri, data.annotationUri);
  });

  onMessage('getItemCollections', async ({ data }) => {
    return await getItemCollections(data.annotationUri);
  });

  onMessage('getReplies', async ({ data }) => {
    return await getReplies(data.uri);
  });

  onMessage('createReply', async ({ data }) => {
    return await createReply(data);
  });

  onMessage('getOverlayEnabled', async () => {
    return await overlayEnabledItem.getValue();
  });

  onMessage('openAppUrl', async ({ data }) => {
    const apiUrl = await apiUrlItem.getValue();
    await browser.tabs.create({ url: `${apiUrl}${data.path}` });
  });

  onMessage('updateBadge', async ({ data }) => {
    const { count, tabId } = data;
    const text = count > 0 ? String(count > 99 ? '99+' : count) : '';

    if (tabId) {
      await browser.action.setBadgeText({ text, tabId });
      await browser.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });
    } else {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await browser.action.setBadgeText({ text, tabId: tab.id });
        await browser.action.setBadgeBackgroundColor({ color: '#6366f1', tabId: tab.id });
      }
    }
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
      await browser.action.setBadgeText({ text: '', tabId });
    }
  });

  onMessage('cacheAnnotations', async ({ data }) => {
    const { url, annotations } = data;
    const normalizedUrl = normalizeUrl(url);
    annotationCache.set(normalizedUrl, { annotations, timestamp: Date.now() });
  });

  onMessage('getCachedAnnotations', async ({ data }) => {
    const normalizedUrl = normalizeUrl(data.url);
    const cached = annotationCache.get(normalizedUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.annotations;
    }
    return null;
  });

  function normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hash = '';
      const path = u.pathname.replace(/\/$/, '') || '/';
      return `${u.origin}${path}${u.search}`;
    } catch {
      return url;
    }
  }

  async function ensureContextMenus() {
    await browser.contextMenus.removeAll();

    browser.contextMenus.create({
      id: 'margin-annotate',
      title: 'Annotate "%s"',
      contexts: ['selection'],
    });

    browser.contextMenus.create({
      id: 'margin-highlight',
      title: 'Highlight "%s"',
      contexts: ['selection'],
    });

    browser.contextMenus.create({
      id: 'margin-bookmark',
      title: 'Bookmark this page',
      contexts: ['page'],
    });

    browser.contextMenus.create({
      id: 'margin-open-sidebar',
      title: 'Open Margin Sidebar',
      contexts: ['page', 'selection', 'link'],
    });
  }

  browser.runtime.onInstalled.addListener(async () => {
    await ensureContextMenus();
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureContextMenus();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'margin-open-sidebar') {
      const browserAny = browser as any;
      if (browserAny.sidePanel && tab?.windowId) {
        browserAny.sidePanel.open({ windowId: tab.windowId }).catch((err: Error) => {
          console.error('Could not open side panel:', err);
        });
      } else if (browserAny.sidebarAction) {
        browserAny.sidebarAction.open().catch((err: Error) => {
          console.warn('Could not open Firefox sidebar:', err);
        });
      }
      return;
    }

    handleContextMenuAction(info, tab);
  });

  async function handleContextMenuAction(info: any, tab?: any) {
    const apiUrl = await apiUrlItem.getValue();

    if (info.menuItemId === 'margin-bookmark' && tab?.url) {
      const session = await checkSession();
      if (!session.authenticated) {
        await browser.tabs.create({ url: `${apiUrl}/login` });
        return;
      }

      const result = await createBookmark({
        url: tab.url,
        title: tab.title,
      });

      if (result.success) {
        showNotification('Margin', 'Page bookmarked!');
      }
      return;
    }

    if (info.menuItemId === 'margin-annotate' && tab?.url && info.selectionText) {
      const session = await checkSession();
      if (!session.authenticated) {
        await browser.tabs.create({ url: `${apiUrl}/login` });
        return;
      }

      try {
        await browser.tabs.sendMessage(tab.id!, {
          type: 'SHOW_INLINE_ANNOTATE',
          data: {
            url: tab.url,
            title: tab.title,
            selector: {
              type: 'TextQuoteSelector',
              exact: info.selectionText,
            },
          },
        });
      } catch {
        let composeUrl = `${apiUrl}/new?url=${encodeURIComponent(tab.url)}`;
        composeUrl += `&selector=${encodeURIComponent(
          JSON.stringify({
            type: 'TextQuoteSelector',
            exact: info.selectionText,
          })
        )}`;
        await browser.tabs.create({ url: composeUrl });
      }
      return;
    }

    if (info.menuItemId === 'margin-highlight' && tab?.url && info.selectionText) {
      const session = await checkSession();
      if (!session.authenticated) {
        await browser.tabs.create({ url: `${apiUrl}/login` });
        return;
      }

      const result = await createHighlight({
        url: tab.url,
        title: tab.title,
        selector: {
          type: 'TextQuoteSelector',
          exact: info.selectionText,
        },
      });

      if (result.success) {
        showNotification('Margin', 'Text highlighted!');
        try {
          await browser.tabs.sendMessage(tab.id!, { type: 'REFRESH_ANNOTATIONS' });
        } catch {
          /* ignore */
        }
      }
      return;
    }
  }

  function showNotification(title: string, message: string) {
    const browserAny = browser as any;
    if (browserAny.notifications) {
      browserAny.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-128.png',
        title,
        message,
      });
    }
  }

  browser.commands?.onCommand.addListener((command) => {
    if (command === 'open-sidebar') {
      const browserAny = browser as any;
      if (browserAny.sidePanel) {
        chrome.windows.getCurrent((win) => {
          if (win?.id) {
            browserAny.sidePanel.open({ windowId: win.id }).catch((err: Error) => {
              console.error('Could not open side panel:', err);
            });
          }
        });
      } else if (browserAny.sidebarAction) {
        browserAny.sidebarAction.open().catch((err: Error) => {
          console.warn('Could not open Firefox sidebar:', err);
        });
      }
      return;
    }

    handleCommandAsync(command);
  });

  async function handleCommandAsync(command: string) {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (command === 'toggle-overlay') {
      const current = await overlayEnabledItem.getValue();
      await overlayEnabledItem.setValue(!current);
      return;
    }

    if (command === 'bookmark-page' && tab?.url) {
      const session = await checkSession();
      if (!session.authenticated) {
        const apiUrl = await apiUrlItem.getValue();
        await browser.tabs.create({ url: `${apiUrl}/login` });
        return;
      }

      const result = await createBookmark({
        url: tab.url,
        title: tab.title,
      });

      if (result.success) {
        showNotification('Margin', 'Page bookmarked!');
      }
      return;
    }

    if ((command === 'annotate-selection' || command === 'highlight-selection') && tab?.id) {
      try {
        const selection = (await browser.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' })) as
          | { text?: string }
          | undefined;
        if (!selection?.text) return;

        const session = await checkSession();
        if (!session.authenticated) {
          const apiUrl = await apiUrlItem.getValue();
          await browser.tabs.create({ url: `${apiUrl}/login` });
          return;
        }

        if (command === 'annotate-selection') {
          await browser.tabs.sendMessage(tab.id, {
            type: 'SHOW_INLINE_ANNOTATE',
            data: { selector: { exact: selection.text } },
          });
        } else if (command === 'highlight-selection') {
          const result = await createHighlight({
            url: tab.url!,
            title: tab.title,
            selector: {
              type: 'TextQuoteSelector',
              exact: selection.text,
            },
          });

          if (result.success) {
            showNotification('Margin', 'Text highlighted!');
            await browser.tabs.sendMessage(tab.id, { type: 'REFRESH_ANNOTATIONS' });
          }
        }
      } catch (err) {
        console.error('Error handling keyboard shortcut:', err);
      }
    }
  }
});
