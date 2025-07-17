import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/auth-context-provider";
import { Suspense, useEffect, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FullScreenLoading, AppLoading } from "@/components/ui/loading";
import { useAuth } from "./auth/use-auth-hook";
import { useAnnotationColors } from "./hooks/use-annotation-colors";
import {
  preloadByAuthState,
  preloadByCurrentRoute,
} from "./utils/appPreloader";
import { injectUmami } from "./analytics";
// Lazy load page components
const Task = lazy(() => import("./pages/Task"));
const Review = lazy(() => import("./pages/Review"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Callback = lazy(() => import("./pages/Callback"));

const queryClient = new QueryClient();

if (import.meta.env.VITE_ENVIRONMENT === "production") {
  injectUmami();
}

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();

  // Initialize annotation colors early when authenticated
  const { isLoaded: colorsLoaded } = useAnnotationColors();

  useEffect(() => {
    if (isAuthenticated) {
      getToken().then((token) => {
        localStorage.setItem("access_token", token!);
      });
      return;
    }
    if (!isAuthenticated && !isLoading) {
      login(true);
    }
  }, [isAuthenticated, isLoading]);

  // Intelligent preloading based on authentication state
  useEffect(() => {
    // Delay preloading to not interfere with initial render
    const timeoutId = setTimeout(() => {
      preloadByAuthState(isAuthenticated);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]);

  if (!isAuthenticated)
    return <button onClick={() => login(true)}>Login</button>;

  // Show loading if colors are not loaded yet to prevent flash of unstyled annotations
  if (!colorsLoaded) {
    return <AppLoading message="Loading settings..." />;
  }

  return (
    <Suspense fallback={<AppLoading message="Loading Dashboard..." />}>
      {children}
    </Suspense>
  );
}

function AppContent() {
  const location = useLocation();

  // Preload components based on current route
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      preloadByCurrentRoute(location.pathname);
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />

      <Route
        path="/login"
        element={
          <Suspense fallback={<FullScreenLoading message="Loading Login..." />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/callback"
        element={
          <Suspense
            fallback={<FullScreenLoading message="Authenticating..." />}
          >
            <Callback />
          </Suspense>
        }
      />
      <Route
        path="/task/:textId"
        element={
          <Suspense fallback={<AppLoading message="Loading Task..." />}>
            <Task />
          </Suspense>
        }
      />
      <Route
        path="/review/:textId"
        element={
          <Layout>
            <Suspense fallback={<AppLoading message="Loading Review..." />}>
              <Review />
            </Suspense>
          </Layout>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
