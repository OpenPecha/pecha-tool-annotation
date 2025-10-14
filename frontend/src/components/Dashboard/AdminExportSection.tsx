import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import {
  IoDownload,
  IoCalendar,
  IoStatsChart,
  IoWarning,
  IoCheckmarkCircle,
} from "react-icons/io5";
import { toast } from "sonner";
import type { ExportStats } from "@/api/export";
import { useDownloadExport } from "@/hooks";

export const AdminExportSection: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [filterType, setFilterType] = useState<"reviewed" | "annotated">(
    "annotated"
  );
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Mutation to download export
  const downloadExportMutation = useDownloadExport();

  // Get current date and 30 days ago as default range
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      from: thirtyDaysAgo.toISOString().split("T")[0],
      to: today.toISOString().split("T")[0],
    };
  };

  // Initialize with default dates
  React.useEffect(() => {
    const defaults = getDefaultDates();
    setFromDate(defaults.from);
    setToDate(defaults.to);
  }, []);

  const handlePreviewStats = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsLoadingStats(true);
    try {
      // Use the export API directly for stats preview (lightweight operation)
      const { exportApi } = await import("@/api/export");
      const stats = await exportApi.getExportStats(
        fromDate,
        toDate,
        filterType
      );
      setExportStats(stats);
      toast.success("Export preview loaded successfully");
    } catch (error) {
      toast.error("Failed to load export statistics");
      console.error(error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (!exportStats) {
      toast.error("Please preview the export first");
      return;
    }

    downloadExportMutation.mutate(
      { fromDate, toDate, filterType },
      {
        onSuccess: () => {
          toast.success(
            `Export completed! ${exportStats.total_texts} ${filterType} texts with ${exportStats.total_annotations} annotations downloaded.`
          );
        },
        onError: (error) => {
          toast.error("Failed to export data");
          console.error(error);
        },
      }
    );
  };

  const resetForm = () => {
    const defaults = getDefaultDates();
    setFromDate(defaults.from);
    setToDate(defaults.to);
    setFilterType("annotated");
    setExportStats(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Export Data</h1>
          <p className="text-gray-600 mt-2">
            Export annotated texts and their annotations as JSON files in a ZIP
            archive
          </p>
        </div>
        <Badge variant="outline" className="text-indigo-700 border-indigo-200">
          <IoDownload className="w-4 h-4 mr-1" />
          Data Export
        </Badge>
      </div>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IoCalendar className="w-5 h-5" />
            Select Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="from-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                From Date
              </label>
              <input
                type="date"
                id="from-date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="to-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                To Date
              </label>
              <input
                type="date"
                id="to-date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                  value="annotated"
                  checked={filterType === "annotated"}
                  onChange={(e) =>
                    setFilterType(e.target.value as "annotated" | "reviewed")
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  📝 Annotated Texts
                  <span className="block text-xs text-gray-500">
                    Texts that have at least one annotation
                  </span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                  value="reviewed"
                  checked={filterType === "reviewed"}
                  onChange={(e) =>
                    setFilterType(e.target.value as "annotated" | "reviewed")
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  ✅ Reviewed Texts
                  <span className="block text-xs text-gray-500">
                    Texts that have been reviewed by reviewers
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handlePreviewStats}
              disabled={isLoadingStats || !fromDate || !toDate}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isLoadingStats ? (
                <Loading className="w-4 h-4" />
              ) : (
                <IoStatsChart className="w-4 h-4" />
              )}
              Preview Export
            </Button>
            <Button
              onClick={resetForm}
              variant="ghost"
              disabled={isLoadingStats || downloadExportMutation.isPending}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Statistics */}
      {exportStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IoStatsChart className="w-5 h-5" />
              Export Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">📄</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Total{" "}
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}{" "}
                      Texts
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {exportStats.total_texts}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">📝</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Annotations</p>
                    <p className="text-2xl font-bold text-green-600">
                      {exportStats.total_annotations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">
                      📊
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Avg. Annotations/Text
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {exportStats.total_texts > 0
                        ? Math.round(
                            exportStats.total_annotations /
                              exportStats.total_texts
                          )
                        : 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Date Range:</strong>{" "}
                {new Date(exportStats.date_range.from).toLocaleDateString()} -{" "}
                {new Date(exportStats.date_range.to).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IoDownload className="w-5 h-5" />
            Download Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!exportStats ? (
            <div className="text-center py-8">
              <IoWarning className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                Please preview the export first to see what data will be
                included
              </p>
              <Button
                onClick={handlePreviewStats}
                disabled={isLoadingStats || !fromDate || !toDate}
                variant="outline"
              >
                Preview Export
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <IoCheckmarkCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Ready to Export</p>
                    <p className="text-sm text-blue-700 mt-1">
                      The ZIP file will contain {exportStats.total_texts} JSON
                      files, each with text content and annotations in the same
                      format as your sample uploads.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={downloadExportMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {downloadExportMutation.isPending ? (
                  <>
                    <Loading className="w-4 h-4 mr-2" />
                    Generating Export...
                  </>
                ) : (
                  <>
                    <IoDownload className="w-4 h-4 mr-2" />
                    Download ZIP Export
                  </>
                )}
              </Button>

              {downloadExportMutation.isPending && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    🔄 Please wait while we prepare your export. This may take a
                    few moments for large datasets.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Format Information */}
      <Card>
        <CardHeader>
          <CardTitle>Export Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              The exported ZIP file will contain JSON files for {filterType}{" "}
              texts with the following structure:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
              <pre>{`{
  "text": {
    "title": "Text Title",
    "content": "Text content...",
    "translation": "Translation if available"
  },
  "annotations": [
    {
      "annotation_type": "header",
      "start_position": 0,
      "end_position": 10,
      "label": "section_header",
      "name": "Custom name",
      "level": "critical"
    }
  ]
}`}</pre>
            </div>
            <p className="text-xs text-gray-500">
              Each annotated text will be saved as a separate JSON file named
              with the text ID and title.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
