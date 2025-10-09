# Pecha Tool Annotation

A React 19 + TypeScript app powered by Vite 7 and Tailwind CSS 4 for annotating, reviewing, and managing texts. The frontend integrates with a FastAPI backend and uses Auth0 for authentication, TanStack Query for data fetching/caching, and Zustand for local UI state. It includes Umami analytics and Userback feedback.

## Quick Start

```bash
# 1) Install frontend deps
cd frontend
npm ci

# 2) Create .env.local with required variables (see below)
cp .env.local.example .env.local  # if you have an example

# 3) Run the app
npm run dev
# App: http://localhost:3000
```

## Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Build for production
- `npm run preview` or `npm start`: Preview the production build on port 10000
- `npm run lint`: Run ESLint

## Environment Variables (frontend)

Set these in `frontend/.env.local` or your environment:

- `VITE_SERVER_URL` (required): Base API URL. Default fallback: `http://localhost:8000/v1`
- `VITE_AUTH0_DOMAIN` (required): Auth0 domain
- `VITE_AUTH0_CLIENT_ID` (required): Auth0 client id
- `VITE_AUTH0_AUDIENCE` (required): API audience for Auth0
- `VITE_AUTH0_REDIRECT_URI` (optional): Defaults to `window.location.origin`
- `VITE_ENVIRONMENT` (optional): Set to `production` to enable Umami injection
- `VITE_UMAMI_WEBSITE_ID` (optional): Umami site id
- `VITE_UMAMI_SRC` (optional): Umami script URL
- `VITE_USERBACK_ID` (optional): Userback widget id

Notes:
- Tokens are stored in `localStorage` under `auth_token` (and `access_token` as fallback) and attached via `Authorization: Bearer <token>`.
- For Auth0 silent auth, the app attempts a `prompt=none` flow on first load.

## Architecture Overview

- React 19 with Suspense-based route lazy-loading
- Routing: `react-router-dom@7`
- Data Fetching: `@tanstack/react-query@5`
- UI State: `zustand@5` with `persist` for select UI slices
- Styling: Tailwind CSS 4 and small UI utils (e.g., `sonner` toaster)
- Editor: CodeMirror 6 via `@uiw/react-codemirror`
- Auth: Auth0 (`@auth0/auth0-react`) with custom `AuthProvider`
- Analytics: Umami (optional, injected in production)
- Feedback: Userback widget (optional)

### Data Layer

- Base URL is read from `VITE_SERVER_URL` in `src/api/utils.ts`.
- Requests include `Authorization` header from `localStorage`.
- JSON and `FormData` requests are supported; common error handling via `ApiError`.

### Auth Flow

- `Auth0ProviderWithNavigate` provides Auth0 configuration.
- `AuthProvider` wraps the app and exposes `useAuth()` with `isAuthenticated`, `login(auto)`, `logout()`, and `getToken()`.
- On auth, backend user info is fetched via `usersApi.getCurrentUser()`; Umami identity is set when available.

### State Management (Zustand)

- `useAnnotationStore` persists UI state such as navigation/sidebar openness, current navigation mode, selected list type, and selected annotation types (stored as arrays in persistence, rehydrated to `Set`).

## Routing and Pages

All routes are lazy-loaded for performance:

- `/`: Dashboard
- `/login`: Login page
- `/callback`: Auth0 callback handling
- `/task/:textId`: Annotation task page
- `/review/:textId`: Review page

The app preloads resources based on auth state and current route to improve perceived performance.

## Development Details

- Dev server: `vite` on port `3000` (see `vite.config.ts`)
- Aliases: `@` -> `frontend/src`
- Build: `vite build`
- Preview: `vite preview --port 10000 --host`

## Integrations

- Umami Analytics (`src/analytics.ts`)
  - Enabled when `VITE_ENVIRONMENT === 'production'` and both `VITE_UMAMI_WEBSITE_ID` and `VITE_UMAMI_SRC` are set
  - Identifies users via `umami.identify()` with fallback to event tracking

- Userback Feedback (`src/providers/UserbackProvider.tsx`)
  - Initializes widget when a user is available and `VITE_USERBACK_ID` is set
  - Sends anonymized user info for better triage

## Backend API

- The frontend expects a FastAPI backend exposing REST endpoints under `VITE_SERVER_URL`.
- Authentication: Bearer token from Auth0 (`auth_token` in `localStorage`).

## What’s New

- React upgraded to 19 with `react-router-dom@7` route definitions and lazy loading
- TanStack Query v5 with `QueryClientProvider` at app and root
- Added Auth0-based auth with a custom `AuthProvider` and silent login handling
- Introduced Umami analytics injection and user identification
- Added Userback feedback widget
- Implemented Zustand store for annotation UI state with persistence
- Tailwind CSS v4 integration via `@tailwindcss/vite`

## Troubleshooting

- Missing tokens: ensure Auth0 variables are set and that the application domain is whitelisted in Auth0.
- 401 from API: check that `VITE_SERVER_URL` is correct and the backend is running with matching audience.
- Umami not tracking: verify `VITE_ENVIRONMENT=production` and `VITE_UMAMI_*` variables.
- Userback not showing: verify `VITE_USERBACK_ID` and that a user is authenticated.
