import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./diplomatic_style.css";
import App from "./App.tsx";
import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { AccessTokenFetchBridge } from "./components/AccessTokenFetchBridge";

const CHUNK_RELOAD_KEY = "vite-chunk-reload";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});

window.addEventListener("load", () => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

/** Drop the `code`/`state` params and return the user to the page that required login. */
const onRedirectCallback = (appState?: AppState) => {
  const returnTo = appState?.returnTo;
  if (returnTo && returnTo !== window.location.pathname) {
    window.location.replace(returnTo);
    return;
  }
  window.history.replaceState({}, document.title, window.location.pathname);
};

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

root.render(
  <StrictMode>
     <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      cacheLocation='localstorage'
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
      onRedirectCallback={onRedirectCallback}
    >
      <AccessTokenFetchBridge />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Auth0Provider>
  </StrictMode>
);
