import React from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import App from '@/components/sidepanel/App';
import '@/assets/styles.css';

// Connect a port so the background script can track open/closed state
browser.runtime.connect({ name: 'sidepanel' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
