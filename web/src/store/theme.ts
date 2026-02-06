
import { atom, onMount } from 'nanostores';

export type Theme = 'light' | 'dark' | 'system';
export type Layout = 'sidebar' | 'compact';

export const $theme = atom<Theme>('system');
export const $layout = atom<Layout>('sidebar');

onMount($theme, () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
            $theme.set(stored);
        }
        applyTheme($theme.get());
    }

    return $theme.subscribe((theme) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', theme);
            applyTheme(theme);
        }
    });
});

onMount($layout, () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('layout_preference') as Layout | null;
        if (stored && ['sidebar', 'compact'].includes(stored)) {
            $layout.set(stored);
        }
    }

    return $layout.subscribe((layout) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('layout_preference', layout);
        }
    });
});

function applyTheme(theme: Theme) {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    delete root.dataset.theme;

    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        root.dataset.theme = systemTheme;
    } else {
        root.dataset.theme = theme;
    }
}

if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        if ($theme.get() === 'system') {
            applyTheme('system');
        }
    });
}

export function setTheme(theme: Theme) {
    $theme.set(theme);
}

export function setLayout(layout: Layout) {
    $layout.set(layout);
}

export function cycleTheme() {
    const current = $theme.get();
    const next: Theme = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    $theme.set(next);
}
