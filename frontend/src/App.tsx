import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { Suspense,  lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FullScreenLoading, AppLoading } from "@/components/ui/loading";
import { useAuth } from "./auth/use-auth-hook";
import { useAnnotationColors } from "./hooks/use-annotation-colors";

import { UserbackProvider } from "./providers/UserbackProvider";
import { Welcome } from "./components/Welcome";
import { AdminDashboard } from "./components/Dashboard";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
// Lazy load page components
const Task = lazy(() => import("./pages/Task"));
const Review = lazy(() => import("./pages/Review"));

const queryClient = new QueryClient();


function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  // Initialize annotation colors early when authenticated
  const { isLoaded: colorsLoaded } = useAnnotationColors();
  if (!isAuthenticated) {
    return <Welcome />;
  }

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
            <Navbar />
            <Suspense fallback={<FullScreenLoading />}>
              <AdminDashboard />
            </Suspense>
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
      <QueryClientProvider client={queryClient}>
    <AuthProvider>
        <UserbackProvider>
          <BrowserRouter>

            <AppContent />
            <Toaster />
          </BrowserRouter>
        </UserbackProvider>
    </AuthProvider>
      </QueryClientProvider>
  );
}

export default App;
