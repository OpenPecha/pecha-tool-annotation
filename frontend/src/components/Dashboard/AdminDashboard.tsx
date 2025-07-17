import React, { useState, Suspense, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Loading } from "@/components/ui/loading";

// Lazy load admin components
const AdminWorkSection = React.lazy(() =>
  import("./AdminWorkSection").then((module) => ({
    default: module.AdminWorkSection,
  }))
);
const AdminTaskSection = React.lazy(() =>
  import("./AdminTaskSection").then((module) => ({
    default: module.AdminTaskSection,
  }))
);
const AdminStatisticsSection = React.lazy(() =>
  import("./AdminStatisticsSection").then((module) => ({
    default: module.AdminStatisticsSection,
  }))
);
const AdminUsersSection = React.lazy(() =>
  import("./AdminUsersSection").then((module) => ({
    default: module.AdminUsersSection,
  }))
);
const AdminBulkUploadSection = React.lazy(() =>
  import("./AdminBulkUploadSection").then((module) => ({
    default: module.AdminBulkUploadSection,
  }))
);
const AdminExportSection = React.lazy(() =>
  import("./AdminExportSection").then((module) => ({
    default: module.AdminExportSection,
  }))
);

export const AdminDashboard: React.FC = () => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    "statistics" | "users" | "work" | "bulk-upload" | "tasks" | "export"
  >("work");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Preload commonly used components on mount for faster tab switching
  useEffect(() => {
    // Delay preloading to not interfere with initial render
    const timeoutId = setTimeout(() => {
      import("./AdminTaskSection");
      import("./AdminStatisticsSection");
      import("./AdminUsersSection");
      import("./AdminBulkUploadSection");
      import("./AdminExportSection");
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const renderActiveTab = () => {
    return (
      <Suspense fallback={<Loading />}>
        {(() => {
          switch (activeAdminTab) {
            case "statistics":
              return <AdminStatisticsSection />;
            case "users":
              return <AdminUsersSection />;
            case "work":
              return <AdminWorkSection />;
            case "tasks":
              return <AdminTaskSection />;
            case "bulk-upload":
              return <AdminBulkUploadSection />;
            case "export":
              return <AdminExportSection />;
            default:
              return <AdminWorkSection />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-16">
      {/* Admin Sidebar */}
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
      />

      {/* Main Content */}
      <div
        className={`${
          sidebarOpen ? "ml-64" : "ml-16"
        } transition-all duration-300 h-[calc(100vh-64px)] overflow-y-auto`}
      >
        <div className="p-8">{renderActiveTab()}</div>
      </div>
    </div>
  );
};
