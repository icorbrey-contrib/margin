import { sendMessage } from '@/utils/messaging';
import { overlayEnabledItem, themeItem } from '@/utils/storage';
import { overlayStyles } from '@/utils/overlay-styles';
import { DOMTextMatcher } from '@/utils/text-matcher';
import type { Annotation } from '@/utils/types';
import { APP_URL } from '@/utils/types';

const Icons = {
  annotate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  highlight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  highlightMarker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>`,
};

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    let overlayHost: HTMLElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let popoverEl: HTMLElement | null = null;
    let hoverIndicator: HTMLElement | null = null;
    let composeModal: HTMLElement | null = null;
    let activeItems: Array<{ range: Range; item: Annotation }> = [];
    let cachedMatcher: DOMTextMatcher | null = null;
    const injectedStyles = new Set<string>();
    let overlayEnabled = true;

    function initOverlay() {
      overlayHost = document.createElement('div');
      overlayHost.id = 'margin-overlay-host';
      overlayHost.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; 
        height: 0; overflow: visible;
        pointer-events: none; z-index: 2147483647;
      `;
      if (document.body) {
        document.body.appendChild(overlayHost);
      } else {
        document.documentElement.appendChild(overlayHost);
      }

      shadowRoot = overlayHost.attachShadow({ mode: 'open' });

      const styleEl = document.createElement('style');
      styleEl.textContent = overlayStyles;
      shadowRoot.appendChild(styleEl);
      const overlayContainer = document.createElement('div');
      overlayContainer.className = 'margin-overlay';
      overlayContainer.id = 'margin-overlay-container';
      shadowRoot.appendChild(overlayContainer);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleDocumentClick, true);
      document.addEventListener('keydown', handleKeyDown);
    }
    if (document.body) {
      initOverlay();
    } else {
      document.addEventListener('DOMContentLoaded', initOverlay);
    }

    overlayEnabledItem.getValue().then((enabled) => {
      overlayEnabled = enabled;
      if (!enabled && overlayHost) {
        overlayHost.style.display = 'none';
        sendMessage('updateBadge', { count: 0 });
      } else {
        applyTheme();
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => fetchAnnotations(), { timeout: 2000 });
        } else {
          setTimeout(() => fetchAnnotations(), 100);
        }
      }
    });

    ctx.onInvalidated(() => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      overlayHost?.remove();
    });

    async function applyTheme() {
      if (!overlayHost) return;
      const theme = await themeItem.getValue();
      overlayHost.classList.remove('light', 'dark');
      if (theme === 'system' || !theme) {
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
          overlayHost.classList.add('light');
        }
      } else {
        overlayHost.classList.add(theme);
      }
    }

    themeItem.watch((newTheme) => {
      if (overlayHost) {
        overlayHost.classList.remove('light', 'dark');
        if (newTheme === 'system') {
          if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            overlayHost.classList.add('light');
          }
        } else {
          overlayHost.classList.add(newTheme);
        }
      }
    });

    overlayEnabledItem.watch((enabled) => {
      overlayEnabled = enabled;
      if (overlayHost) {
        overlayHost.style.display = enabled ? '' : 'none';
        if (enabled) {
          fetchAnnotations();
        } else {
          activeItems = [];
          if (typeof CSS !== 'undefined' && CSS.highlights) {
            CSS.highlights.clear();
          }
          sendMessage('updateBadge', { count: 0 });
        }
      }
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (composeModal) {
          composeModal.remove();
          composeModal = null;
        }
        if (popoverEl) {
          popoverEl.remove();
          popoverEl = null;
        }
      }
    }

    function showComposeModal(quoteText: string) {
      if (!shadowRoot) return;

      const container = shadowRoot.getElementById('margin-overlay-container');
      if (!container) return;

      if (composeModal) composeModal.remove();

      composeModal = document.createElement('div');
      composeModal.className = 'inline-compose-modal';

      const left = Math.max(20, (window.innerWidth - 380) / 2);
      const top = Math.max(60, window.innerHeight * 0.2);

      composeModal.style.left = `${left}px`;
      composeModal.style.top = `${top}px`;

      const truncatedQuote = quoteText.length > 150 ? quoteText.slice(0, 150) + '...' : quoteText;

      composeModal.innerHTML = `
        <div class="compose-header">
          <span class="compose-title">New Annotation</span>
          <button class="compose-close">${Icons.close}</button>
        </div>
        <div class="compose-body">
          <div class="inline-compose-quote">"${escapeHtml(truncatedQuote)}"</div>
          <textarea class="inline-compose-textarea" placeholder="Write your annotation..."></textarea>
        </div>
        <div class="compose-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-submit">Post</button>
        </div>
      `;

      composeModal.querySelector('.compose-close')?.addEventListener('click', () => {
        composeModal?.remove();
        composeModal = null;
      });

      composeModal.querySelector('.btn-cancel')?.addEventListener('click', () => {
        composeModal?.remove();
        composeModal = null;
      });

      const textarea = composeModal.querySelector(
        '.inline-compose-textarea'
      ) as HTMLTextAreaElement;
      const submitBtn = composeModal.querySelector('.btn-submit') as HTMLButtonElement;

      submitBtn.addEventListener('click', async () => {
        const text = textarea?.value.trim();
        if (!text) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
          await sendMessage('createAnnotation', {
            url: window.location.href,
            title: document.title,
            text,
            selector: { type: 'TextQuoteSelector', exact: quoteText },
          });

          showToast('Annotation created!', 'success');
          composeModal?.remove();
          composeModal = null;

          setTimeout(() => fetchAnnotations(), 500);
        } catch (error) {
          console.error('Failed to create annotation:', error);
          showToast('Failed to create annotation', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post';
        }
      });

      container.appendChild(composeModal);
      setTimeout(() => textarea?.focus(), 100);
    }
    browser.runtime.onMessage.addListener((message: any) => {
      if (message.type === 'SHOW_INLINE_ANNOTATE' && message.data?.selector?.exact) {
        showComposeModal(message.data.selector.exact);
      }
      if (message.type === 'REFRESH_ANNOTATIONS') {
        fetchAnnotations();
      }
      if (message.type === 'SCROLL_TO_TEXT' && message.text) {
        scrollToText(message.text);
      }
      if (message.type === 'GET_SELECTION') {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';
        return Promise.resolve({ text });
      }
    });

    function scrollToText(text: string) {
      if (!text || text.length < 10) return;

      const searchText = text.slice(0, 150);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const content = node.textContent || '';
        const index = content.indexOf(searchText.slice(0, 50));
        if (index !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, Math.min(index + searchText.length, content.length));

          const rect = range.getBoundingClientRect();
          const scrollY = window.scrollY + rect.top - window.innerHeight / 3;

          window.scrollTo({ top: scrollY, behavior: 'smooth' });

          const highlight = document.createElement('mark');
          highlight.style.cssText =
            'background: #6366f1; color: white; padding: 2px 0; border-radius: 2px; transition: background 0.5s;';
          range.surroundContents(highlight);

          setTimeout(() => {
            highlight.style.background = 'transparent';
            highlight.style.color = 'inherit';
            setTimeout(() => {
              const parent = highlight.parentNode;
              if (parent) {
                parent.replaceChild(
                  document.createTextNode(highlight.textContent || ''),
                  highlight
                );
                parent.normalize();
              }
            }, 500);
          }, 1500);

          return;
        }
      }
    }

    function showToast(message: string, type: 'success' | 'error' = 'success') {
      if (!shadowRoot) return;

      const container = shadowRoot.getElementById('margin-overlay-container');
      if (!container) return;

      container.querySelectorAll('.margin-toast').forEach((el) => el.remove());

      const toast = document.createElement('div');
      toast.className = `margin-toast ${type === 'success' ? 'toast-success' : ''}`;
      toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? Icons.check : Icons.close}</span>
        <span>${message}</span>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 200);
      }, 2500);
    }

    async function fetchAnnotations(retryCount = 0) {
      if (!overlayEnabled) {
        sendMessage('updateBadge', { count: 0 });
        return;
      }

      try {
        const _citedUrls = Array.from(document.querySelectorAll('[cite]'))
          .map((el) => el.getAttribute('cite'))
          .filter((url): url is string => !!url && url.startsWith('http'));

        const annotations = await sendMessage('getAnnotations', { url: window.location.href });

        sendMessage('updateBadge', { count: annotations?.length || 0 });

        if (annotations) {
          sendMessage('cacheAnnotations', { url: window.location.href, annotations });
        }

        if (annotations && annotations.length > 0) {
          renderBadges(annotations);
        } else if (retryCount < 3) {
          setTimeout(() => fetchAnnotations(retryCount + 1), 1000 * (retryCount + 1));
        }
      } catch (error) {
        console.error('Failed to fetch annotations:', error);
        if (retryCount < 3) {
          setTimeout(() => fetchAnnotations(retryCount + 1), 1000 * (retryCount + 1));
        }
      }
    }

    function renderBadges(annotations: Annotation[]) {
      if (!shadowRoot) return;

      activeItems = [];
      const rangesByColor: Record<string, Range[]> = {};

      if (!cachedMatcher) {
        cachedMatcher = new DOMTextMatcher();
      }
      const matcher = cachedMatcher;

      annotations.forEach((item) => {
        const selector = item.target?.selector || item.selector;
        if (!selector?.exact) return;

        const range = matcher.findRange(selector.exact);
        if (range) {
          activeItems.push({ range, item });

          const isHighlight = (item as any).type === 'Highlight';
          const defaultColor = isHighlight ? '#f59e0b' : '#6366f1';
          const color = item.color || defaultColor;
          if (!rangesByColor[color]) rangesByColor[color] = [];
          rangesByColor[color].push(range);
        }
      });

      if (typeof CSS !== 'undefined' && CSS.highlights) {
        CSS.highlights.clear();
        for (const [color, ranges] of Object.entries(rangesByColor)) {
          const highlight = new Highlight(...ranges);
          const safeColor = color.replace(/[^a-zA-Z0-9]/g, '');
          const name = `margin-hl-${safeColor}`;
          CSS.highlights.set(name, highlight);
          injectHighlightStyle(name, color);
        }
      }
    }

    function injectHighlightStyle(name: string, color: string) {
      if (injectedStyles.has(name)) return;
      const style = document.createElement('style');
      style.textContent = `
        ::highlight(${name}) {
          text-decoration: underline;
          text-decoration-color: ${color};
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
      injectedStyles.add(name);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!overlayEnabled || !overlayHost) return;

      const x = e.clientX;
      const y = e.clientY;

      const foundItems: Array<{ range: Range; item: Annotation; rect: DOMRect }> = [];
      let firstRange: Range | null = null;

      for (const { range, item } of activeItems) {
        const rects = range.getClientRects();
        for (const rect of rects) {
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            let container: Node | null = range.commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) {
              container = container.parentNode;
            }

            if (
              container &&
              ((e.target as Node).contains(container) || container.contains(e.target as Node))
            ) {
              if (!firstRange) firstRange = range;
              if (!foundItems.some((f) => f.item === item)) {
                foundItems.push({ range, item, rect });
              }
            }
            break;
          }
        }
      }

      if (foundItems.length > 0 && shadowRoot) {
        document.body.style.cursor = 'pointer';

        if (!hoverIndicator) {
          const container = shadowRoot.getElementById('margin-overlay-container');
          if (container) {
            hoverIndicator = document.createElement('div');
            hoverIndicator.className = 'margin-hover-indicator';
            container.appendChild(hoverIndicator);
          }
        }

        if (hoverIndicator && firstRange) {
          const authorsMap = new Map<string, any>();
          foundItems.forEach(({ item }) => {
            const author = item.author || item.creator || {};
            const id = author.did || author.handle || 'unknown';
            if (!authorsMap.has(id)) {
              authorsMap.set(id, author);
            }
          });

          const uniqueAuthors = Array.from(authorsMap.values());
          const maxShow = 3;
          const displayAuthors = uniqueAuthors.slice(0, maxShow);
          const overflow = uniqueAuthors.length - maxShow;

          let html = displayAuthors
            .map((author, i) => {
              const avatar = author.avatar;
              const handle = author.handle || 'U';
              const marginLeft = i === 0 ? '0' : '-8px';

              if (avatar) {
                return `<img src="${avatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid #09090b; margin-left: ${marginLeft};">`;
              } else {
                return `<div style="width: 24px; height: 24px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; font-family: -apple-system, sans-serif; border: 2px solid #09090b; margin-left: ${marginLeft};">${handle[0]?.toUpperCase() || 'U'}</div>`;
              }
            })
            .join('');

          if (overflow > 0) {
            html += `<div style="width: 24px; height: 24px; border-radius: 50%; background: #27272a; color: #a1a1aa; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; font-family: -apple-system, sans-serif; border: 2px solid #09090b; margin-left: -8px;">+${overflow}</div>`;
          }

          hoverIndicator.innerHTML = html;

          const firstRect = firstRange.getClientRects()[0];
          const totalWidth =
            Math.min(uniqueAuthors.length, maxShow + (overflow > 0 ? 1 : 0)) * 18 + 8;
          const leftPos = firstRect.left - totalWidth;
          const topPos = firstRect.top + firstRect.height / 2 - 12;

          hoverIndicator.style.left = `${leftPos}px`;
          hoverIndicator.style.top = `${topPos}px`;
          hoverIndicator.classList.add('visible');
        }
      } else {
        document.body.style.cursor = '';
        if (hoverIndicator) {
          hoverIndicator.classList.remove('visible');
        }
      }
    }

    function handleDocumentClick(e: MouseEvent) {
      if (!overlayEnabled || !overlayHost) return;

      const x = e.clientX;
      const y = e.clientY;

      if (popoverEl) {
        const rect = popoverEl.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return;
        }
      }

      if (composeModal) {
        const rect = composeModal.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return;
        }
        composeModal.remove();
        composeModal = null;
      }

      const clickedItems: Annotation[] = [];
      for (const { range, item } of activeItems) {
        const rects = range.getClientRects();
        for (const rect of rects) {
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            let container: Node | null = range.commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) {
              container = container.parentNode;
            }

            if (
              container &&
              ((e.target as Node).contains(container) || container.contains(e.target as Node))
            ) {
              if (!clickedItems.includes(item)) {
                clickedItems.push(item);
              }
            }
            break;
          }
        }
      }

      if (clickedItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        if (popoverEl) {
          const currentIds = popoverEl.dataset.itemIds;
          const newIds = clickedItems
            .map((i) => i.uri || i.id)
            .sort()
            .join(',');
          if (currentIds === newIds) {
            popoverEl.remove();
            popoverEl = null;
            return;
          }
        }

        const firstItem = clickedItems[0];
        const match = activeItems.find((x) => x.item === firstItem);
        if (match) {
          const rects = match.range.getClientRects();
          if (rects.length > 0) {
            const rect = rects[0];
            const top = rect.top + window.scrollY;
            const left = rect.left + window.scrollX;
            showPopover(clickedItems, top, left);
          }
        }
      } else {
        if (popoverEl) {
          popoverEl.remove();
          popoverEl = null;
        }
      }
    }

    function showPopover(items: Annotation[], top: number, left: number) {
      if (!shadowRoot) return;
      if (popoverEl) popoverEl.remove();

      const container = shadowRoot.getElementById('margin-overlay-container');
      if (!container) return;

      popoverEl = document.createElement('div');
      popoverEl.className = 'margin-popover';

      const ids = items
        .map((i) => i.uri || i.id)
        .sort()
        .join(',');
      popoverEl.dataset.itemIds = ids;

      const popWidth = 320;
      const screenWidth = window.innerWidth;
      let finalLeft = left;
      if (left + popWidth > screenWidth) finalLeft = screenWidth - popWidth - 20;
      if (finalLeft < 10) finalLeft = 10;

      popoverEl.style.top = `${top + 24}px`;
      popoverEl.style.left = `${finalLeft}px`;

      const count = items.length;
      const title = count === 1 ? 'Annotation' : `Annotations`;

      const contentHtml = items
        .map((item) => {
          const author = item.author || item.creator || {};
          const handle = author.handle || 'User';
          const avatar = author.avatar;
          const text = item.body?.value || item.text || '';
          const id = item.id || item.uri;
          const isHighlight = (item as any).type === 'Highlight';
          const createdAt = item.createdAt ? formatRelativeTime(item.createdAt) : '';

          let avatarHtml = `<div class="comment-avatar">${handle[0]?.toUpperCase() || 'U'}</div>`;
          if (avatar) {
            avatarHtml = `<img src="${avatar}" class="comment-avatar" style="object-fit: cover;">`;
          }

          let bodyHtml = '';
          if (isHighlight && !text) {
            bodyHtml = `<div class="highlight-badge">${Icons.highlightMarker} Highlighted</div>`;
          } else {
            bodyHtml = `<div class="comment-text">${escapeHtml(text)}</div>`;
          }

          return `
            <div class="comment-item">
              <div class="comment-header">
                ${avatarHtml}
                <div class="comment-meta">
                  <span class="comment-handle">@${handle}</span>
                  ${createdAt ? `<span class="comment-time">${createdAt}</span>` : ''}
                </div>
              </div>
              ${bodyHtml}
              <div class="comment-actions">
                ${!isHighlight ? `<button class="comment-action-btn btn-reply" data-id="${id}">${Icons.reply} Reply</button>` : ''}
                <button class="comment-action-btn btn-share" data-id="${id}" data-text="${escapeHtml(text)}">${Icons.share} Share</button>
              </div>
            </div>
          `;
        })
        .join('');

      popoverEl.innerHTML = `
        <div class="popover-header">
          <span class="popover-title">${title} <span class="popover-count">${count}</span></span>
          <button class="popover-close">${Icons.close}</button>
        </div>
        <div class="popover-scroll-area">
          ${contentHtml}
        </div>
      `;

      popoverEl.querySelector('.popover-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        popoverEl?.remove();
        popoverEl = null;
      });

      popoverEl.querySelectorAll('.btn-reply').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = (btn as HTMLElement).getAttribute('data-id');
          if (id) {
            window.open(`${APP_URL}/annotation/${encodeURIComponent(id)}`, '_blank');
          }
        });
      });

      popoverEl.querySelectorAll('.btn-share').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = (btn as HTMLElement).getAttribute('data-id');
          const text = (btn as HTMLElement).getAttribute('data-text');
          const url = `${APP_URL}/annotation/${encodeURIComponent(id || '')}`;
          const shareText = text ? `${text}\n${url}` : url;

          try {
            await navigator.clipboard.writeText(shareText);
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `${Icons.check} Copied!`;
            setTimeout(() => (btn.innerHTML = originalHtml), 2000);
          } catch (err) {
            console.error('Failed to copy', err);
          }
        });
      });

      container.appendChild(popoverEl);
    }

    function formatRelativeTime(dateStr: string): string {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString();
    }

    function escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    let lastUrl = window.location.href;
    function checkUrlChange() {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        onUrlChange();
      }
    }

    function onUrlChange() {
      if (typeof CSS !== 'undefined' && CSS.highlights) {
        CSS.highlights.clear();
      }
      activeItems = [];
      cachedMatcher = null;
      sendMessage('updateBadge', { count: 0 });
      if (overlayEnabled) {
        setTimeout(() => fetchAnnotations(), 300);
      }
    }

    window.addEventListener('popstate', onUrlChange);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      checkUrlChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      checkUrlChange();
    };

    setInterval(checkUrlChange, 500);

    let domChangeTimeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver((mutations) => {
      const hasSignificantChange = mutations.some(
        (m) => m.type === 'childList' && (m.addedNodes.length > 3 || m.removedNodes.length > 3)
      );
      if (hasSignificantChange && overlayEnabled && activeItems.length === 0) {
        if (domChangeTimeout) clearTimeout(domChangeTimeout);
        domChangeTimeout = setTimeout(() => {
          cachedMatcher = null;
          fetchAnnotations();
        }, 500);
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    ctx.onInvalidated(() => {
      observer.disconnect();
    });

    window.addEventListener('load', () => {
      setTimeout(() => fetchAnnotations(), 500);
    });
  },
});
