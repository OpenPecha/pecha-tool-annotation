import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FullScreenLoading, AppLoading } from "@/components/ui/loading";
import { useAnnotationColors } from "./hooks/use-annotation-colors";
import { useRequireLogin } from "./hooks/useRequireLogin";

import { UserbackProvider } from "./providers/UserbackProvider";
import { Welcome } from "./components/Welcome";
import { AdminDashboard } from "./components/Dashboard";
import { AdminRoute } from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import { usersApi } from "./api/users";
import { useAuth0 } from "@auth0/auth0-react";
import type { RegisterUserData } from "./api/types";
// Lazy load page components
const Task = lazy(() => import("./pages/Task"));
const Review = lazy(() => import("./pages/Review"));

const queryClient = new QueryClient();


function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const requireLogin = useRequireLogin();
  const [isUserSynced, setIsUserSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { isLoaded: colorsLoaded } = useAnnotationColors();

  // Without a session every API call answers "Not authenticated", so send the
  // user back through login rather than leaving them on a spinner.
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      requireLogin();
    }
  }, [isAuthLoading, isAuthenticated, requireLogin]);

  // Ensure user exists in DB before loading protected content
  useEffect(() => {
    if (!isAuthenticated || !user?.sub) {
      setIsUserSynced(false);
      return;
    }
    let cancelled = false;
    const syncUser = async () => {
      if (!user.sub) return;
      try {
        const userData: RegisterUserData = {
          auth0_user_id: user.sub,
          username: user.nickname ?? user.name ?? user.sub,
          email: user.email ?? "",
          full_name: user.name ?? undefined,
          picture: user.picture ?? undefined,
        };
        await usersApi.registerUser(userData);
        if (!cancelled) setIsUserSynced(true);
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err.message : "Failed to set up account");
        }
      }
    };
    syncUser();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.sub, user?.nickname, user?.name, user?.email, user?.picture]);

  

  if (!isAuthenticated) {
    return (
      <AppLoading
        message={isAuthLoading ? "Signing you in..." : "Redirecting to sign in..."}
      />
    );
  }

  if (!isUserSynced) {
    if (syncError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-destructive font-medium">
            {syncError}. Please refresh to retry.
          </p>
        </div>
      );
    }
    return <AppLoading message="Setting up your account..." />;
  }

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
  const { isLoading } = useAuth0();

  // Rendering routes before Auth0 restores the session would fire API calls
  // without a Bearer token, which the backend rejects with "Not authenticated".
  if (isLoading) {
    return <AppLoading message="Signing you in..." />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home /> } />
        <Route
        path="/dashboard"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
    <Route path="/login" element={<Login />} />
     <Route path="/logout" element={<Logout />} />
     <Route path="/callback" element={<Callback />} />
      <Route
        path="/admin"
        element={
          <Layout>
            <AdminRoute>
              <Navbar />
              <Suspense fallback={<FullScreenLoading />}>
                <AdminDashboard />
              </Suspense>
            </AdminRoute>
          </Layout>
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
          <Suspense fallback={<AppLoading message="Loading Review..." />}>
            <Review />
          </Suspense>
        }
      />
    </Routes>
  );
}

function App() {


  return (
      <QueryClientProvider client={queryClient}>
          <BrowserRouter>
        <UserbackProvider>
            <AppContent />
            <Toaster />
        </UserbackProvider>
          </BrowserRouter>
      </QueryClientProvider>
  );
}

export default App;
