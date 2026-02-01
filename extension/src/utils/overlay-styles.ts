export const overlayStyles = /* css */ `
:host { 
  all: initial; 
  --bg-primary: #0a0a0d;
  --bg-secondary: #121216;
  --bg-tertiary: #1a1a1f;
  --bg-card: #0f0f13;
  --bg-elevated: #18181d;
  --bg-hover: #1e1e24;
  
  --text-primary: #eaeaee;
  --text-secondary: #b7b6c5;
  --text-tertiary: #6e6d7a;
  --border: rgba(183, 182, 197, 0.12);
  
  --accent: #957a86;
  --accent-hover: #a98d98;
  --accent-subtle: rgba(149, 122, 134, 0.15);
  
  --highlight-yellow: #fbbf24;
  --highlight-green: #34d399;
  --highlight-blue: #60a5fa;
  --highlight-pink: #f472b6;
  --highlight-purple: #a78bfa;
}

:host(.light) {
  --bg-primary: #f8f8fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f0f0f4;
  --bg-card: #ffffff;
  --bg-elevated: #ffffff;
  --bg-hover: #eeeef2;
  
  --text-primary: #18171c;
  --text-secondary: #5c495a;
  --text-tertiary: #8a8494;
  --border: rgba(92, 73, 90, 0.12);
  
  --accent: #7a5f6d;
  --accent-hover: #664e5b;
  --accent-subtle: rgba(149, 122, 134, 0.12);
}

.margin-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.margin-selection-toolbar {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.05);
  z-index: 2147483647;
  pointer-events: auto;
  font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  opacity: 0;
  transform: translateY(8px) scale(0.95);
  animation: toolbar-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes toolbar-in {
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: var(--bg-hover);
}

.toolbar-btn:active {
  transform: scale(0.96);
}

.toolbar-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.toolbar-btn.highlight-btn {
  color: var(--highlight-yellow);
}

.toolbar-btn.highlight-btn:hover {
  background: rgba(251, 191, 36, 0.15);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 2px;
}

.color-picker {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  display: flex;
  gap: 6px;
  padding: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  animation: toolbar-in 0.15s ease forwards;
}

.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-dot:hover {
  transform: scale(1.15);
  border-color: var(--text-primary);
}

.margin-popover {
  position: absolute;
  width: 320px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  z-index: 2147483647;
  font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-primary);
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
  animation: popover-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  max-height: 450px;
  overflow: hidden;
}

@keyframes popover-in { 
  to { opacity: 1; transform: translateY(0) scale(1); } 
}

.popover-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-primary);
  border-radius: 14px 14px 0 0;
}

.popover-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.popover-count {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
}

.popover-close { 
  background: none; 
  border: none; 
  color: var(--text-tertiary); 
  cursor: pointer; 
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.popover-close:hover { 
  background: var(--bg-hover);
  color: var(--text-primary); 
}

.popover-close svg {
  width: 16px;
  height: 16px;
}

.popover-scroll-area {
  overflow-y: auto;
  max-height: 350px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-tertiary) transparent;
}

.popover-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.popover-scroll-area::-webkit-scrollbar-track {
  background: transparent;
  margin: 4px 0;
}

.popover-scroll-area::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.popover-scroll-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.comment-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.comment-item:hover {
  background: var(--bg-hover);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.comment-avatar {
  width: 28px; 
  height: 28px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 11px; 
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.comment-meta {
  flex: 1;
  min-width: 0;
}

.comment-handle { 
  font-size: 13px; 
  font-weight: 600; 
  color: var(--text-primary); 
}

.comment-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.comment-text { 
  font-size: 13px; 
  line-height: 1.55; 
  color: var(--text-primary);
}

.highlight-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.highlight-badge svg {
  width: 12px;
  height: 12px;
}

.comment-actions {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.comment-action-btn {
  background: none; 
  border: none;
  padding: 6px 10px;
  color: var(--text-tertiary); 
  font-size: 12px; 
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.comment-action-btn svg {
  width: 14px;
  height: 14px;
}

.comment-action-btn:hover { 
  background: var(--bg-tertiary); 
  color: var(--text-primary); 
}

.inline-compose-modal {
  position: fixed;
  width: 380px;
  max-width: calc(100vw - 32px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 0;
  box-sizing: border-box;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05);
  z-index: 2147483647;
  pointer-events: auto;
  font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-primary);
  animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  overflow: hidden;
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.inline-compose-modal * {
  box-sizing: border-box;
}

.compose-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-primary);
}

.compose-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.compose-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  transition: all 0.15s;
}

.compose-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.compose-body {
  padding: 16px;
}

.inline-compose-quote {
  padding: 12px 14px;
  background: var(--accent-subtle);
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  margin-bottom: 14px;
  max-height: 80px;
  overflow: hidden;
  word-break: break-word;
  line-height: 1.5;
}

.inline-compose-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.inline-compose-textarea::placeholder {
  color: var(--text-tertiary);
}

.inline-compose-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.compose-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: var(--bg-primary);
}

.btn-cancel {
  padding: 9px 18px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border);
}

.btn-submit {
  padding: 9px 20px;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-submit:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-submit:active {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.margin-hover-indicator {
  position: fixed;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 2147483647;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: scale(0.8) translateX(4px);
}

.margin-hover-indicator.visible {
  opacity: 1;
  transform: scale(1) translateX(0);
}

.margin-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  padding: 12px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  z-index: 2147483647;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0;
  animation: toast-in 0.3s ease forwards;
}

@keyframes toast-in {
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.margin-toast.toast-out {
  animation: toast-out 0.2s ease forwards;
}

@keyframes toast-out {
  to { opacity: 0; transform: translateX(-50%) translateY(10px); }
}

.toast-icon {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.toast-success .toast-icon {
  color: #34d399;
}
`;
