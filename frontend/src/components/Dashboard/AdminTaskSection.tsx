import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { textApi } from "@/api/text";
import { TextStatus } from "@/api/types";
import type { TextFilters } from "@/api/types";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  IoDocumentText,
  IoEye,
  IoCheckmarkCircle,
  IoTimeOutline,
  IoStarOutline,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";

// Helper function to get status badge styling
const getStatusBadge = (status: TextStatus) => {
  switch (status) {
    case TextStatus.DRAFT:
      return {
        variant: "secondary" as const,
        className: "bg-gray-100 text-gray-700",
        icon: "📝",
        text: "Draft",
      };
    case TextStatus.INITIALIZED:
      return {
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-700",
        icon: "🚀",
        text: "Ready",
      };
    case TextStatus.ANNOTATION_IN_PROGRESS:
      return {
        variant: "secondary" as const,
        className: "bg-orange-100 text-orange-700",
        icon: "⏳",
        text: "In Progress",
      };
    case TextStatus.ANNOTATED:
      return {
        variant: "secondary" as const,
        className: "bg-yellow-100 text-yellow-700",
        icon: "✏️",
        text: "Annotated",
      };
    case TextStatus.REVIEWED:
      return {
        variant: "secondary" as const,
        className: "bg-green-100 text-green-700",
        icon: "✅",
        text: "Reviewed",
      };
    case TextStatus.PUBLISHED:
      return {
        variant: "secondary" as const,
        className: "bg-purple-100 text-purple-700",
        icon: "🎉",
        text: "Published",
      };
    default:
      return {
        variant: "secondary" as const,
        className: "bg-gray-100 text-gray-700",
        icon: "❓",
        text: "Unknown",
      };
  }
};

