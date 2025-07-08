import React from "react";
import { Button } from "@/components/ui/button";
import {
  IoPeople,
  IoBarChart,
  IoDocumentText,
  IoSettings,
  IoCloudUpload,
} from "react-icons/io5";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeAdminTab: "statistics" | "users" | "work" | "bulk-upload";
  setActiveAdminTab: (
    tab: "statistics" | "users" | "work" | "bulk-upload"
  ) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  activeAdminTab,
  setActiveAdminTab,
}) => {
  return (
    <div
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } transition-all duration-300 bg-white shadow-lg border-r border-gray-200 h-[calc(100vh-64px)] fixed left-0 top-16 z-10`}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2
            className={`font-bold text-xl text-gray-800 ${
              sidebarOpen ? "block" : "hidden"
            }`}
          >
            Admin Panel
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            <IoSettings className="w-4 h-4" />
          </Button>
        </div>

        <nav className="space-y-6 flex-1 gap-2">
          <button
            onClick={() => setActiveAdminTab("work")}
            className={`w-full flex items-center gap-3 px-1 rounded-lg text-left transition-colors ${
              activeAdminTab === "work"
                ? "bg-green-100 text-green-700 border-2 border-green-200"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <IoDocumentText className="w-5 h-5" />
            {sidebarOpen && <span>Work Management</span>}
          </button>

          <button
            onClick={() => setActiveAdminTab("statistics")}
            className={`w-full flex items-center gap-3 px-1  rounded-lg text-left transition-colors ${
              activeAdminTab === "statistics"
                ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <IoBarChart className="w-5 h-5" />
            {sidebarOpen && <span>Statistics</span>}
          </button>

          <button
            onClick={() => setActiveAdminTab("users")}
            className={`w-full flex items-center gap-3 px-1  rounded-lg text-left transition-colors ${
              activeAdminTab === "users"
                ? "bg-purple-100 text-purple-700 border-2 border-purple-200"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <IoPeople className="w-5 h-5" />
            {sidebarOpen && <span>Users</span>}
          </button>

          <button
            onClick={() => setActiveAdminTab("bulk-upload")}
            className={`w-full flex items-center gap-3 px-1  rounded-lg text-left transition-colors ${
              activeAdminTab === "bulk-upload"
                ? "bg-orange-100 text-orange-700 border-2 border-orange-200"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <IoCloudUpload className="w-5 h-5" />
            {sidebarOpen && <span>Bulk Upload</span>}
          </button>
        </nav>
      </div>
    </div>
  );
};
