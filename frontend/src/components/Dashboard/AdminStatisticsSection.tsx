import React from "react";
import { IoBarChart } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { AnnotationStatsPanel } from "@/components/AnnotationStatsPanel";
import { AdminStatisticsCharts } from "@/components/AdminStatisticsCharts";
import { useAdminTextStatistics } from "@/hooks";

export const AdminStatisticsSection: React.FC = () => {
  const {
    data: textStatistics,
    isLoading: isLoadingTextStatistics,
  } = useAdminTextStatistics();

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
            <IoBarChart className="h-5 w-5" />
            Statistics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Who annotated how much, and which texts have the most annotations.
          </p>
        </div>

        <AnnotationStatsPanel />

        {isLoadingTextStatistics && (
          <div className="py-8 text-center">
            <AiOutlineLoading3Quarters className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading corpus statistics...
            </p>
          </div>
        )}
        {textStatistics && <AdminStatisticsCharts statistics={textStatistics} />}
      </div>
    </div>
  );
};
