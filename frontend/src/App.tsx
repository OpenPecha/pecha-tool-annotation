import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import Header from "./components/Header";
import Task from "./pages/Task";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "./auth/auth-context-provider";
import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";

import OpenPecha from "./assets/icon.png";
import { useAuth } from "./auth/use-auth-hook";
import Callback from "./pages/Callback";
import Login from "./pages/Login";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();
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
  if (!isAuthenticated)
    return <button onClick={() => login(true)}>Login</button>;

  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function AppContent() {
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

      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="/task/:textId" element={<Task />} />
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

function LoadingFallback() {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center space-x-3">
          <img src={OpenPecha} alt="OpenPecha" />
          <h1 className="text-2xl font-semibold text-gray-500">OpenPecha</h1>
        </div>

        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

export default App;
