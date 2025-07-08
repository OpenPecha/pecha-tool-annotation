// Component preloader utility for better performance
export const preloadDashboardComponents = () => {
  // Preload AdminWorkSection since it's the default tab
  import("@/components/Dashboard/AdminWorkSection");

  // Preload AdminStatisticsSection since it's commonly accessed
  import("@/components/Dashboard/AdminStatisticsSection");
};

export const preloadUserDashboard = () => {
  // Preload RegularUserDashboard for non-admin users
  import("@/components/Dashboard/RegularUserDashboard");
};

export const preloadAdminDashboard = () => {
  // Preload AdminDashboard for admin users
  import("@/components/Dashboard/AdminDashboard");

  // Also preload the most commonly used admin components
  preloadDashboardComponents();
};

// Preload components based on user role
export const preloadByUserRole = (userRole: string | undefined) => {
  if (userRole === "admin") {
    preloadAdminDashboard();
  } else {
    preloadUserDashboard();
  }
};

// Preload all dashboard components (use sparingly)
export const preloadAllDashboardComponents = () => {
  import("@/components/Dashboard/AdminDashboard");
  import("@/components/Dashboard/RegularUserDashboard");
  import("@/components/Dashboard/AdminWorkSection");
  import("@/components/Dashboard/AdminStatisticsSection");
  import("@/components/Dashboard/AdminUsersSection");
  import("@/components/Dashboard/AdminBulkUploadSection");
};