// Helper function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper function to truncate text
const truncateText = (text: string, maxLength: number = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const ITEMS_PER_PAGE = 10;

export const AdminTaskSection: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TextStatus | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate skip for pagination
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch paginated texts with backend filtering
  const {
    data: textsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "admin-paginated-texts",
      statusFilter,
      languageFilter,
      currentPage,
    ],
    queryFn: () => {
      const filters: TextFilters = {
        skip,
        limit: ITEMS_PER_PAGE,
      };
      if (statusFilter !== "all") filters.status = statusFilter;
      if (languageFilter !== "all") filters.language = languageFilter;
      return textApi.getTexts(filters);
    },
    refetchOnWindowFocus: false,
  });

  const texts = textsData || [];

  // Fetch total count for pagination (separate query without pagination)
  const { data: allTextsForCountData } = useQuery({
    queryKey: ["admin-texts-count", statusFilter, languageFilter],
    queryFn: () => {
      const filters: TextFilters = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (languageFilter !== "all") filters.language = languageFilter;
      return textApi.getTexts(filters);
    },
    refetchOnWindowFocus: false,
  });

  const allTextsForCount = allTextsForCountData || [];

  // Fetch all texts for filter options (we need to get unique languages and status counts)
  const { data: allTextsData } = useQuery({
    queryKey: ["admin-all-texts-for-filters"],
    queryFn: () => textApi.getTexts({}),
    refetchOnWindowFocus: false,
  });

  const allTexts = allTextsData || [];

  // Calculate pagination info
  const totalItems = allTextsForCount.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Get unique languages for filter
  const uniqueLanguages = Array.from(
    new Set(allTexts.map((text) => text.language))
  ).sort();

  // Status filter options with counts
  const statusOptions = [
    { value: "all", label: "All Status", count: allTextsForCount.length },
    {
      value: TextStatus.INITIALIZED,
      label: "Ready for Annotation",
      count: allTexts.filter((t) => t.status === TextStatus.INITIALIZED).length,
    },
    {
      value: TextStatus.ANNOTATION_IN_PROGRESS,
      label: "In Progress",
      count: allTexts.filter(
        (t) => t.status === TextStatus.ANNOTATION_IN_PROGRESS
      ).length,
    },
    {
      value: TextStatus.ANNOTATED,
      label: "Annotated",
      count: allTexts.filter((t) => t.status === TextStatus.ANNOTATED).length,
    },
    {
      value: TextStatus.REVIEWED,
      label: "Reviewed",
      count: allTexts.filter((t) => t.status === TextStatus.REVIEWED).length,
    },
    {
      value: TextStatus.PUBLISHED,
      label: "Published",
      count: allTexts.filter((t) => t.status === TextStatus.PUBLISHED).length,
    },
  ];

  // Calculate task progress statistics from all texts
  const taskStats = {
    total: allTexts.length,
    ready: allTexts.filter((t) => t.status === TextStatus.INITIALIZED).length,
    inProgress: allTexts.filter(
      (t) => t.status === TextStatus.ANNOTATION_IN_PROGRESS
    ).length,
    completed: allTexts.filter((t) =>
      [
        TextStatus.ANNOTATED,
        TextStatus.REVIEWED,
        TextStatus.PUBLISHED,
      ].includes(t.status)
    ).length,
  };

  const handleViewTask = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  const handleFilterChange = (
    newStatusFilter: TextStatus | "all",
    newLanguageFilter: string
  ) => {
    setStatusFilter(newStatusFilter);
    setLanguageFilter(newLanguageFilter);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (isLoading && texts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-blue-600">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IoDocumentText className="w-5 h-5" />
            Task Management
          </CardTitle>
          <CardDescription>
            View and manage all annotation tasks in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-2">
                <IoStarOutline className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Total Tasks
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-800">
                {taskStats.total}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-2">
                <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Ready
                </span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {taskStats.ready}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
              <div className="flex items-center gap-2">
                <IoTimeOutline className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">
                  In Progress
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-800">
                {taskStats.inProgress}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-2">
                <IoCheckmarkCircle className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">
                  Completed
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-800">
                {taskStats.completed}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  handleFilterChange(
                    e.target.value as TextStatus | "all",
                    languageFilter
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Language Filter
              </label>
              <select
                value={languageFilter}
                onChange={(e) =>
                  handleFilterChange(statusFilter, e.target.value)
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Languages ({allTexts.length})</option>
                {uniqueLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)} (
                    {allTexts.filter((t) => t.language === lang).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks ({totalItems} total)</CardTitle>
              <CardDescription>
                Showing {skip + 1}-{Math.min(skip + ITEMS_PER_PAGE, totalItems)}{" "}
                of {totalItems} tasks
              </CardDescription>
            </div>
            {isLoading && (
              <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-blue-600" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {texts.length === 0 ? (
            <div className="text-center py-8">
              <IoDocumentText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No tasks found with current filters
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {texts.map((text) => {
                  const statusBadge = getStatusBadge(text.status);
                  const annotatorName = text.annotator
                    ? text.annotator.full_name || text.annotator.username
                    : null;
                  const reviewerName = text.reviewer
                    ? text.reviewer.full_name || text.reviewer.username
                    : null;

                  return (
                    <div
                      key={text.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {text.title}
                            </h3>
                            <Badge
                              variant={statusBadge.variant}
                              className={statusBadge.className}
                            >
                              {statusBadge.icon} {statusBadge.text}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {text.language}
                            </Badge>
                            {annotatorName && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                              >
                                👤 {annotatorName}
                              </Badge>
                            )}
                            {reviewerName && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                              >
                                👁️ {reviewerName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {truncateText(text.content)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>ID: {text.id}</span>
                            <span>Created: {formatDate(text.created_at)}</span>
                            {text.updated_at && (
                              <span>
                                Updated: {formatDate(text.updated_at)}
                              </span>
                            )}
                            {text.annotations_count !== undefined && (
                              <span>Annotations: {text.annotations_count}</span>
                            )}
                            {annotatorName && (
                              <span>Annotator: {annotatorName}</span>
                            )}
                            {reviewerName && (
                              <span>Reviewer: {reviewerName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTask(text.id)}
                            className="flex items-center gap-1"
                          >
                            <IoEye className="w-4 h-4" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPreviousPage}
                      className="flex items-center gap-1"
                    >
                      <IoChevronBack className="w-4 h-4" />
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage}
                      className="flex items-center gap-1"
                    >
                      Next
                      <IoChevronForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
