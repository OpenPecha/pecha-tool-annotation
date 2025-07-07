import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/use-auth-hook";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { textApi } from "@/api/text";
import { Loader2 } from "lucide-react";
import BulkUploadModal from "@/components/BulkUploadModal";
import type { BulkUploadResponse } from "@/api/bulk-upload";
import { AdminStatisticsCharts } from "@/components/AdminStatisticsCharts";
import { UserManagement } from "@/components/UserManagement";

// Icons for the dashboard cards
const StartWorkIcon = () => (
  <svg
    className="w-12 h-12 text-blue-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

const ReviewWorkIcon = () => (
  <svg
    className="w-12 h-12 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RecentActivityIcon = () => (
  <svg
    className="w-6 h-6 text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const BulkUploadIcon = () => (
  <svg
    className="w-12 h-12 text-purple-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<"statistics" | "users">(
    "statistics"
  );
  const [isLoadingText, setIsLoadingText] = useState(false);

  // Mutation to start work - find work in progress or assign new text
  const startWorkMutation = useMutation({
    mutationFn: async () => {
      return textApi.startWork();
    },
    onSuccess: (text) => {
      toast.success(`✅ Work Started`, {
        description: `Starting work on: "${text.title}"`,
      });
      navigate(`/task/${text.id}`);
      setIsLoadingText(false);
    },
    onError: (error) => {
      // Extract error message from different error types
      let errorMessage = "Failed to start work";
      let errorTitle = "❌ Error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "detail" in error) {
        // Handle API errors with detail field
        const apiError = error as { detail: string; status_code?: number };
        errorMessage = apiError.detail || "Failed to start work";

        // Handle 404 specifically for "no texts available" scenario
        if (apiError.status_code === 404) {
          errorTitle = "📝 No Tasks Available";
          errorMessage =
            "No texts available for annotation at this time. Please contact your administrator to add more texts to the system.";
        }
      }

      // Show toast with proper error handling
      if (errorTitle.includes("No Tasks Available")) {
        toast.info(errorTitle, {
          description: errorMessage,
        });
      } else {
        toast.error(errorTitle, {
          description: errorMessage,
        });
      }

      setIsLoadingText(false);
    },
  });

  const handleStartWork = () => {
    setIsLoadingText(true);
    startWorkMutation.mutate();
  };

  const handleReviewWork = () => {
    // TODO: Implement similar functionality for review texts
    toast.info("🚧 Coming Soon", {
      description: "Review functionality will be implemented soon!",
    });
  };

  // Fetch recent activity data from API
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => textApi.getRecentActivity(10),
    refetchOnWindowFocus: false,
  });

  // Fetch user statistics
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => textApi.getUserStats(),
    refetchOnWindowFocus: false,
  });

  // Fetch admin text statistics (only for admins)
  const { data: adminStats, isLoading: isLoadingAdminStats } = useQuery({
    queryKey: ["admin-text-statistics"],
    queryFn: () => textApi.getAdminTextStatistics(),
    refetchOnWindowFocus: false,
    enabled: currentUser?.role === "admin", // Only fetch for admins
  });

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to determine activity type
  const getActivityType = (text: { reviewer_id?: number }) => {
    // If user is reviewer, it's a review activity
    if (text.reviewer_id === currentUser?.id) {
      return "review";
    }
    // Otherwise, it's an annotation activity
    return "annotation";
  };

  // Handle clicking on recent activity item
  const handleActivityClick = (textId: number) => {
    navigate(`/task/${textId}`);
  };

  const handleBulkUpload = () => {
    setShowBulkUploadModal(true);
  };

  const handleBulkUploadComplete = (result: BulkUploadResponse) => {
    // Refresh the page data or update relevant queries
    if (result.success) {
      toast.success("Bulk upload completed successfully!", {
        description: `${result.summary.total_texts_created} texts and ${result.summary.total_annotations_created} annotations created`,
      });
    }
    setShowBulkUploadModal(false);
  };

  // Fetch user's work in progress
  const { data: workInProgress = [] } = useQuery({
    queryKey: ["my-work-in-progress"],
    queryFn: () => textApi.getMyWorkInProgress(),
    refetchOnWindowFocus: false,
  });

  // Mutation to cancel work (delete user annotations and skip text)
  const cancelWorkMutation = useMutation({
    mutationFn: async () => {
      // Get current work in progress to get the text ID
      const workInProgress = await textApi.getMyWorkInProgress();
      if (workInProgress.length === 0) {
        throw new Error("No work in progress found");
      }

      const currentTextId = workInProgress[0].id;

      // Cancel work: delete user annotations and skip text
      return textApi.cancelWorkWithRevertAndSkip(currentTextId);
    },
    onSuccess: () => {
      toast.success("✅ Work Cancelled & Skipped", {
        description:
          "Your annotations were deleted and text was skipped. It won't be shown to you again.",
      });
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["my-work-in-progress"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["admin-text-statistics"] });
    },
    onError: (error) => {
      toast.error("❌ Failed to Cancel Work", {
        description:
          error instanceof Error ? error.message : "Failed to cancel work",
      });
    },
  });

  const handleCancelWork = () => {
    cancelWorkMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {currentUser?.name || "User"}!
          </h1>
          <p className="text-gray-600">
            Here's your annotation progress and available tasks.
          </p>
        </div>

        {/* Admin Panel - Only show for admins */}
        {currentUser?.role === "admin" && (
          <Card className="mb-8 bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-800">
                ⚙️ Admin Panel
              </CardTitle>
              <CardDescription className="text-slate-600">
                System administration and management tools
              </CardDescription>
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mt-4">
                <button
                  onClick={() => setActiveAdminTab("statistics")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeAdminTab === "statistics"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  📊 Statistics
                </button>
                <button
                  onClick={() => setActiveAdminTab("users")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeAdminTab === "users"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  👥 Users
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistics Tab */}
              {activeAdminTab === "statistics" && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      📊 Text Statistics & Analytics
                    </h3>
                    <p className="text-sm text-blue-600">
                      System-wide text status and user activity overview
                    </p>
                  </div>
                  {isLoadingAdminStats ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2 text-blue-600">
                        Loading statistics...
                      </span>
                    </div>
                  ) : adminStats ? (
                    <AdminStatisticsCharts statistics={adminStats} />
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Failed to load statistics
                    </p>
                  )}
                </div>
              )}

              {/* User Management Tab */}
              {activeAdminTab === "users" && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">
                      👥 User Management
                    </h3>
                    <p className="text-sm text-purple-600">
                      Manage system users, roles, and permissions
                    </p>
                  </div>
                  <UserManagement />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Statistics Cards */}
        <div
          className="grid gap-6 mb-8"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {/* Combined Start Working / Current Work Card - Show for annotators, users without role, or admins */}
          {(!currentUser?.role ||
            currentUser.role === "annotator" ||
            currentUser.role === "admin") && (
            <Card
              className={`hover:shadow-lg transition-all duration-300 border-2 ${
                workInProgress.length > 0
                  ? "border-orange-200 bg-orange-50"
                  : "hover:border-blue-200"
              } ${isLoadingText ? "opacity-75" : ""}`}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <StartWorkIcon />
                </div>
                <CardTitle className="text-2xl">
                  {workInProgress.length > 0 ? "Current Work" : "Start Working"}
                </CardTitle>
                <CardDescription className="text-base">
                  {workInProgress.length > 0
                    ? "Continue working on your text in progress"
                    : "Begin annotating new texts or continue working on existing annotations"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {workInProgress.length > 0 ? (
                  // Show current work details
                  <div className="space-y-4">
                    {workInProgress.map((text) => (
                      <div key={text.id} className="text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {text.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              Status: {text.status} • Started:{" "}
                              {formatDate(text.updated_at || text.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="lg"
                            className="flex-1"
                            onClick={() => navigate(`/task/${text.id}`)}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show start working interface
                  <>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleStartWork}
                      disabled={isLoadingText}
                    >
                      {isLoadingText ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Finding Text...
                        </>
                      ) : (
                        "Start Annotating"
                      )}
                    </Button>
                    <p className="text-sm text-gray-500 mt-3">
                      {isLoadingText
                        ? "Looking for available texts to annotate..."
                        : "Create new annotations, mark headers, identify persons and objects"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Work Card - Show for reviewers or admins */}
          {(currentUser?.role === "reviewer" ||
            currentUser?.role === "admin") && (
            <Card
              className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-green-200"
              onClick={handleReviewWork}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <ReviewWorkIcon />
                </div>
                <CardTitle className="text-2xl">Review Work</CardTitle>
                <CardDescription className="text-base">
                  Review and validate existing annotations from yourself or
                  other contributors
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() => {}}
                >
                  Start Reviewing
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Quality check annotations, approve or suggest improvements
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bulk Upload Card - Show for admins only */}
          {currentUser?.role === "admin" && (
            <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-200">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <BulkUploadIcon />
                </div>
                <CardTitle className="text-2xl">Bulk Upload</CardTitle>
                <CardDescription className="text-base">
                  Upload multiple JSON files containing texts and annotations
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-purple-200 hover:bg-purple-50"
                  onClick={handleBulkUpload}
                >
                  Upload Files
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Batch import texts and annotations from JSON files
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RecentActivityIcon />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>
              Your recent work and contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading recent activity...</p>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((text) => {
                  const activityType = getActivityType(text);
                  return (
                    <div
                      key={text.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activityType === "annotation"
                              ? "bg-blue-500"
                              : "bg-green-500"
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {text.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(text.updated_at || text.created_at)} •{" "}
                            {text.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivityClick(text.id);
                          }}
                        >
                          {activityType === "annotation" ? "Edit" : "Review"}
                        </Button>
                        {text.status === "progress" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelWork();
                            }}
                            disabled={cancelWorkMutation.isPending}
                            title="Delete your annotations and skip this text permanently"
                          >
                            {cancelWorkMutation.isPending
                              ? "Cancelling..."
                              : "Cancel & Skip"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start working to see your activity here!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {userStats?.texts_annotated || 0}
                  </div>
                  <div className="text-sm text-gray-600">Texts Annotated</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {userStats?.reviews_completed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Reviews Completed</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {userStats?.total_annotations || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Annotations</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {userStats?.accuracy_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onUploadComplete={handleBulkUploadComplete}
      />
    </div>
  );
};

export default Dashboard;
