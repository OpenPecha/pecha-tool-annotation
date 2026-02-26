import React, { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TextStatus } from "@/api/types";
import type { TextFilters } from "@/api/types";
import { toast } from "sonner";
import { useTexts, useDeleteText } from "@/hooks";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  IoDocumentText,
  IoEye,
  IoCheckmarkCircle,
  IoTimeOutline,
  IoStarOutline,
  IoChevronBack,
  IoChevronForward,
  IoTrash,
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



const ITEMS_PER_PAGE = 10;

export const AdminTaskSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate skip for pagination
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Build filters
  const paginatedFilters: TextFilters = {
    skip,
    limit: ITEMS_PER_PAGE,
  };

  // Fetch paginated texts with backend filtering
  const {
    data: texts = [],
    isLoading,
    error,
  } = useTexts(paginatedFilters);






  // Calculate pagination info
  const totalItems = texts?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  



  const handleViewTask = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  // Delete task mutation
  const deleteTaskMutation = useDeleteText();

  const handleDeleteTask = (textId: number) => {
    deleteTaskMutation.mutate(textId, {
      onSuccess: () => {
        toast.success("Task deleted successfully", {
          description: "The task has been permanently removed from the system.",
        });
      },
      onError: (error) => {
        toast.error("Failed to delete task", {
          description:
            error instanceof Error ? error.message : "Please try again later",
        });
      },
    });
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
                  const uploaderName = text.uploader
                    ? text.uploader.full_name || text.uploader.username
                    : "system";

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
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                         
                            <span>Uploaded by: {uploaderName}</span>
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

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                disabled={deleteTaskMutation.isPending}
                              >
                                {deleteTaskMutation.isPending ? (
                                  <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                                ) : (
                                  <IoTrash className="w-4 h-4" />
                                )}
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{text.title}
                                  "? This action cannot be undone and will
                                  permanently remove the task and all its
                                  annotations from the system.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTask(text.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Task
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
