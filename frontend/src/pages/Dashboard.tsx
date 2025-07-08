import React, { Suspense, useEffect } from "react";
import { useAuth } from "@/auth/use-auth-hook";
import Navbar from "@/components/Navbar";
import { FullScreenLoading } from "@/components/ui/loading";
import { preloadByUserRole } from "@/utils/componentPreloader";

// Lazy load dashboard components
const AdminDashboard = React.lazy(() =>
  import("@/components/Dashboard").then((module) => ({
    default: module.AdminDashboard,
  }))
);
const RegularUserDashboard = React.lazy(() =>
  import("@/components/Dashboard").then((module) => ({
    default: module.RegularUserDashboard,
  }))
);

const Dashboard = () => {
  const { currentUser } = useAuth();

  // Preload components based on user role for better performance
  useEffect(() => {
    if (currentUser?.role) {
      preloadByUserRole(currentUser.role);
    }
  }, [currentUser?.role]);

  return (
    <div>
      <Navbar />
      <Suspense fallback={<FullScreenLoading />}>
        {currentUser?.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <RegularUserDashboard />
        )}
      </Suspense>
    </div>
  );
};

export default Dashboard;
