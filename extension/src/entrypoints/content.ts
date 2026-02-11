import { defineContentScript } from 'wxt/sandbox';
import { initContentScript } from '@/utils/overlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    if (window.location.href.includes('/pdfjs/web/viewer.html')) return;

    await initContentScript(ctx);
  },
});
