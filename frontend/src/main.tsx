import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Auth0ProviderWithNavigate } from "./auth/auth0-provider";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

root.render(
  <BrowserRouter>
    <Auth0ProviderWithNavigate>
      <App />
    </Auth0ProviderWithNavigate>
  </BrowserRouter>
);
