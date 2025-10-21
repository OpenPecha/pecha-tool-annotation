import "./App.css";
import { BrowserRouter, Routes, Route, useLocation, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { Suspense, useEffect, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FullScreenLoading, AppLoading } from "@/components/ui/loading";
import { useAuth } from "./auth/use-auth-hook";
import { useAnnotationColors } from "./hooks/use-annotation-colors";
import {
  preloadByAuthState,
  preloadByCurrentRoute,
} from "./utils/appPreloader";
import { UserbackProvider } from "./providers/UserbackProvider";
import { useTokenExpiration } from "./hooks/useTokenExpiration";
// Lazy load page components
const Task = lazy(() => import("./pages/Task"));
const Review = lazy(() => import("./pages/Review"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Logout = lazy(() => import("./pages/Logout"));
const Callback = lazy(() => import("./pages/Callback"));

const queryClient = new QueryClient();


function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();
  useTokenExpiration()
  // Initialize annotation colors early when authenticated
  const { isLoaded: colorsLoaded } = useAnnotationColors();

  useEffect(() => {
    if (isAuthenticated) {
      getToken()
      return;
    }
    // if (!isAuthenticated && !isLoading) {
    //   login(true);
    // }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center space-y-8 px-4">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              Sign in to continue to your workspace
            </p>
          </div>
          <Link
            to="/login"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </Link>
        </div>
      </div>
    );

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
        path="/logout"
        element={
          <Suspense fallback={<FullScreenLoading message="Logging out..." />}>
            <Logout />
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
        <UserbackProvider>
        <BrowserRouter>

          <AppContent />
          <Toaster />
        </BrowserRouter>
        </UserbackProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
