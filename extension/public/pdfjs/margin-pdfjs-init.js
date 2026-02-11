(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const pdfUrl = params.get('file');

  if (pdfUrl) {
    document.documentElement.dataset.marginPdfUrl = pdfUrl;

    try {
      const url = new URL(pdfUrl);
      const filename = decodeURIComponent(url.pathname.split('/').pop() || 'PDF');
      document.title = filename;
    } catch {
      // keep default title
    }
  }

  document.addEventListener('webviewerloaded', function () {
    document.documentElement.dataset.marginPdfReady = 'true';
  });
})();
