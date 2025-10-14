import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoBarChart } from "react-icons/io5";
import { AdminStatisticsCharts } from "../AdminStatisticsCharts";
import { useAdminTextStatistics, useUserStats } from "@/hooks";

export const AdminStatisticsSection: React.FC = () => {
  // Fetch admin text statistics (only for admins)
  const { data: adminStats, isLoading: isLoadingAdminStats } = useAdminTextStatistics();

  // Fetch user statistics
  const { data: userStats, isLoading: isLoadingStats } = useUserStats();

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IoBarChart className="w-5 h-5" />
            System Statistics
          </CardTitle>
          <CardDescription>
            Overview of system-wide text status and user activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAdminStats ? (
            <div className="flex items-center justify-center py-8">
              <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-blue-600">Loading statistics...</span>
            </div>
          ) : adminStats ? (
            <AdminStatisticsCharts statistics={adminStats} />
          ) : (
            <p className="text-gray-500 text-center py-4">
              Failed to load statistics
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
