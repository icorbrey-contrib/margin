# Frontend Architecture Findings (Astro Migration + Islands)

Date: 2026-02-11

## Current State

- The `web` app is an Astro project but the core product UI is a single React
  SPA mounted via `client:only="react"`.
- Astro is only used for the top-level pages and layout. There are only three
  `.astro` pages in `web/src/pages`: `index.astro` (mounts the React app),
  `privacy.astro`, and `terms.astro`.
- React Router drives all routes inside `web/src/App.tsx`.
- React is still used broadly across `web/src/views`, `web/src/components`,
  `web/src/layouts`, and `web/src/routes`.
- No Astro island usage (`client:load`, `client:idle`, etc.) is present besides
  the single `client:only="react"` mount.

## Architecture Observations

- The migration is effectively a wrapper. The app is a full React SPA running
  inside Astro, not a set of Astro islands.
- App state is currently split between `nanostores` for app-wide UI/session
  preferences (`web/src/store/*`) and direct fetch calls inside components
  (server state).
- The API layer is centralized in `web/src/api/client.ts`, but many components
  still fetch or mutate directly.

## Hotspot: `Card.tsx`

`web/src/components/common/Card.tsx` is doing multiple distinct jobs in a
single component:
- Server state and mutations: like/unlike, delete, convert highlight,
  block/mute.
- Data fetching: bookmark OpenGraph metadata.
- UI state: multiple modal toggles, local UI transitions, error states.
- Domain rules: content warnings and external link safety logic.
- Rendering: UI for annotation/bookmark/highlight, tags, timestamps, etc.

This is a maintainability risk and makes it hard to decompose into islands.

## Suggested Direction (Incremental)

- Prefer **islands** over a single SPA by separating view components from
  interactive behaviors.
- Add a dedicated **server-state layer** (e.g., TanStack Query) instead of a
  heavier global state system. This addresses caching, dedupe, and optimistic
  updates, and removes ad-hoc fetch logic from UI.
- Split large components into pure view components (render-only), small hooks
  for interactions and mutations, and modals isolated into their own
  components.
- For component refactors and UI documentation, prefer Astrobook so Astro and
  framework components can be previewed consistently alongside islands.
  Rationale: Storybook does not currently support `.astro` components, while
  Astrobook is designed for Astro projects and supports Astro plus client-side
  framework components.
- Favor a feature-first component structure (e.g., `components/feature/*` or
  `features/*/components`) to keep domain logic, UI, and tests close together,
  and reduce cross-cutting churn as the island refactor progresses.

## Incremental Path

1. Split `Card.tsx` into `CardView.tsx` (pure rendering), `useCardActions.ts`
   (like, delete, convert), `useCardMetadata.ts` (OG fetch), and
   `CardModals.tsx`.
2. Replace ad-hoc fetches with a server-state library (TanStack Query).
3. Render list pages in Astro and hydrate only interactive subparts (e.g.,
   Like, Share, Add to Collection).

## Files Referenced

- `web/src/pages/index.astro`
- `web/src/App.tsx`
- `web/src/components/common/Card.tsx`
- `web/src/api/client.ts`
- `web/src/store/auth.ts`
- `web/src/store/preferences.ts`
- `web/src/store/theme.ts`
